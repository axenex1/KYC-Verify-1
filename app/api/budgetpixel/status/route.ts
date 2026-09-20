import { NextResponse } from "next/server";
import { getBudgetPixelCredits, isBudgetPixelConfigured } from "@/lib/budgetpixel/client";

export const runtime = "nodejs";

export async function GET() {
  const configured = isBudgetPixelConfigured();
  let credits: number | null = null;
  if (configured) {
    try {
      credits = await getBudgetPixelCredits();
    } catch {
      credits = null;
    }
  }
  return NextResponse.json({
    configured,
    provider: "budgetpixel",
    model: "qwen-image-2.0-pro",
    credits,
  });
}
