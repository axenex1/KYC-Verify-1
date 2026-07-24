import { NextResponse } from "next/server";
import { listServerSessions } from "@/lib/session/server-store";
import { buildDashboardSummary } from "@/lib/dashboard/aggregations";

export async function GET() {
  const sessions = listServerSessions();
  const summary = buildDashboardSummary(sessions);
  return NextResponse.json(summary);
}
