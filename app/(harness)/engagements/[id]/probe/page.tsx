import { ProbeRunClient } from "@/components/probe/ProbeRunClient";

interface ProbePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProbePage({ params }: ProbePageProps) {
  const { id } = await params;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4">
      <ProbeRunClient engagementId={id} />
    </div>
  );
}
