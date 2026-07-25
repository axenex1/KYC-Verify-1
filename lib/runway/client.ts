import { setTimeout as delay } from "timers/promises";

const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
const DEFAULT_RUNWAY_MODEL = "gen4_image";

type GenerationMode = "selfie_to_au_license" | "au_license_to_avatar";

interface RunwayTaskResponse {
  id?: string;
  taskId?: string;
  status?: string;
  output?: unknown;
}

export interface RunwayGenerateInput {
  mode: GenerationMode;
  imageDataUrl: string;
  traceId: string;
}

export interface RunwayGenerateResult {
  imageUrl: string;
  taskId: string;
}

function getModePrompt(mode: GenerationMode): string {
  if (mode === "selfie_to_au_license") {
    return "Convert this selfie into a realistic synthetic Australian driver's licence card photo. Keep a neutral studio capture look, preserve identity resemblance, and ensure the card appears clearly synthetic and non-official.";
  }
  return "Convert this Australian driver's licence card photo into a clean realistic avatar portrait with neutral lighting and background.";
}

function getRunwayHeaders(apiKey: string) {
  return {
    Authorization: "Bearer " + apiKey,
    "Content-Type": "application/json",
    "X-Runway-Version": "2024-11-06",
  };
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  {
    timeoutMs = 20000,
    attempts = 2,
  }: {
    timeoutMs?: number;
    attempts?: number;
  } = {}
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (response.status >= 500 && attempt < attempts) {
        await delay(300 * attempt);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Network error");
      if (attempt < attempts) {
        await delay(300 * attempt);
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new Error("Request failed");
}

function extractImageUrlFromOutput(output: unknown): string | null {
  if (typeof output === "string" && output.length > 0) {
    return output;
  }

  if (Array.isArray(output)) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && "url" in first) {
      const maybeUrl = (first as { url?: unknown }).url;
      return typeof maybeUrl === "string" ? maybeUrl : null;
    }
  }

  if (output && typeof output === "object") {
    const maybeUrl = (output as { url?: unknown }).url;
    if (typeof maybeUrl === "string" && maybeUrl.length > 0) {
      return maybeUrl;
    }

    const images = (output as { images?: unknown }).images;
    if (Array.isArray(images) && images.length > 0) {
      const first = images[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && "url" in first) {
        const nestedUrl = (first as { url?: unknown }).url;
        return typeof nestedUrl === "string" ? nestedUrl : null;
      }
    }
  }

  return null;
}

export async function generateRunwayImage({
  mode,
  imageDataUrl,
  traceId,
}: RunwayGenerateInput): Promise<RunwayGenerateResult> {
  const apiKey = process.env.RUNWAY_API_KEY;
  if (!apiKey) {
    throw new Error("RUNWAY_API_KEY is not configured");
  }

  const model = process.env.RUNWAY_MODEL || DEFAULT_RUNWAY_MODEL;

  const createResponse = await fetchWithRetry(`${RUNWAY_API_BASE}/tasks`, {
    method: "POST",
    headers: getRunwayHeaders(apiKey),
    body: JSON.stringify({
      model,
      input: {
        prompt: getModePrompt(mode),
        image: imageDataUrl,
      },
      metadata: {
        traceId,
        mode,
      },
    }),
  });

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    throw new Error(
      `Runway task creation failed (${createResponse.status}): ${errorBody.slice(
        0,
        240
      )}`
    );
  }

  const created = (await createResponse.json()) as RunwayTaskResponse;
  const taskId = created.id ?? created.taskId;

  if (!taskId) {
    throw new Error("Runway task creation returned no task ID");
  }

  if (created.status === "SUCCEEDED" || created.status === "succeeded") {
    const directOutput = extractImageUrlFromOutput(created.output);
    if (directOutput) {
      return { imageUrl: directOutput, taskId };
    }
  }

  const pollDeadline = Date.now() + 90_000;
  let lastStatus = created.status ?? "pending";

  while (Date.now() < pollDeadline) {
    await delay(1500);

    const pollResponse = await fetchWithRetry(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
      method: "GET",
      headers: getRunwayHeaders(apiKey),
    });

    if (!pollResponse.ok) {
      const body = await pollResponse.text();
      throw new Error(
        `Runway task poll failed (${pollResponse.status}): ${body.slice(0, 240)}`
      );
    }

    const polled = (await pollResponse.json()) as RunwayTaskResponse;
    const status = (polled.status ?? "").toLowerCase();
    lastStatus = polled.status ?? "pending";

    if (status === "failed" || status === "cancelled") {
      throw new Error(`Runway task ${status}`);
    }

    if (status === "succeeded" || status === "completed") {
      const imageUrl = extractImageUrlFromOutput(polled.output);
      if (!imageUrl) {
        throw new Error("Runway task completed without image output");
      }
      return { imageUrl, taskId };
    }
  }

  throw new Error(`Runway task timed out while ${lastStatus}`);
}
