import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session/server-store";
import { generatePairToken } from "@/lib/sync/tokens";
import { SYNC_WS_PORT } from "@/lib/sync/messages";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function registerPairToken(sessionId: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${SYNC_WS_PORT}/pair/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, token, ttlMs: 600_000 }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = getServerSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const res = await fetch(`http://localhost:${SYNC_WS_PORT}/pair/status/${id}`);
    if (!res.ok) {
      return NextResponse.json({
        status: "waiting",
        syncServerAvailable: false,
      });
    }
    const data = await res.json();
    return NextResponse.json({ ...data, syncServerAvailable: true });
  } catch {
    return NextResponse.json({
      status: "waiting",
      syncServerAvailable: false,
    });
  }
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = getServerSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const token = generatePairToken();
  const registered = await registerPairToken(id, token);

  if (!registered) {
    return NextResponse.json(
      {
        error: "Sync server unavailable. Run: npm run dev:sync",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    sessionId: id,
    token,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    wsUrl: `ws://127.0.0.1:3001/sync`,
  });
}
