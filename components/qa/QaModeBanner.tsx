import { AlertTriangle } from "lucide-react";

export function QaModeBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      <p>
        <strong>QA TEST MODE</strong> - Simulated liveness signals for integration
        testing only. Not for production identity verification.
      </p>
    </div>
  );
}
