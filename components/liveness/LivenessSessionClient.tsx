"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const LivenessPromptController = dynamic(
  () =>
    import("@/components/liveness/LivenessPromptController").then(
      (m) => m.LivenessPromptController
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="space-y-4"
        aria-busy="true"
        aria-label="Loading liveness UI"
      >
        <Skeleton className="h-10 w-48" />
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-24 w-full" />
      </div>
    ),
  }
);

export function LivenessSessionClient({ sessionId }: { sessionId: string }) {
  return <LivenessPromptController sessionId={sessionId} />;
}
