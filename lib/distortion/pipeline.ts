import type { DistortionSettings } from "./types";

/**
 * Apply a pixel-level spatial distortion to the current canvas contents.
 * Uses backward mapping: for each output pixel, find the source pixel.
 * Runs at the same throttled rate as the main processing loop (≤15 fps).
 */
export function applyDistortionToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: DistortionSettings
): void {
  if (settings.mode === "none" || settings.intensity <= 0 || width < 1 || height < 1) {
    return;
  }

  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const srcData = src.data;
  const dstData = dst.data;

  const cx = width / 2;
  const cy = height / 2;
  const k = Math.min(1, Math.max(0, settings.intensity));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sx: number;
      let sy: number;

      switch (settings.mode) {
        case "stretch-h": {
          // Compress source x toward centre → output appears wider
          const factor = 1 - k * 0.45;
          sx = cx + (x - cx) * factor;
          sy = y;
          break;
        }
        case "stretch-v": {
          // Compress source y toward centre → output appears taller
          const factor = 1 - k * 0.45;
          sx = x;
          sy = cy + (y - cy) * factor;
          break;
        }
        case "barrel": {
          // Backward map: output (x,y) ← source via barrel approximation
          const nx = (x - cx) / cx;
          const ny = (y - cy) / cy;
          const r = Math.sqrt(nx * nx + ny * ny);
          if (r < 0.0001) {
            sx = x;
            sy = y;
          } else {
            // rSrc < rDst → source from inner region → centre magnified
            const rSrc = r / (1 + k * 0.6 * r * r);
            const scale = rSrc / r;
            sx = cx + nx * cx * scale;
            sy = cy + ny * cy * scale;
          }
          break;
        }
        case "pinch": {
          // Backward map: source from outer region → centre compressed
          const nx = (x - cx) / cx;
          const ny = (y - cy) / cy;
          const r = Math.sqrt(nx * nx + ny * ny);
          if (r < 0.0001) {
            sx = x;
            sy = y;
          } else {
            const rSrc = r * (1 + k * 0.5 * r * r);
            const scale = rSrc / r;
            sx = cx + nx * cx * scale;
            sy = cy + ny * cy * scale;
          }
          break;
        }
        case "skew-x": {
          // Horizontal shear: amount proportional to distance from vertical centre
          const offset = ((y - cy) / cy) * k * cx * 0.35;
          sx = x + offset;
          sy = y;
          break;
        }
        default:
          sx = x;
          sy = y;
      }

      // Nearest-neighbour sample with edge clamping
      const srcX = Math.max(0, Math.min(width - 1, Math.round(sx)));
      const srcY = Math.max(0, Math.min(height - 1, Math.round(sy)));

      const dstIdx = (y * width + x) * 4;
      const srcIdx = (srcY * width + srcX) * 4;

      dstData[dstIdx] = srcData[srcIdx];
      dstData[dstIdx + 1] = srcData[srcIdx + 1];
      dstData[dstIdx + 2] = srcData[srcIdx + 2];
      dstData[dstIdx + 3] = srcData[srcIdx + 3];
    }
  }

  ctx.putImageData(dst, 0, 0);
}
