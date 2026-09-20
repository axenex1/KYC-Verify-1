import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { initImageFaceLandmarker } from "@/lib/face/face-crop";

/** 2K-class ID portrait. Printers put the face on a finer grid than the card stock. */
export const ID_DETAIL_W = 960;
export const ID_DETAIL_H = 1200;

const LEFT_EYE = 33;
const RIGHT_EYE = 263;
const FOREHEAD = 10;
const CHIN = 152;

export interface AlignedIdFace {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  rotated: boolean;
}

function loadImage(src: CanvasImageSource | string): Promise<HTMLImageElement> {
  if (typeof src !== "string" && "complete" in src && (src as HTMLImageElement).complete) {
    return Promise.resolve(src as HTMLImageElement);
  }
  if (typeof src !== "string") {
    const any = src as CanvasImageSource & { src?: string };
    if (any.src) src = any.src;
    else {
      const c = document.createElement("canvas");
      const w = (src as HTMLCanvasElement).width || 1;
      const h = (src as HTMLCanvasElement).height || 1;
      c.width = w;
      c.height = h;
      c.getContext("2d")?.drawImage(src, 0, 0);
      src = c.toDataURL("image/png");
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode face for align"));
    img.src = src as string;
  });
}

function eyeCenters(face: { x: number; y: number }[]) {
  const left = face[LEFT_EYE];
  const right = face[RIGHT_EYE];
  if (!left || !right) return null;
  return { lx: left.x, ly: left.y, rx: right.x, ry: right.y };
}

/**
 * Level the eyes and place the head in a 4:5 ID frame at 960×1200.
 * Falls back to a centered cover crop if landmarks miss.
 */
export async function alignFaceToIdFrame(source: CanvasImageSource | string): Promise<AlignedIdFace> {
  const img = await loadImage(source);
  const out = document.createElement("canvas");
  out.width = ID_DETAIL_W;
  out.height = ID_DETAIL_H;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#F0F2F4";
  ctx.fillRect(0, 0, ID_DETAIL_W, ID_DETAIL_H);

  let landmarker: FaceLandmarker | null = null;
  try {
    landmarker = await initImageFaceLandmarker();
  } catch {
    landmarker = null;
  }

  const detection = landmarker?.detect(img);
  const face = detection?.faceLandmarks?.[0];
  const eyes = face?.length ? eyeCenters(face) : null;

  if (!face?.length || !eyes) {
    const scale = Math.max(ID_DETAIL_W / img.naturalWidth, ID_DETAIL_H / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (ID_DETAIL_W - dw) / 2, (ID_DETAIL_H - dh) / 2 - ID_DETAIL_H * 0.04, dw, dh);
    return { canvas: out, width: ID_DETAIL_W, height: ID_DETAIL_H, rotated: false };
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const lx = eyes.lx * w;
  const ly = eyes.ly * h;
  const rx = eyes.rx * w;
  const ry = eyes.ry * h;
  const angle = Math.atan2(ry - ly, rx - lx);
  const midX = (lx + rx) / 2;
  const midY = (ly + ry) / 2;
  const iod = Math.hypot(rx - lx, ry - ly) || 1;

  const forehead = face[FOREHEAD];
  const chin = face[CHIN];
  const faceH = forehead && chin ? Math.abs(chin.y - forehead.y) * h : iod * 2.4;

  // Typical AU licence: eyes sit ~38% down the well, iod ~28% of well width.
  const targetIod = ID_DETAIL_W * 0.28;
  const scale = targetIod / iod;
  const eyeY = ID_DETAIL_H * 0.38;

  ctx.save();
  ctx.translate(ID_DETAIL_W / 2, eyeY);
  ctx.rotate(-angle);
  ctx.scale(scale, scale);
  ctx.translate(-midX, -midY);
  ctx.drawImage(img, 0, 0);
  ctx.restore();

  // Soft-kill leftover warm halo at the edges so the well stays cool white.
  const pix = ctx.getImageData(0, 0, ID_DETAIL_W, ID_DETAIL_H);
  const data = pix.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
    if (lum > 205 && sat < 0.16) {
      data[i] = 240;
      data[i + 1] = 242;
      data[i + 2] = 244;
    }
  }
  ctx.putImageData(pix, 0, 0);

  void faceH;
  return { canvas: out, width: ID_DETAIL_W, height: ID_DETAIL_H, rotated: Math.abs(angle) > 0.01 };
}
