import { NextResponse } from "next/server";
import { z } from "zod";
import { UpdateFindingSchema } from "@/types/findings";
import { getFinding, updateFinding } from "@/lib/db/findings";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const finding = getFinding(id);
  if (!finding) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }
  return NextResponse.json({ finding });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = UpdateFindingSchema.parse(body);
    const finding = updateFinding(id, parsed);
    if (!finding) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }
    return NextResponse.json({ finding });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update finding" },
      { status: 500 }
    );
  }
}
