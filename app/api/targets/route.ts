import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateTargetSchema } from "@/types/targets";
import { listTargets, upsertTarget } from "@/lib/db/targets";

export async function GET() {
  const targets = listTargets();
  return NextResponse.json({ targets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateTargetSchema.parse(body);
    const target = upsertTarget(parsed);
    return NextResponse.json({ target }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create target" },
      { status: 500 }
    );
  }
}
