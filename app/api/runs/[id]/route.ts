import { NextResponse } from "next/server";
import { z } from "zod";
import {
  RunStatusSchema,
  TargetVerdictSchema,
  VectorPayloadSchema,
} from "@/types/engagement";
import { getRun, updateRun } from "@/lib/db/runs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PatchRunSchema = z.object({
  status: RunStatusSchema.optional(),
  sessionId: z.string().nullable().optional(),
  vectorPayload: VectorPayloadSchema.nullable().optional(),
  targetVerdict: TargetVerdictSchema.nullable().optional(),
  completedAt: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = PatchRunSchema.parse(body);
    const run = updateRun(id, parsed);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update run" },
      { status: 500 }
    );
  }
}
