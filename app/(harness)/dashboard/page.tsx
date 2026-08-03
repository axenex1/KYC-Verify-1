import { DashboardView } from "@/components/dashboard/DashboardView";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Verification Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Session timeline, activity heatmap, progress tracking, and alerts
        </p>
      </div>
      <DashboardView />
    </div>
  );
}
