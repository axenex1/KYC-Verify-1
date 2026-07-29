import { NextResponse } from "next/server";
import { getDbHealth, getDbPath } from "@/lib/db";

export async function GET() {
  const health = getDbHealth();
  return NextResponse.json({
    ...health,
    path: getDbPath(),
  });
}
