import {
  FaceLandmarker,
  FilesetResolver,
  ImageSegmenter,
} from "@mediapipe/tasks-vision";
import {
  FACE_LANDMARKER_MODEL,
  MEDIAPIPE_WASM_PATH,
  SELFIE_SEGMENTER_MODEL,
} from "@/lib/constants";
import { cropFaceFromDocument } from "@/lib/face/face-crop";

/** Flat cool white used on real AU licence portraits. Not warm. No glow. */
export const ID_PHOTO_BACKDROP = "#F0F2F4";

const OUTPUT_W = 960;
const OUTPUT_H = 1200;

let stillSegmenter: ImageSegmenter | null = null;
let stillLandmarker: FaceLandmarker | null = null;

export interface LicenceIdPhoto {
  /** Person on flat cool white — main photo window. */
  file: File;
  blob: Blob;
  objectUrl: string;
  /** Person only, transparent — ghost print. Never includes the white plate. */
  cutoutBlob: Blob;
  cutoutUrl: string;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode selfie"));
    img.src = src;
  });
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.94): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Failed to encode ID photo"));
      else resolve(blob);
    }, "image/jpeg", quality);
  });
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Failed to encode cutout"));
      else resolve(blob);
    }, "image/png");
  });
}

async function initStillSegmenter(): Promise<ImageSegmenter> {
  if (stillSegmenter) return stillSegmenter;
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
  stillSegmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetPath: SELFIE_SEGMENTER_MODEL, delegate: "GPU" },
    runningMode: "IMAGE",
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });
  return stillSegmenter;
}

async function initStillLandmarker(): Promise<FaceLandmarker> {
  if (stillLandmarker) return stillLandmarker;
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
  stillLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL, delegate: "GPU" },
    runningMode: "IMAGE",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
  return stillLandmarker;
}

function readMask(mask: { width: number; height: number; getAsUint8Array?: () => Uint8Array }): Uint8Array | null {
  if (typeof mask.getAsUint8Array === "function") return mask.getAsUint8Array();
  return null;
}

function extractPersonCutout(img: HTMLImageElement, maskBytes: Uint8Array, maskW: number, maskH: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const scaleX = maskW / canvas.width;
  const scaleY = maskH / canvas.height;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const mx = Math.min(maskW - 1, Math.floor(x * scaleX));
      const my = Math.min(maskH - 1, Math.floor(y * scaleY));
      const category = maskBytes[my * maskW + mx] ?? 0;
      const i = (y * canvas.width + x) * 4;
      if (category === 0) {
        pixels.data[i + 3] = 0;
      }
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

function cropToIdFrame(source: CanvasImageSource, sx: number, sy: number, sw: number, sh: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_W;
  canvas.height = OUTPUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const scale = Math.max(OUTPUT_W / sw, OUTPUT_H / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(source, sx, sy, sw, sh, (OUTPUT_W - dw) / 2, (OUTPUT_H - dh) / 2, dw, dh);
  return canvas;
}

function faceFrame(img: HTMLImageElement, landmarker: FaceLandmarker): { x: number; y: number; w: number; h: number } {
  const detection = landmarker.detect(img);
  const face = detection.faceLandmarks?.[0];
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (!face?.length) {
    const side = Math.min(width, height);
    return { x: (width - side) / 2, y: Math.max(0, (height - side) / 2 - side * 0.05), w: side, h: side * 1.25 };
  }
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const point of face) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const cx = (minX + maxX) / 2;
  const faceH = Math.max(0.12, maxY - minY);
  const frameH = faceH * 2.35;
  const frameW = frameH * (OUTPUT_W / OUTPUT_H);
  const x = Math.max(0, cx - frameW / 2);
  const y = Math.max(0, minY - faceH * 0.55);
  return {
    x: Math.round(x * width),
    y: Math.round(y * height),
    w: Math.round(Math.min(1 - x, frameW) * width),
    h: Math.round(Math.min(1 - y, frameH) * height),
  };
}

function flattenCoolWhite(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] ?? 0;
    if (a < 8) continue;
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // Kill warm yellow halos / glow around the head — force near-white pixels to the backdrop.
    if (lum > 200 && sat < 0.18) {
      data[i] = 240;
      data[i + 1] = 242;
      data[i + 2] = 244;
    } else if (lum > 170 && r > g + 12 && r > b + 12) {
      data[i] = 240;
      data[i + 1] = 242;
      data[i + 2] = 244;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function plateOnCoolWhite(cutout: HTMLCanvasElement): HTMLCanvasElement {
  const plate = document.createElement("canvas");
  plate.width = OUTPUT_W;
  plate.height = OUTPUT_H;
  const ctx = plate.getContext("2d");
  if (!ctx) return plate;
  ctx.fillStyle = ID_PHOTO_BACKDROP;
  ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);
  ctx.drawImage(cutout, 0, 0);
  flattenCoolWhite(plate);
  return plate;
}

async function fallbackFromCrop(source: string): Promise<LicenceIdPhoto> {
  const crop = await cropFaceFromDocument(source);
  const img = await loadImage(crop.objectUrl);
  const cutout = document.createElement("canvas");
  cutout.width = OUTPUT_W;
  cutout.height = OUTPUT_H;
  const cutCtx = cutout.getContext("2d");
  if (cutCtx) {
    const scale = Math.max(OUTPUT_W / img.naturalWidth, OUTPUT_H / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    cutCtx.drawImage(img, (OUTPUT_W - dw) / 2, (OUTPUT_H - dh) / 2, dw, dh);
  }
  const plate = plateOnCoolWhite(cutout);
  const blob = await canvasToJpeg(plate);
  const cutoutBlob = await canvasToPng(cutout);
  return {
    file: new File([blob], "licence-id-photo.jpg", { type: "image/jpeg" }),
    blob,
    objectUrl: URL.createObjectURL(blob),
    cutoutBlob,
    cutoutUrl: URL.createObjectURL(cutoutBlob),
    width: OUTPUT_W,
    height: OUTPUT_H,
  };
}

/**
 * Turn a selfie into an AU-licence ID portrait:
 * flat cool-white plate, no glow, plus a transparent cutout for the ghost print.
 */
export async function prepareLicenceIdPhoto(source: string): Promise<LicenceIdPhoto> {
  try {
    const img = await loadImage(source);
    const [segmenter, landmarker] = await Promise.all([initStillSegmenter(), initStillLandmarker()]);
    const segmented = segmenter.segment(img);
    const mask = segmented.categoryMask;
    const bytes = mask ? readMask(mask as { width: number; height: number; getAsUint8Array?: () => Uint8Array }) : null;
    const frame = faceFrame(img, landmarker);

    let cutSource: CanvasImageSource = img;
    if (mask && bytes) {
      cutSource = extractPersonCutout(img, bytes, mask.width, mask.height);
    }

    const framed = cropToIdFrame(cutSource, frame.x, frame.y, frame.w, frame.h);
    const plate = plateOnCoolWhite(framed);
    const blob = await canvasToJpeg(plate);
    const cutoutBlob = await canvasToPng(framed);
    return {
      file: new File([blob], "licence-id-photo.jpg", { type: "image/jpeg" }),
      blob,
      objectUrl: URL.createObjectURL(blob),
      cutoutBlob,
      cutoutUrl: URL.createObjectURL(cutoutBlob),
      width: OUTPUT_W,
      height: OUTPUT_H,
    };
  } catch {
    return fallbackFromCrop(source);
  }
}
