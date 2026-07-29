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
    return NextResponse.json({ error: "Avatar id required" }, { status: 400 });
  }

  try {
    const client = getRunwayClient();
    const avatar = await client.avatars.retrieve(id);

    return NextResponse.json({
      avatar: {
        id: avatar.id,
        name: avatar.name,
        status: avatar.status,
        personality: avatar.personality,
        documentIds: avatar.documentIds,
        referenceImageUri: avatar.referenceImageUri,
        processedImageUri: avatar.processedImageUri,
        startScript: avatar.startScript,
        failure: "failure" in avatar ? avatar.failure : null,
        failureCode: "failureCode" in avatar ? avatar.failureCode : null,
        createdAt: avatar.createdAt,
        updatedAt: avatar.updatedAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve avatar";
    const status = /not found|404/i.test(message) ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
