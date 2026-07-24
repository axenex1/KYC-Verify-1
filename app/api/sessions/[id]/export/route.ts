import { NextResponse } from "next/server";
import { SessionExportSchema } from "@/types/session";
import {
  getServerSession,
  updateServerSessionExport,
} from "@/lib/session/server-store";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = getServerSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session.export) {
    return NextResponse.json(
      { error: "Session export not yet available" },
      { status: 404 }
    );
  }

  return NextResponse.json(session.export);
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const exportData = SessionExportSchema.parse(body);

    if (exportData.sessionId !== id) {
      return NextResponse.json(
        { error: "Session ID mismatch" },
        { status: 400 }
      );
    }

    const session = updateServerSessionExport(id, exportData);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid export payload" },
      { status: 400 }
    );
  }
}
