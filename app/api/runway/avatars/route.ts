import { NextResponse } from "next/server";
import { toFile } from "@runwayml/sdk";
import { z } from "zod";
import { getRunwayClient, isRunwayConfigured } from "@/lib/runway/client";
import {
  DEFAULT_AVATAR_PERSONALITY,
  DEFAULT_RUNWAY_VOICE,
  RUNWAY_VOICE_PRESETS,
} from "@/lib/runway/voices";

export const runtime = "nodejs";

const MAX_BYTES = 16 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const voiceIds = RUNWAY_VOICE_PRESETS.map((v) => v.id) as [
  (typeof RUNWAY_VOICE_PRESETS)[number]["id"],
  ...(typeof RUNWAY_VOICE_PRESETS)[number]["id"][],
];

const MetaSchema = z.object({
  name: z.string().trim().min(1).max(80),
  personality: z.string().trim().min(1).max(4000).default(DEFAULT_AVATAR_PERSONALITY),
  voicePresetId: z.enum(voiceIds).default(DEFAULT_RUNWAY_VOICE),
  startScript: z.string().trim().max(500).optional(),
  knowledgeName: z.string().trim().max(120).optional(),
  knowledgeContent: z.string().trim().max(20000).optional(),
  imageProcessing: z.enum(["optimize", "none"]).default("optimize"),
});

function serializeAvatar(avatar: {
  id: string;
  name: string;
  status: string;
  personality: string;
  documentIds: string[];
  referenceImageUri: string | null;
  processedImageUri: string | null;
  startScript: string | null;
  createdAt: string;
  updatedAt: string;
  failure?: string;
  failureCode?: string;
}) {
  return {
    id: avatar.id,
    name: avatar.name,
    status: avatar.status,
    personality: avatar.personality,
    documentIds: avatar.documentIds,
    referenceImageUri: avatar.referenceImageUri,
    processedImageUri: avatar.processedImageUri,
    startScript: avatar.startScript,
    failure: avatar.failure ?? null,
    failureCode: avatar.failureCode ?? null,
    createdAt: avatar.createdAt,
    updatedAt: avatar.updatedAt,
  };
}

export async function POST(request: Request) {
  if (!isRunwayConfigured()) {
    return NextResponse.json(
      {
        error:
          "Runway is not configured. Set RUNWAYML_API_SECRET in the environment.",
      },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Upload a document image as form field `file`." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Supported image types: JPEG, PNG, WebP." },
        { status: 400 }
      );
    }

    if (file.size < 512) {
      return NextResponse.json(
        { error: "Image is too small (min 512 bytes)." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds 16MB upload limit." },
        { status: 400 }
      );
    }

    const metaRaw = {
      name: String(form.get("name") ?? ""),
      personality: String(form.get("personality") ?? DEFAULT_AVATAR_PERSONALITY),
      voicePresetId: String(form.get("voicePresetId") ?? DEFAULT_RUNWAY_VOICE),
      startScript: String(form.get("startScript") ?? "") || undefined,
      knowledgeName: String(form.get("knowledgeName") ?? "") || undefined,
      knowledgeContent: String(form.get("knowledgeContent") ?? "") || undefined,
      imageProcessing: String(form.get("imageProcessing") ?? "optimize"),
    };

    const meta = MetaSchema.parse(metaRaw);
    const client = getRunwayClient();

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadable = await toFile(buffer, file.name || "document.jpg", {
      type: file.type,
    });
    const upload = await client.uploads.createEphemeral({ file: uploadable });

    const documentIds: string[] = [];
    if (meta.knowledgeContent) {
      const doc = await client.documents.create({
        name: meta.knowledgeName || `${meta.name} knowledge`,
        content: meta.knowledgeContent,
      });
      documentIds.push(doc.id);
    }

    const avatar = await client.avatars.create({
      name: meta.name,
      personality: meta.personality,
      referenceImage: upload.uri,
      voice: {
        type: "runway-live-preset",
        presetId: meta.voicePresetId,
      },
      imageProcessing: meta.imageProcessing,
      ...(meta.startScript ? { startScript: meta.startScript } : {}),
      ...(documentIds.length ? { documentIds } : {}),
    });

    return NextResponse.json(
      {
        avatar: serializeAvatar(avatar),
        uploadUri: upload.uri,
        knowledgeDocumentIds: documentIds,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid avatar parameters", details: error.flatten() },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Avatar creation failed";
    const status =
      /api.?key|secret|auth|401/i.test(message)
        ? 401
        : /not set|not configured/i.test(message)
          ? 503
          : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
