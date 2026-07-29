import { NextResponse } from "next/server";
import { z } from "zod";
import { UpdateEngagementSchema } from "@/types/engagement";
import { getEngagement, updateEngagement } from "@/lib/db/engagements";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const engagement = getEngagement(id);
  if (!engagement) {
    return NextResponse.json(
      { error: "Engagement not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ engagement });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = UpdateEngagementSchema.parse(body);
    const engagement = updateEngagement(id, parsed);
    if (!engagement) {
      return NextResponse.json(
        { error: "Engagement not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ engagement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update engagement" },
      { status: 500 }
    );
  }
}
