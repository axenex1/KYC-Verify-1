import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CreateEngagementSchema,
  EngagementStatusSchema,
} from "@/types/engagement";
import { createEngagement, listEngagements } from "@/lib/db/engagements";
import { getTarget } from "@/lib/db/targets";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get("status");
  const targetId = searchParams.get("targetId") ?? undefined;

  let status: z.infer<typeof EngagementStatusSchema> | undefined;
  if (statusRaw) {
    const parsed = EngagementStatusSchema.safeParse(statusRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status filter" },
        { status: 400 }
      );
    }
    status = parsed.data;
  }

  const engagements = listEngagements({ status, targetId });
  return NextResponse.json({ engagements });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateEngagementSchema.parse(body);

    const target = getTarget(parsed.targetId);
    if (!target) {
      return NextResponse.json(
        { error: "Target not found" },
        { status: 404 }
      );
    }

    const engagement = createEngagement(parsed);
    return NextResponse.json({ engagement }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create engagement" },
      { status: 500 }
    );
  }
}
