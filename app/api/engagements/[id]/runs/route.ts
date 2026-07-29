import { NextResponse } from "next/server";
import { z } from "zod";
import { VectorPayloadSchema } from "@/types/engagement";
import { createRun, listRunsByEngagement } from "@/lib/db/runs";
import { getEngagement } from "@/lib/db/engagements";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!getEngagement(id)) {
    return NextResponse.json(
      { error: "Engagement not found" },
      { status: 404 }
    );
  }
  const runs = listRunsByEngagement(id);
  return NextResponse.json({ runs });
}

const CreateRunBodySchema = z.object({
  sessionId: z.string().optional(),
  vectorPayload: VectorPayloadSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!getEngagement(id)) {
    return NextResponse.json(
      { error: "Engagement not found" },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const parsed = CreateRunBodySchema.parse(body);
    const run = createRun({
      engagementId: id,
      sessionId: parsed.sessionId,
      vectorPayload: parsed.vectorPayload,
      metadata: parsed.metadata,
    });
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create run" },
      { status: 500 }
    );
  }
}
