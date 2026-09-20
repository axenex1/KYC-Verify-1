export async function extractVideoStills(
  videoUrl: string,
  stamps = [0.08, 0.22, 0.38, 0.55]
): Promise<{ label: string; blob: Blob }[]> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = videoUrl;
  video.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Could not read generated video"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const labels = ["front", "left", "right", "up"];
  const stills: { label: string; blob: Blob }[] = [];

  for (let i = 0; i < stamps.length; i += 1) {
    const time = Math.min(video.duration * stamps[i], Math.max(0, video.duration - 0.05));
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("Seek failed"));
      video.currentTime = Number.isFinite(time) ? time : 0;
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((next) => {
        if (!next) reject(new Error("Still encode failed"));
        else resolve(next);
      }, "image/jpeg", 0.92);
    });
    stills.push({ label: labels[i] ?? `still-${i + 1}`, blob });
  }

  video.src = "";
  return stills;
}
