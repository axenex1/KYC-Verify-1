import {
  ImageSegmenter,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import {
  MEDIAPIPE_WASM_PATH,
  SELFIE_SEGMENTER_MODEL,
} from "@/lib/constants";
import type { BackgroundMode } from "@/lib/constants";

let imageSegmenterInstance: ImageSegmenter | null = null;

export async function initImageSegmenter(): Promise<ImageSegmenter> {
  if (imageSegmenterInstance) {
    return imageSegmenterInstance;
  }

  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
  imageSegmenterInstance = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: SELFIE_SEGMENTER_MODEL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });

  return imageSegmenterInstance;
}

export interface CompositeOptions {
  mode: BackgroundMode;
  presetImage?: HTMLImageElement | null;
  solidColor?: string;
  blurRadius?: number;
}

function drawBlurredBackground(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  blurRadius: number
): void {
  ctx.save();
  ctx.filter = `blur(${blurRadius}px)`;
  ctx.drawImage(source, 0, 0, width, height);
  ctx.restore();
}

function applyMaskComposite(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  mask: ImageData,
  background: CanvasImageSource,
  width: number,
  height: number
): void {
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;

  offCtx.drawImage(background, 0, 0, width, height);
  offCtx.drawImage(video, 0, 0, width, height);

  const composite = offCtx.getImageData(0, 0, width, height);
  const maskData = mask.data;
  const pixels = composite.data;

  const scaleX = mask.width / width;
  const scaleY = mask.height / height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const maskX = Math.floor(x * scaleX);
      const maskY = Math.floor(y * scaleY);
      const maskIndex = maskY * mask.width + maskX;
      const category = maskData[maskIndex];

      if (category === 0) {
        const pixelIndex = (y * width + x) * 4;
        pixels[pixelIndex + 3] = 0;
      }
    }
  }

  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext("2d");
  if (!bgCtx) return;

  bgCtx.drawImage(background, 0, 0, width, height);
  ctx.drawImage(bgCanvas, 0, 0);

  offCtx.putImageData(composite, 0, 0);
  ctx.drawImage(offscreen, 0, 0);
}

export function compositeFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  segmenter: ImageSegmenter,
  timestampMs: number,
  options: CompositeOptions
): { backgroundLuminance: number } {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    return { backgroundLuminance: 0 };
  }

  ctx.canvas.width = width;
  ctx.canvas.height = height;

  if (options.mode === "none") {
    ctx.drawImage(video, 0, 0, width, height);
    return { backgroundLuminance: estimateLuminance(ctx, width, height) };
  }

  const result = segmenter.segmentForVideo(video, timestampMs);
  const mask = result.categoryMask;
  if (!mask) {
    ctx.drawImage(video, 0, 0, width, height);
    return { backgroundLuminance: estimateLuminance(ctx, width, height) };
  }

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = mask.width;
  maskCanvas.height = mask.height;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) {
    ctx.drawImage(video, 0, 0, width, height);
    return { backgroundLuminance: 0 };
  }

  maskCtx.drawImage(mask, 0, 0);
  const maskImageData = maskCtx.getImageData(0, 0, mask.width, mask.height);

  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext("2d");
  if (!bgCtx) {
    ctx.drawImage(video, 0, 0, width, height);
    return { backgroundLuminance: 0 };
  }

  switch (options.mode) {
    case "blur":
      drawBlurredBackground(
        bgCtx,
        video,
        width,
        height,
        options.blurRadius ?? 20
      );
      break;
    case "solid":
      bgCtx.fillStyle = options.solidColor ?? "#e5e7eb";
      bgCtx.fillRect(0, 0, width, height);
      break;
    case "preset":
      if (options.presetImage?.complete) {
        bgCtx.drawImage(options.presetImage, 0, 0, width, height);
      } else {
        bgCtx.fillStyle = "#d1d5db";
        bgCtx.fillRect(0, 0, width, height);
      }
      break;
    default: {
      const _exhaustive: never = options.mode;
      return _exhaustive;
    }
  }

  applyMaskComposite(ctx, video, maskImageData, bgCanvas, width, height);
  return { backgroundLuminance: estimateLuminance(bgCtx, width, height) };
}

function estimateLuminance(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  const sample = ctx.getImageData(0, 0, width, height);
  const data = sample.data;
  let total = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    total += 0.299 * r + 0.587 * g + 0.114 * b;
    count += 1;
  }

  return count > 0 ? total / count / 255 : 0;
}
