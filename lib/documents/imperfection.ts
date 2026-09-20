/**
 * Dedicated imperfection layer.
 * High-pass the original QLD photograph and stamp that residual back onto
 * the edited plate so print grain, scratches, and plastic glare survive
 * the text/face edits. This is texture transfer, not a redraw.
 */

function sourceSize(src: CanvasImageSource): { w: number; h: number } {
  const s = src as CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
  return { w: s.naturalWidth || s.width || 1, h: s.naturalHeight || s.height || 1 };
}

function toCanvas(src: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")?.drawImage(src, 0, 0, w, h);
  return c;
}

function blur(src: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(src, 0, 0);
  ctx.filter = "none";
  return out;
}

/**
 * Soft-light the original plate's high-frequency residual onto `edited`.
 * Skip red-value slots so old names/numbers do not ghost through.
 * Face well gets a lighter mix so the selfie stays sharp.
 */
export function applyImperfectionLayer(input: {
  edited: HTMLCanvasElement;
  original: CanvasImageSource;
  photoWell?: { x: number; y: number; w: number; h: number };
  exclude?: { x: number; y: number; w: number; h: number }[];
}): HTMLCanvasElement {
  const w = input.edited.width;
  const h = input.edited.height;
  const stock = toCanvas(input.original, w, h);
  const soft = blur(stock, 1.6);
  const edited = input.edited.getContext("2d");
  const stockCtx = stock.getContext("2d");
  const softCtx = soft.getContext("2d");
  if (!edited || !stockCtx || !softCtx) return input.edited;

  const e = edited.getImageData(0, 0, w, h);
  const s = stockCtx.getImageData(0, 0, w, h);
  const b = softCtx.getImageData(0, 0, w, h);
  const ed = e.data;
  const sd = s.data;
  const bd = b.data;

  const well = input.photoWell;
  const holes = input.exclude ?? [];
  const inside = (box: { x: number; y: number; w: number; h: number }, x: number, y: number) =>
    x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (holes.some((box) => inside(box, x, y))) continue;
      const i = (y * w + x) * 4;
      const residualR = (sd[i] ?? 0) - (bd[i] ?? 0);
      const residualG = (sd[i + 1] ?? 0) - (bd[i + 1] ?? 0);
      const residualB = (sd[i + 2] ?? 0) - (bd[i + 2] ?? 0);
      const amount = well && inside(well, x, y) ? 0.22 : 0.55;
      ed[i] = Math.max(0, Math.min(255, (ed[i] ?? 0) + residualR * amount));
      ed[i + 1] = Math.max(0, Math.min(255, (ed[i + 1] ?? 0) + residualG * amount));
      ed[i + 2] = Math.max(0, Math.min(255, (ed[i + 2] ?? 0) + residualB * amount));
    }
  }

  edited.putImageData(e, 0, 0);
  return input.edited;
}

export async function loadOriginalQldPlate(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load original QLD plate for grain"));
    img.src = "/documents/au/qld-licence.jpg";
  });
}

export function sourceExtent(src: CanvasImageSource) {
  return sourceSize(src);
}
