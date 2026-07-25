import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/session/server-store";
import { generateRunwayImage } from "@/lib/runway/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 12_000_000;
const DATA_URL_PATTERN =
  /^data:(image\/png|image\/jpeg|image\/webp);base64,([A-Za-z0-9+/=]+)$/;

const GenerateSchema = z.object({
  mode: z.enum(["selfie_to_au_license", "au_license_to_avatar"]),
  imageDataUrl: z.string().min(64).max(MAX_DATA_URL_LENGTH),
});

function parseAndValidateDataUrl(imageDataUrl: string) {
  if (imageDataUrl.length > MAX_DATA_URL_LENGTH) {
    return {
      ok: false as const,
      reason: "Image payload is too large.",
    };
  }

  const match = imageDataUrl.match(DATA_URL_PATTERN);
  if (!match) {
    return {
      ok: false as const,
      reason: "Unsupported image format. Use PNG, JPEG, or WEBP.",
    };
  }

  const base64Payload = match[2] ?? "";
  const padding = base64Payload.endsWith("==")
    ? 2
    : base64Payload.endsWith("=")
      ? 1
      : 0;
  const bytes = Math.floor((base64Payload.length * 3) / 4) - padding;
  if (bytes === 0 || bytes > MAX_IMAGE_BYTES) {
    return {
      ok: false as const,
      reason: "Image is empty or exceeds 8MB limit.",
    };
  }

  return {
    ok: true as const,
    byteSize: bytes,
    mimeType: match[1],
  };
}

export async function POST(request: Request, { params }: RouteParams) {
  const traceId = randomUUID();
  const startedAt = Date.now();
  const { id } = await params;

  const session = getServerSession(id);
  if (!session) {
    return NextResponse.json(
      {
        error: "Session not found",
        code: "SESSION_NOT_FOUND",
        traceId,
      },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON payload",
        code: "INVALID_JSON",
        traceId,
      },
      { status: 400 }
    );
  }

  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        code: "INVALID_REQUEST",
        details: parsed.error.issues,
        traceId,
      },
      { status: 400 }
    );
  }

  const imageValidation = parseAndValidateDataUrl(parsed.data.imageDataUrl);
  if (!imageValidation.ok) {
    return NextResponse.json(
      {
        error: imageValidation.reason,
        code: "INVALID_IMAGE",
        traceId,
      },
      { status: 400 }
    );
  }

  try {
    const result = await generateRunwayImage({
      mode: parsed.data.mode,
      imageDataUrl: parsed.data.imageDataUrl,
      traceId,
    });

    return NextResponse.json({
      success: true,
      traceId,
      durationMs: Date.now() - startedAt,
      mode: parsed.data.mode,
      imageUrl: result.imageUrl,
      taskId: result.taskId,
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Generation service failure";
    const message = rawMessage.slice(0, 240);

    const hasRunwayConfigError = message.includes("RUNWAY_API_KEY");
    const status = hasRunwayConfigError ? 503 : 502;
    const code = hasRunwayConfigError
      ? "RUNWAY_NOT_CONFIGURED"
      : "RUNWAY_GENERATION_FAILED";
    const sanitizedReason = hasRunwayConfigError
      ? "missing_configuration"
      : message.includes("timed out")
        ? "provider_timeout"
        : "provider_failure";

    console.error(
      JSON.stringify({
        level: "error",
        type: "runway_generation_error",
        traceId,
        sessionId: id,
        mode: parsed.data.mode,
        durationMs: Date.now() - startedAt,
        reason: sanitizedReason,
      })
    );

    return NextResponse.json(
      {
        error: "Unable to generate image right now. Please try again.",
        code,
        traceId,
      },
      { status }
    );
  }
}
