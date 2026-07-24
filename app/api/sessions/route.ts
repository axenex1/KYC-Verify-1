import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  createServerSession,
  listServerSessions,
} from "@/lib/session/server-store";
import { toSessionListItem } from "@/lib/dashboard/aggregations";
import { STANDARD_PROMPT_SET } from "@/lib/session/prompts";

const CreateSessionSchema = z.object({
  mode: z.literal("qa"),
  promptSet: z.string().default(STANDARD_PROMPT_SET),
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

    createServerSession(sessionId, parsed.promptSet);

    return NextResponse.json({
      sessionId,
      createdAt,
      environment: "qa" as const,
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
