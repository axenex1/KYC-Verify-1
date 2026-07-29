import { NextResponse } from "next/server";
import { isRunwayConfigured } from "@/lib/runway/client";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: isRunwayConfigured(),
    provider: "runway",
  });
}
