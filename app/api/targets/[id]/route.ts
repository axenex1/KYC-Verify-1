import { NextResponse } from "next/server";
import { z } from "zod";
import { UpdateTargetSchema } from "@/types/targets";
import {
  deleteTarget,
  getTarget,
  updateTarget,
} from "@/lib/db/targets";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const target = getTarget(id);
  if (!target) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }
  return NextResponse.json({ target });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json();
    const parsed = UpdateTargetSchema.parse(body);
    const target = updateTarget(id, parsed);
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    return NextResponse.json({ target });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update target" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const deleted = deleteTarget(id);
  if (!deleted) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
