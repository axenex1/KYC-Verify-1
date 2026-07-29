import type { Engagement, TargetVerdict, VectorPayload } from "@/types/engagement";

import type { Finding } from "@/types/findings";

import type { Target } from "@/types/targets";

import type { SessionExport } from "@/types/session";



export interface PentestReportInput {

  engagement: Engagement;

  target?: Target | null;

  findings: Finding[];

  sessionExport?: SessionExport | null;

  runId?: string | null;

  vectorPayload?: VectorPayload | null;

  targetVerdict?: TargetVerdict | null;

  generatedAt?: string;

}



function severityOrder(s: Finding["severity"]): number {

  switch (s) {

    case "critical":

      return 0;

    case "high":

      return 1;

    case "medium":

      return 2;

    case "low":

      return 3;

    default: {

      const _exhaustive: never = s;

      return Number(_exhaustive);

    }

  }

}



/**

 * Generate a markdown pentest report for vendor remediation teams.

 */

export function generateMarkdownReport(input: PentestReportInput): string {

  const generatedAt = input.generatedAt ?? new Date().toISOString();

  const findings = [...input.findings].sort(

    (a, b) => severityOrder(a.severity) - severityOrder(b.severity)

  );

  const engName = input.engagement.name ?? input.engagement.id;

  const targetName = input.target?.name ?? input.engagement.targetId;

  const vector =

    input.vectorPayload ??

    input.sessionExport?.vectorPayload ??

    input.engagement.vectorPayloads[0] ??

    null;

  const verdict =

    input.targetVerdict ?? input.sessionExport?.targetVerdict ?? null;



  const lines: string[] = [

    `# KYC Pentest Report - ${engName}`,

    "",

    `Generated: ${generatedAt}`,

    "",

    "## Engagement",

    "",

    `| Field | Value |`,

    `| --- | --- |`,

    `| Engagement ID | \`${input.engagement.id}\` |`,

    `| Status | ${input.engagement.status} |`,

    `| Target | ${targetName} (\`${input.engagement.targetId}\`) |`,

    `| Attack surface | ${input.engagement.attackSurface.join(", ") || "-"} |`,

    `| Vectors configured | ${input.engagement.vectorPayloads.map((v) => v.kind).join(", ") || "-"} |`,

    "",

    "## Probe run summary",

    "",

    `| Field | Value |`,

    `| --- | --- |`,

    `| Run ID | ${input.runId ? `\`${input.runId}\`` : "-"} |`,

    `| Session ID | ${input.sessionExport?.sessionId ? `\`${input.sessionExport.sessionId}\`` : "-"} |`,

    `| Active vector | ${vector ? `${vector.kind}${vector.label ? ` (${vector.label})` : ""}` : "-"} |`,

    `| Target verdict | ${verdict?.outcome ?? "-"} |`,

    `| Verdict confidence | ${verdict?.confidence != null ? `${Math.round(verdict.confidence * 100)}%` : "-"} |`,

    "",

  ];



  if (vector || verdict) {

    lines.push("### Attacker intent vs target verdict", "");

    lines.push("| Side | Detail |", "| --- | --- |");

    lines.push(

      `| Attacker intent | Inject \`${vector?.kind ?? "none"}\` payload${vector?.label ? ` - ${vector.label}` : ""} |`

    );

    lines.push(

      `| Target verdict | \`${verdict?.outcome ?? "unknown"}\`${verdict?.signals ? ` - signals: \`${JSON.stringify(verdict.signals)}\`` : ""} |`

    );

    lines.push("");

  }



  lines.push("## Findings", "");

  if (findings.length === 0) {

    lines.push("_No detection gaps extracted for this engagement._", "");

  } else {

    lines.push(

      `| Severity | Title | Vector | Triage |`,

      `| --- | --- | --- | --- |`

    );

    for (const f of findings) {

      lines.push(

        `| ${f.severity} | ${f.title} | ${f.vector ?? "-"} | ${f.triageState} |`

      );

    }

    lines.push("");



    for (const f of findings) {

      lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`, "");

      lines.push(`- **ID:** \`${f.id}\``);

      lines.push(`- **Vector:** ${f.vector ?? "-"}`);

      lines.push(`- **Triage:** ${f.triageState}`);

      if (f.description) lines.push(`- **Description:** ${f.description}`);

      if (f.reproSteps) {

        lines.push("", "**Reproduction**", "", "```", f.reproSteps, "```");

      }

      if (f.evidence && Object.keys(f.evidence).length > 0) {

        lines.push(

          "",

          "**Evidence**",

          "",

          "```json",

          JSON.stringify(f.evidence, null, 2),

          "```"

        );

      }

      lines.push("");

    }

  }



  if (input.sessionExport?.events?.length) {

    lines.push("## Audit event timeline", "");

    for (const ev of input.sessionExport.events) {

      lines.push(`- \`${ev.timestamp}\` **${ev.type}**`);

    }

    lines.push("");

  }



  lines.push(

    "---",

    "",

    "_AUTHORIZED ENGAGEMENT - results are for internal KYC vendor remediation only._",

    ""

  );



  return lines.join("\n");

}



export function downloadTextFile(

  filename: string,

  content: string,

  mime = "text/markdown"

): void {

  const blob = new Blob([content], { type: mime });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");

  anchor.href = url;

  anchor.download = filename;

  anchor.click();

  URL.revokeObjectURL(url);

}

