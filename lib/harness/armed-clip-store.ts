import type { ArmAvatarClipInput, HarnessAvatarClip } from "./types";

const STORAGE_KEY = "kyc-harness:armed-avatar-clip";
const CHANGE_EVENT = "kyc-harness:armed-avatar-clip-change";

type Listener = (clip: HarnessAvatarClip | null) => void;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readRaw(): HarnessAvatarClip | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HarnessAvatarClip;
    if (!parsed?.clipUrl || typeof parsed.clipUrl !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRaw(clip: HarnessAvatarClip | null): void {
  if (!canUseStorage()) return;
  if (!clip) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clip));
  }
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, { detail: clip })
  );
}

/** Read the currently armed avatar clip (shared across Document Gen / Probe / Pair). */
export function getArmedAvatarClip(): HarnessAvatarClip | null {
  return readRaw();
}

/** Persist an armed clip for Probe deepfake inject and Companion outbound. */
export function armAvatarClip(input: ArmAvatarClipInput): HarnessAvatarClip {
  const clip: HarnessAvatarClip = {
    clipUrl: input.clipUrl,
    avatarId: input.avatarId ?? null,
    avatarName: input.avatarName ?? null,
    sourceFileName: input.sourceFileName ?? null,
    pose: input.pose ?? null,
    sessionId: input.sessionId ?? null,
    armedAt: new Date().toISOString(),
  };
  writeRaw(clip);
  return clip;
}

export function clearArmedAvatarClip(): void {
  writeRaw(null);
}

/** Subscribe to armed-clip changes (same tab + storage events from other tabs). */
export function subscribeArmedAvatarClip(listener: Listener): () => void {
  if (!canUseStorage()) return () => {};

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<HarnessAvatarClip | null>).detail;
    listener(detail ?? null);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    listener(readRaw());
  };

  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
