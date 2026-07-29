/**
 * Remediation report helpers (plan: lib/report/).
 * Re-exports the markdown generator used by forensics + probe export.
 */
export {
  generateMarkdownReport,
  downloadTextFile,
  type PentestReportInput,
} from "@/lib/findings/report";
