/**
 * Browser helpers for downloading and looping avatar clips into MediaStreams.
 * Safe to import from client components only (uses DOM APIs).
 */

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadUrl(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  downloadBlob(blob, filename);
}

export interface LoopingClipOptions {
  /** Target canvas capture rate. Default matches desktop_to_mobile contract (15). */
  fps?: number;
  width?: number;
  height?: number;
}

export interface LoopingClipHandle {
  stream: MediaStream;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  stop: () => void;
}

/**
 * Play a remote or blob URL in a looping hidden video, draw to canvas, and
 * return `canvas.captureStream` for deepfake inject / companion outbound.
 */
export async function createLoopingClipStream(
  source: string | Blob,
  options: LoopingClipOptions = {}
): Promise<LoopingClipHandle> {
  const fps = options.fps ?? 15;
  const objectUrl =
    typeof source === "string" ? null : URL.createObjectURL(source);
  const src = typeof source === "string" ? source : objectUrl!;

  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.loop = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = src;

  await new Promise<void>((resolve, reject) => {
    const onError = () =>
      reject(new Error("Failed to load avatar motion clip for injection"));
    video.addEventListener("error", onError, { once: true });
    video.addEventListener(
      "loadeddata",
      () => {
        video.removeEventListener("error", onError);
        resolve();
      },
      { once: true }
    );
  });

  const width = options.width ?? (video.videoWidth || 960);
  const height = options.height ?? (video.videoHeight || 960);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw new Error("Could not create canvas context for clip stream");
  }

  await video.play();

  let rafId: number | null = null;
  let stopped = false;

  const draw = () => {
    if (stopped) return;
    ctx.drawImage(video, 0, 0, width, height);
    rafId = requestAnimationFrame(draw);
  };
  draw();

  const stream = canvas.captureStream(fps);

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (rafId != null) cancelAnimationFrame(rafId);
    video.pause();
    video.removeAttribute("src");
    video.load();
    for (const track of stream.getTracks()) {
      track.stop();
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };

  return { stream, video, canvas, stop };
}
