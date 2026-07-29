import { ProbeRunClient } from "@/components/probe/ProbeRunClient";

interface ProbeRunPageProps {
  params: Promise<{ id: string; runId: string }>;
}

/** Live Probe Run pinned to a specific run id (plan route). */
export default async function ProbeRunByIdPage({ params }: ProbeRunPageProps) {
  const { id, runId } = await params;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4">
      <ProbeRunClient engagementId={id} initialRunId={runId} />
    </div>
  );
}
