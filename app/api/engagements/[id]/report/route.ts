import { NextResponse } from "next/server";
import { getEngagement } from "@/lib/db/engagements";
import { getTarget } from "@/lib/db/targets";
import { listFindings } from "@/lib/db/findings";
import { listRunsByEngagement } from "@/lib/db/runs";
import { listSessionsByEngagement } from "@/lib/db/sessions";
import { generateMarkdownReport } from "@/lib/report";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/engagements/[id]/report — markdown remediation report. */
export async function GET(request: Request, { params }: RouteParams) {
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

  const markdown = generateMarkdownReport({
    engagement,
    target,
    findings,
    sessionExport: latestSession,
    runId: latestRun?.id ?? null,
    vectorPayload: latestRun?.vectorPayload ?? null,
    targetVerdict: latestRun?.targetVerdict ?? null,
  });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";

  if (format === "md" || format === "markdown") {
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="pentest-report-${id}.md"`,
      },
    });
  }

  return NextResponse.json({
    engagementId: id,
    markdown,
    findingsCount: findings.length,
    generatedAt: new Date().toISOString(),
  });
}
