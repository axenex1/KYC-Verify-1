/**
 * Push an armed harness clip to the sync server for the Android companion.
 * Uses adb-reversed localhost:3001 companion clip API.
 */

import { SYNC_WS_PORT } from "@/lib/sync/messages";

export interface PushCompanionClipInput {
  sessionId: string;
  token: string;
  clipUrl: string;
  mimeType?: string;
  armed?: boolean;
  syncHttpBase?: string;
}

export interface PushCompanionClipResult {
  clipId: string;
  byteLength: number;
}

export async function pushCompanionClip(
  input: PushCompanionClipInput
): Promise<PushCompanionClipResult> {
  const base = input.syncHttpBase ?? `http://127.0.0.1:${SYNC_WS_PORT}`;
  const res = await fetch(input.clipUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch clip for companion push (${res.status})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType =
    input.mimeType ??
    res.headers.get("content-type") ??
    "video/mp4";

  const push = await fetch(`${base}/companion/clip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: input.sessionId,
      token: input.token,
      mimeType,
      clipBase64: buf.toString("base64"),
      armed: input.armed ?? true,
    }),
  });

  if (!push.ok) {
    const err = await push.text();
    throw new Error(`Companion clip push failed: ${err}`);
  }

  const data = (await push.json()) as {
    clipId: string;
    byteLength: number;
  };
  return { clipId: data.clipId, byteLength: data.byteLength };
}

/** Browser-safe push (no Buffer) for client components. */
export async function pushCompanionClipBrowser(
  input: PushCompanionClipInput
): Promise<PushCompanionClipResult> {
  const base = input.syncHttpBase ?? `http://127.0.0.1:${SYNC_WS_PORT}`;
  const res = await fetch(input.clipUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch clip for companion push (${res.status})`);
  }
  const blob = await res.blob();
  const mimeType = input.mimeType ?? (blob.type || "video/mp4");
  const ab = await blob.arrayBuffer();
  const bytes = new Uint8Array(ab);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const clipBase64 = btoa(binary);

  const push = await fetch(`${base}/companion/clip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: input.sessionId,
      token: input.token,
      mimeType,
      clipBase64,
      armed: input.armed ?? true,
    }),
  });

  if (!push.ok) {
    const err = await push.text();
    throw new Error(`Companion clip push failed: ${err}`);
  }

  const data = (await push.json()) as {
    clipId: string;
    byteLength: number;
  };
  return { clipId: data.clipId, byteLength: data.byteLength };
}
