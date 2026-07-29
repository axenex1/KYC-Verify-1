"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CompanionController } from "@/components/controller/CompanionController";
import { ConsoleLabel } from "@/components/ui/console-label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * Companion Pair — phone-as-camera injection source for mobile-vector probes.
 * Replaces legacy `/controller/[sessionId]` as the engagement-scoped pair surface.
 */
export default function EngagementPairPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const engagementId = params.id;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function arm() {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "qa",
            promptSet: "standard-v1",
            engagementId,
          }),
        });
        if (!res.ok) throw new Error("session_create_failed");
        const data = (await res.json()) as { sessionId: string };
        if (!cancelled) setSessionId(data.sessionId);
      } catch {
        if (!cancelled) setError("Could not arm companion pair session");
      }
    }
    void arm();
    return () => {
      cancelled = true;
    };
  }, [engagementId]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-8">
        <p className="font-mono text-sm text-neon-red">{error}</p>
        <Button asChild variant="outline" className="font-mono text-xs">
          <Link href={`/engagements/${engagementId}/probe`}>Back to probe</Link>
        </Button>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-mono text-xs">arming companion pair…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div>
          <ConsoleLabel>COMPANION PAIR</ConsoleLabel>
          <p className="font-mono text-[11px] text-muted-foreground">
            engagement {engagementId.slice(0, 8)} · session{" "}
            {sessionId.slice(0, 8)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="font-mono text-xs"
          >
            <Link href={`/engagements/${engagementId}/probe`}>Probe</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="font-mono text-xs"
            onClick={() => router.push(`/controller/${sessionId}`)}
          >
            Legacy controller
          </Button>
        </div>
      </div>
      <CompanionController sessionId={sessionId} />
    </div>
  );
}
