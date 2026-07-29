import { NextResponse } from "next/server";
import { getEngagement } from "@/lib/db/engagements";
import { getTarget } from "@/lib/db/targets";
import { listFindings } from "@/lib/db/findings";
import { listRunsByEngagement } from "@/lib/db/runs";
import { listSessionsByEngagement } from "@/lib/db/sessions";
import { generateMarkdownReport } from "@/lib/findings/report";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const engagement = getEngagement(id);
  if (!engagement) {
    return NextResponse.json(
      { error: "Engagement not found" },
      { status: 404 }
    );
  }

  const target = getTarget(engagement.targetId) ?? null;
  const findings = listFindings({ engagementId: id });
  const runs = listRunsByEngagement(id);
  const sessions = listSessionsByEngagement(id);
  const latestRun = runs[0] ?? null;
  const latestSession = sessions.find((s) => s.export)?.export ?? null;

  const reportMarkdown = generateMarkdownReport({
    engagement,
    target,
    findings,
    sessionExport: latestSession,
    runId: latestRun?.id ?? null,
    vectorPayload: latestRun?.vectorPayload ?? null,
    targetVerdict: latestRun?.targetVerdict ?? null,
  });

  return NextResponse.json({
    engagement,
    target,
    findings,
    runs,
    sessions,
    reportMarkdown,
  });
}
