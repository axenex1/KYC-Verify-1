import { CompanionController } from "@/components/controller/CompanionController";

interface ControllerPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ControllerPage({ params }: ControllerPageProps) {
  const { sessionId } = await params;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Companion Controller</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Desktop orchestration for Android companion over USB (ADB reverse).
          Session: <code className="font-mono text-xs">{sessionId}</code>
        </p>
      </div>
      <CompanionController sessionId={sessionId} />
    </div>
  );
}
