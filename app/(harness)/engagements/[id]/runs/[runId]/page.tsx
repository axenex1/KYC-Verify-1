import { SessionForensicsView } from "@/components/engagements/SessionForensicsView";

interface RunForensicsPageProps {
  params: Promise<{ id: string; runId: string }>;
}

/** Forensics / Run Replay — replaces dashboard/[sessionId] for the new flow. */
export default async function RunForensicsPage({
  params,
}: RunForensicsPageProps) {
  const { id, runId } = await params;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4">
      <SessionForensicsView engagementId={id} runId={runId} />
    </div>
  );
}
