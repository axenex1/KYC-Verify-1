import { NextResponse } from "next/server";
import { z } from "zod";
import {
  isRunwayConfigured,
  startHeadMotionTask,
  type HeadMotionMode,
} from "@/lib/harness/avatar-runway";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const BodySchema = z.object({
  yawDeg: z.coerce.number().min(-45).max(45).default(0),
  pitchDeg: z.coerce.number().min(-35).max(35).default(0),
  expression: z.coerce.number().min(1).max(5).default(3),
  durationSec: z.coerce.number().int().min(2).max(8).default(8),
  mode: z.enum(["persistent", "pose"]).default("persistent"),
});

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
        { error: "Upload the cropped face image as form field `file`." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Supported image types: JPEG, PNG, WebP." },
        { status: 400 }
      );
    }

    if (file.size < 512 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Face crop must be between 512 bytes and 8MB." },
        { status: 400 }
      );
    }

    const parsed = BodySchema.parse({
      yawDeg: form.get("yawDeg"),
      pitchDeg: form.get("pitchDeg"),
      expression: form.get("expression"),
      durationSec: form.get("durationSec") ?? 8,
      mode: form.get("mode") ?? "persistent",
    });

    const mode: HeadMotionMode = parsed.mode;

    const result = await startHeadMotionTask({
      buffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name || "face-crop.jpg",
      mimeType: file.type,
      controls: {
        yawDeg: parsed.yawDeg,
        pitchDeg: parsed.pitchDeg,
        expression: parsed.expression,
        durationSec: parsed.durationSec,
      },
      mode,
    });

    return NextResponse.json(
      {
        taskId: result.taskId,
        promptText: result.promptText,
        controls: result.controls,
        uploadUri: result.uploadUri,
        mode: result.mode,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid motion parameters", details: error.flatten() },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Motion generation failed";
    const status = /api.?key|secret|auth|401/i.test(message)
      ? 401
      : /not set|not configured/i.test(message)
        ? 503
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
