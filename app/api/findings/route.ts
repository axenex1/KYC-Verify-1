import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CreateFindingSchema,
  FindingSeveritySchema,
  TriageStateSchema,
} from "@/types/findings";
import { createFinding, listFindings } from "@/lib/db/findings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const triageRaw = searchParams.get("triageState");
  const severityRaw = searchParams.get("severity");
  const engagementId = searchParams.get("engagementId") ?? undefined;
  const targetId = searchParams.get("targetId") ?? undefined;

  let triageState: z.infer<typeof TriageStateSchema> | undefined;
  if (triageRaw) {
    const parsed = TriageStateSchema.safeParse(triageRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid triageState filter" },
        { status: 400 }
      );
    }
    triageState = parsed.data;
  }

  let severity: z.infer<typeof FindingSeveritySchema> | undefined;
  if (severityRaw) {
    const parsed = FindingSeveritySchema.safeParse(severityRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid severity filter" },
        { status: 400 }
      );
    }
    severity = parsed.data;
  }

  const findings = listFindings({
    triageState,
    severity,
    engagementId,
    targetId,
  });
  return NextResponse.json({ findings });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateFindingSchema.parse(body);
    const finding = createFinding(parsed);
    return NextResponse.json({ finding }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create finding" },
      { status: 500 }
    );
  }
}
