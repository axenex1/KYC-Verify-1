import { NextResponse } from "next/server";
import { getBudgetPixelImageJob, isBudgetPixelConfigured } from "@/lib/budgetpixel/client";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  if (!isBudgetPixelConfigured()) {
    return NextResponse.json({ error: "BudgetPixel is not configured." }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Job id required" }, { status: 400 });
  }

  try {
    const job = await getBudgetPixelImageJob(id);
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Poll failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
