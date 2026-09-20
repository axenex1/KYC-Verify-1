import { DOCUMENT_NEGATIVE_PROMPT } from "@/lib/budgetpixel/prompts";

function parseBudgetPixelError(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") return fallback;
  const err = (json as { error?: unknown; message?: unknown }).error;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object") {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  const message = (json as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

const API = "https://api.budgetpixel.com/v1";

export function isBudgetPixelConfigured(): boolean {
  return Boolean(process.env.BUDGETPIXEL_API_KEY?.trim());
}

export function getBudgetPixelKey(): string {
  const key = process.env.BUDGETPIXEL_API_KEY?.trim();
  if (!key) {
    throw new Error("BUDGETPIXEL_API_KEY is not set. Add it to .env and restart.");
  }
  return key;
}

export async function budgetPixelFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getBudgetPixelKey()}`);
  return fetch(`${API}${path}`, { ...init, headers });
}

export async function uploadBudgetPixelFile(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), fileName);
  const res = await budgetPixelFetch("/uploads", { method: "POST", body: form });
  const json = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !json.url) {
    throw new Error(parseBudgetPixelError(json, `Upload failed (${res.status})`));
  }
  return json.url;
}

export async function createDocumentImageJob(input: {
  prompt: string;
  referenceUrls: string[];
  negativePrompt?: string;
  model?: string;
}): Promise<{ id: string; status: string; model: string }> {
  const model = input.model || "qwen-image-2.0-pro";
  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    reference_images: input.referenceUrls.slice(0, 3),
    aspect_ratio: "match_input_image",
    size: "2K",
    num_images: 1,
    negative_prompt: input.negativePrompt || DOCUMENT_NEGATIVE_PROMPT,
  };
  if (model === "nano-banana-pro") {
    payload.input_images = input.referenceUrls.slice(0, 9);
  }
  const res = await budgetPixelFetch(`/images/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as {
    id?: string;
    status?: string;
    model?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(parseBudgetPixelError(json, `Generation failed (${res.status})`));
  }
  return { id: json.id, status: json.status || "pending", model: json.model || model };
}

export async function getBudgetPixelImageJob(id: string): Promise<{
  id: string;
  status: string;
  images: { url: string; position?: number }[];
  error?: string;
}> {
  const res = await budgetPixelFetch(`/images/${encodeURIComponent(id)}`);
  const json = (await res.json()) as {
    id?: string;
    status?: string;
    images?: { url: string; position?: number }[];
    error?: string | { message?: string };
  };
  if (!res.ok) {
    const message = typeof json.error === "string" ? json.error : json.error?.message;
    throw new Error(message || `Job poll failed (${res.status})`);
  }
  return {
    id: json.id || id,
    status: json.status || "pending",
    images: json.images ?? [],
    error: typeof json.error === "string" ? json.error : json.error?.message,
  };
}

export async function getBudgetPixelCredits(): Promise<number | null> {
  const res = await budgetPixelFetch("/account/credits");
  const json = (await res.json()) as {
    credits?: number;
    balance?: number;
    total_available?: number;
    monthly_remaining?: number;
  };
  if (!res.ok) return null;
  if (typeof json.total_available === "number") return json.total_available;
  if (typeof json.monthly_remaining === "number") return json.monthly_remaining;
  if (typeof json.credits === "number") return json.credits;
  if (typeof json.balance === "number") return json.balance;
  return null;
}
