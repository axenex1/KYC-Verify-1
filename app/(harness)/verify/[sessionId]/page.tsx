import { LivenessSessionClient } from "@/components/liveness/LivenessSessionClient";
import Link from "next/link";

interface VerifyPageProps {
  params: Promise<{ sessionId: string }>;
}

/**
 * Legacy QA verify route - kept for backwards compatibility.
 * New probe flow lives at `/engagements/[id]/probe`.
 */
export default async function VerifyPage({ params }: VerifyPageProps) {
  const { sessionId } = await params;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <p className="mb-2 border border-line bg-console-rail px-3 py-2 font-mono text-[11px] text-muted-foreground">
          Legacy verify route - for Live Probe Run use{" "}
          <Link
            href="/engagements/new"
            className="text-neon-cyan hover:underline"
          >
            Engagement Setup
          </Link>{" "}
          → <code className="text-foreground">/engagements/[id]/probe</code>.
          Session <code className="text-foreground">{sessionId}</code> still
          works here.
        </p>
        <h1 className="text-2xl font-bold tracking-tight">QA Liveness Session</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Session ID: <code className="font-mono text-xs">{sessionId}</code>
        </p>
      </div>
      <LivenessSessionClient sessionId={sessionId} />
    </div>
  );
}
