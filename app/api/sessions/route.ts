import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  createServerSession,
  listServerSessions,
} from "@/lib/session/server-store";
import { toSessionListItem } from "@/lib/dashboard/aggregations";
import { STANDARD_PROMPT_SET } from "@/lib/session/prompts";
import { getProvider, DEFAULT_PROVIDER_ID } from "@/lib/session/providers";

const CreateSessionSchema = z.object({
  mode: z.literal("qa"),
  promptSet: z.string().default(STANDARD_PROMPT_SET),
  providerId: z.string().optional(),
  customPromptSetId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let sessions = listServerSessions().map(toSessionListItem);

  if (status === "completed") {
    sessions = sessions.filter((s) => s.status === "completed");
  } else if (status === "in_progress") {
    sessions = sessions.filter((s) => s.status === "in_progress");
  }

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateSessionSchema.parse(body);
    const sessionId = randomUUID();
    const createdAt = new Date().toISOString();

    const providerId = parsed.providerId ?? DEFAULT_PROVIDER_ID;
    const provider = getProvider(providerId);
    const promptSetLabel = parsed.customPromptSetId
      ? `custom:${parsed.customPromptSetId}`
      : provider.promptSetLabel;

    createServerSession(sessionId, promptSetLabel, {
      providerId,
      customPromptSetId: parsed.customPromptSetId,
    });

    return NextResponse.json({
      sessionId,
      createdAt,
      environment: "qa" as const,
      providerId,
      customPromptSetId: parsed.customPromptSetId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
