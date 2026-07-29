import { NextResponse } from "next/server";
import { isRunwayConfigured } from "@/lib/runway/client";

export const runtime = "nodejs";

/**
 * Plan E placeholder — realtime gwm1_avatars sessions are not enabled yet.
 * Offline gen4_turbo Document Gen remains the default lab path.
 */
export async function GET() {
  return NextResponse.json({
    configured: isRunwayConfigured(),
    realtimeAvailable: false,
    defaultMode: "offline_persistent",
    message:
      "Runway realtime avatar sessions are planned (Plan E). Use Document Gen offline persistent motion for lab inject.",
  });
}
