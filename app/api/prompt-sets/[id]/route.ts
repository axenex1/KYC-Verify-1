import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getCustomPromptSet,
  updateCustomPromptSet,
  deleteCustomPromptSet,
} from "@/lib/prompt-sets/server-store";
import { CreateCustomPromptSetSchema } from "@/lib/prompt-sets/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const set = getCustomPromptSet(id);
  if (!set) {
    return NextResponse.json({ error: "Prompt set not found" }, { status: 404 });
  }
  return NextResponse.json(set);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = CreateCustomPromptSetSchema.parse(body);
    const updated = updateCustomPromptSet(id, data);
    if (!updated) {
      return NextResponse.json({ error: "Prompt set not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update prompt set" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const deleted = deleteCustomPromptSet(id);
  if (!deleted) {
    return NextResponse.json({ error: "Prompt set not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
