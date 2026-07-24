import { LivenessSessionClient } from "@/components/liveness/LivenessSessionClient";

interface VerifyPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { sessionId } = await params;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">QA Liveness Session</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Session ID: <code className="font-mono text-xs">{sessionId}</code>
        </p>
      </div>
      <LivenessSessionClient sessionId={sessionId} />
    </div>
  );
}
