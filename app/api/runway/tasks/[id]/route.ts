import { NextResponse } from "next/server";
import { getRunwayClient, isRunwayConfigured } from "@/lib/runway/client";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  if (!isRunwayConfigured()) {
    return NextResponse.json(
      {
        error:
          "Runway is not configured. Set RUNWAYML_API_SECRET in the environment.",
      },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Task id required" }, { status: 400 });
  }

  try {
    const client = getRunwayClient();
    const task = await client.tasks.retrieve(id);

    const status = task.status;
    const output =
      status === "SUCCEEDED" && "output" in task
        ? ((task.output as string[] | undefined) ?? [])
        : [];
    const failure =
      status === "FAILED" && "failure" in task
        ? String((task as { failure?: string }).failure ?? "Task failed")
        : null;

    return NextResponse.json({
      task: {
        id: task.id,
        status,
        output,
        failure,
        progress:
          "progress" in task
            ? ((task as { progress?: number }).progress ?? null)
            : null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve task";
    const status = /not found|404/i.test(message) ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
