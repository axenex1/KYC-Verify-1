/**
 * Desktop media loop: draw armed blob to canvas and expose captureStream.
 * Lab preview / OBS source — not a production camera spoof.
 */

export type LoopHandle = {
  canvas: HTMLCanvasElement;
  stream: MediaStream;
  stop: () => void;
};

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.preload = "auto";
    video.src = url;
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error("Could not load armed video"));
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load armed image"));
    img.src = url;
  });
}

export async function startMediaLoop(
  blob: Blob,
  mimeType: string,
  fps = 15
): Promise<LoopHandle> {
  const url = URL.createObjectURL(blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Canvas 2D unavailable");
  }

  let raf = 0;
  let timer: number | null = null;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    if (timer != null) window.clearInterval(timer);
    URL.revokeObjectURL(url);
    stream.getTracks().forEach((t) => t.stop());
  };

  const isVideo = mimeType.startsWith("video/") || blob.type.startsWith("video/");

  if (isVideo) {
    const video = await loadVideo(url);
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    await video.play();

    const tick = () => {
      if (stopped) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      raf = requestAnimationFrame(tick);
    };
    tick();
  } else {
    const img = await loadImage(url);
    canvas.width = img.naturalWidth || 1280;
    canvas.height = img.naturalHeight || 720;
    const paint = () => {
      if (stopped) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    paint();
    timer = window.setInterval(paint, Math.max(33, Math.round(1000 / fps)));
  }

  const stream = canvas.captureStream(fps);
  return { canvas, stream, stop };
}
