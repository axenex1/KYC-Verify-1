import { SessionForensicsView } from "@/components/engagements/SessionForensicsView";

interface EngagementForensicsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EngagementForensicsPage({
  params,
}: EngagementForensicsPageProps) {
  const { id } = await params;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4">
      <SessionForensicsView engagementId={id} />
    </div>
  );
}
