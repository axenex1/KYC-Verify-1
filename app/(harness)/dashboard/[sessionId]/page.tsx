import { SessionDetailView } from "@/components/dashboard/SessionDetailView";

interface SessionDetailPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionDetailPage({
  params,
}: SessionDetailPageProps) {
  const { sessionId } = await params;

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <SessionDetailView sessionId={sessionId} />
    </div>
  );
}
