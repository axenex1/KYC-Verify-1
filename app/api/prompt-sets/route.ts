import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCustomPromptSet,
  listCustomPromptSets,
} from "@/lib/prompt-sets/server-store";
import { CreateCustomPromptSetSchema } from "@/lib/prompt-sets/types";

export async function GET() {
  const sets = listCustomPromptSets();
  return NextResponse.json({ promptSets: sets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = CreateCustomPromptSetSchema.parse(body);
    const set = createCustomPromptSet(data);
    return NextResponse.json(set, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create prompt set" },
      { status: 500 }
    );
  }
}
