import {
  QLD_CRN_SLOTS,
  QLD_DATE_SLOTS,
  QLD_DOB_DAY_SLOTS,
  QLD_DOB_YEAR_SLOTS,
  QLD_GHOST_FACE,
  QLD_HEX_SLOTS,
  QLD_PHOTO_INNER,
  QLD_PLATE,
  QLD_VALUE_STRIPS,
  pickGlyph,
  type GlyphBox,
} from "@/lib/documents/qld-glyphs";
import type { ForgeIdentity } from "@/lib/documents/au-templates";
import { planQldPlate } from "@/lib/documents/qld-plan";
import { alignFaceToIdFrame } from "@/lib/face/align-id-face";
import { applyImperfectionLayer, loadOriginalQldPlate } from "@/lib/documents/imperfection";

export { planQldPlate, resolvePlateYear } from "@/lib/documents/qld-plan";

export interface SurgicalResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  note: string;
  yearFrom: string;
  yearTo: string;
}

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function sourceSize(photo: CanvasImageSource): { sw: number; sh: number } {
  const source = photo as CanvasImageSource & {
    width?: number;
    height?: number;
    naturalWidth?: number;
    naturalHeight?: number;
  };
  return {
    sw: source.naturalWidth || source.width || 1,
    sh: source.naturalHeight || source.height || 1,
  };
}

function ovalMask(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, feather: number) {
  const cx = x + w / 2;
  const cy = y + h * 0.46;
  const rx = w * 0.46;
  const ry = h * 0.5;
  const g = ctx.createRadialGradient(cx, cy, Math.max(2, Math.min(rx, ry) - feather), cx, cy, Math.max(rx, ry));
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function healGold(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, plate: HTMLCanvasElement) {
  const pad = 2;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const w = box.w + pad * 2;
  const h = box.h + pad * 2;
  const donorY = Math.max(0, y - Math.max(8, Math.round(h * 0.55)));
  ctx.save();
  ctx.filter = "blur(0.35px)";
  ctx.drawImage(plate, x, donorY, w, Math.max(6, Math.round(h * 0.45)), x, y, w, h);
  ctx.filter = "none";
  ctx.restore();
}

function cloneGlyph(
  ctx: CanvasRenderingContext2D,
  plate: HTMLCanvasElement,
  src: GlyphBox,
  dst: GlyphBox,
  prefer: "dob" | "crn" | "letter" | "hex" | "any" = "any"
) {
  const source = pickGlyph(src.ch, prefer) ?? src;
  healGold(ctx, dst, plate);
  const pad = 2;
  const sx = Math.max(0, source.x - pad);
  const sy = Math.max(0, source.y - pad);
  const sw = source.w + pad * 2;
  const sh = source.h + pad * 2;
  const off = document.createElement("canvas");
  off.width = sw;
  off.height = sh;
  const ox = off.getContext("2d");
  if (!ox) return;
  ox.drawImage(plate, sx, sy, sw, sh, 0, 0, sw, sh);
  const pix = ox.getImageData(0, 0, sw, sh);
  const data = pix.data;

  let inkR = 18;
  let inkG = 14;
  let inkB = 10;
  const dest = ctx.getImageData(Math.max(0, dst.x), Math.max(0, dst.y), Math.max(1, dst.w), Math.max(1, dst.h));
  let dR = 0;
  let dG = 0;
  let dB = 0;
  let dN = 0;
  for (let i = 0; i < dest.data.length; i += 4) {
    const L = luma(dest.data[i] ?? 0, dest.data[i + 1] ?? 0, dest.data[i + 2] ?? 0);
    if (L < 130) {
      dR += dest.data[i] ?? 0;
      dG += dest.data[i + 1] ?? 0;
      dB += dest.data[i + 2] ?? 0;
      dN += 1;
    }
  }
  if (dN > 4) {
    inkR = dR / dN;
    inkG = dG / dN;
    inkB = dB / dN;
  }

  for (let i = 0; i < data.length; i += 4) {
    const L = luma(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
    const a = L < 158 ? Math.round(Math.min(255, ((158 - L) / 158) * 255)) : 0;
    data[i] = inkR;
    data[i + 1] = inkG;
    data[i + 2] = inkB;
    data[i + 3] = a;
  }
  ox.putImageData(pix, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(off, dst.x - pad, dst.y - pad, dst.w + pad * 2, dst.h + pad * 2);
  ctx.restore();
}

function stampRun(
  ctx: CanvasRenderingContext2D,
  plate: HTMLCanvasElement,
  text: string,
  slots: readonly GlyphBox[],
  prefer: "dob" | "crn" | "letter" | "hex" | "any"
) {
  const chars = text.replace(/ /g, "");
  const n = Math.min(chars.length, slots.length);
  for (let i = 0; i < n; i += 1) {
    const dst = slots[i];
    if (!dst) continue;
    const ch = chars[i]!;
    if (ch === dst.ch) continue;
    const src = pickGlyph(ch, prefer);
    if (!src) continue;
    cloneGlyph(ctx, plate, { ...src, ch }, dst, prefer);
  }
}

function fitLetters(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z '\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
}

function stampName(
  ctx: CanvasRenderingContext2D,
  plate: HTMLCanvasElement,
  text: string,
  strip: { x: number; y: number; w: number; h: number }
) {
  const value = fitLetters(text);
  if (!value) return;
  healGold(ctx, strip, plate);
  let x = strip.x + 4;
  const y = strip.y + 2;
  const h = strip.h - 4;
  for (const ch of value) {
    if (ch === " ") {
      x += Math.round(h * 0.42);
      continue;
    }
    const src = pickGlyph(ch, "letter");
    if (!src) continue;
    const w = Math.max(8, Math.round((src.w / src.h) * h));
    cloneGlyph(ctx, plate, src, { ch, x, y, w, h }, "letter");
    x += w + 3;
    if (x > strip.x + strip.w - 8) break;
  }
}

function paintFaceIntoWell(
  ctx: CanvasRenderingContext2D,
  well: { x: number; y: number; w: number; h: number },
  face: CanvasImageSource,
  original: HTMLCanvasElement,
  mode: "portrait" | "ghost"
) {
  const { sw, sh } = sourceSize(face);
  const layer = document.createElement("canvas");
  layer.width = well.w;
  layer.height = well.h;
  const lx = layer.getContext("2d");
  if (!lx) return;
  const scale = Math.max(well.w / sw, well.h / sh) * (mode === "ghost" ? 1.02 : 1.08);
  const dw = sw * scale;
  const dh = sh * scale;
  lx.drawImage(face, (well.w - dw) / 2, (well.h - dh) / 2 - well.h * 0.04, dw, dh);

  if (mode === "ghost") {
    const pix = lx.getImageData(0, 0, well.w, well.h);
    const data = pix.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const a = data[i + 3] ?? 0;
      const L = luma(r, g, b);
      if (a < 16 || (L > 210 && Math.abs(r - g) < 16 && Math.abs(g - b) < 16)) {
        data[i + 3] = 0;
        continue;
      }
      const ink = L * 0.74 + 16;
      data[i] = Math.min(255, ink * 0.58);
      data[i + 1] = Math.min(255, ink * 0.44);
      data[i + 2] = Math.min(255, ink * 0.2);
      data[i + 3] = Math.round(Math.min(190, a * 0.72));
    }
    lx.putImageData(pix, 0, 0);
  }

  const masked = document.createElement("canvas");
  masked.width = well.w;
  masked.height = well.h;
  const mx = masked.getContext("2d");
  if (!mx) return;
  mx.drawImage(layer, 0, 0);
  mx.globalCompositeOperation = "destination-in";
  ovalMask(mx, 0, 0, well.w, well.h, mode === "ghost" ? 28 : 18);

  const orig = original.getContext("2d")?.getImageData(well.x, well.y, well.w, well.h);
  const facePix = mx.getImageData(0, 0, well.w, well.h);
  if (orig) {
    const f = facePix.data;
    const o = orig.data;
    for (let i = 0; i < f.length; i += 4) {
      const a = f[i + 3] ?? 0;
      if (a < 8) continue;
      const oL = luma(o[i] ?? 0, o[i + 1] ?? 0, o[i + 2] ?? 0) / 255;
      const lift = 0.78 + oL * 0.44;
      const keep = mode === "ghost" ? 0.22 : 0.1;
      f[i] = Math.round(Math.min(255, (f[i] ?? 0) * lift) * (1 - keep) + (o[i] ?? 0) * keep);
      f[i + 1] = Math.round(Math.min(255, (f[i + 1] ?? 0) * lift) * (1 - keep) + (o[i + 1] ?? 0) * keep);
      f[i + 2] = Math.round(Math.min(255, (f[i + 2] ?? 0) * lift) * (1 - keep) + (o[i + 2] ?? 0) * keep);
    }
    mx.putImageData(facePix, 0, 0);
  }

  ctx.save();
  if (mode === "ghost") {
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.7;
    ctx.drawImage(masked, well.x, well.y);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.18;
    ctx.drawImage(masked, well.x, well.y);
  } else {
    ctx.drawImage(masked, well.x, well.y);
  }
  ctx.restore();
}

export async function composeSurgicalQld(input: {
  photo?: CanvasImageSource | null;
  ghostPhoto?: CanvasImageSource | null;
  identity: ForgeIdentity;
}): Promise<SurgicalResult> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not load QLD plate"));
    el.src = "/documents/au/qld-licence.jpg";
  });

  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 826;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, 1280, 826);

  const plate = document.createElement("canvas");
  plate.width = 1280;
  plate.height = 826;
  plate.getContext("2d")?.drawImage(canvas, 0, 0);

  const plan = planQldPlate(input.identity);

  if (input.photo) {
    let portrait: CanvasImageSource = input.photo;
    let ghost: CanvasImageSource = input.ghostPhoto || input.photo;
    try {
      const aligned = await alignFaceToIdFrame(input.photo);
      portrait = aligned.canvas;
      if (!input.ghostPhoto) ghost = aligned.canvas;
    } catch {
      // keep the unaligned crop
    }
    paintFaceIntoWell(ctx, QLD_PHOTO_INNER, portrait, plate, "portrait");
    paintFaceIntoWell(ctx, QLD_GHOST_FACE, ghost, plate, "ghost");
    applyImperfectionLayer({
      edited: canvas,
      original: img,
      photoWell: QLD_PHOTO_INNER,
      exclude: Object.values(QLD_VALUE_STRIPS),
    });
  }

  if (plan.surname !== QLD_PLATE.surname) {
    stampName(ctx, plate, plan.surname, QLD_VALUE_STRIPS.surname);
  }
  if (plan.givenNames !== QLD_PLATE.givenNames) {
    stampName(ctx, plate, plan.givenNames, QLD_VALUE_STRIPS.givenNames);
  }
  stampRun(ctx, plate, plan.crn.replace(/\s/g, ""), QLD_CRN_SLOTS, "crn");
  stampRun(ctx, plate, plan.dobDay, QLD_DOB_DAY_SLOTS, "dob");
  stampRun(ctx, plate, plan.dobYear, QLD_DOB_YEAR_SLOTS, "dob");
  if (plan.cardClass !== QLD_PLATE.cardClass) {
    const src = pickGlyph(plan.cardClass[0] || "C", "letter");
    if (src) {
      cloneGlyph(ctx, plate, src, { ch: plan.cardClass[0] || "C", ...QLD_VALUE_STRIPS.cardClass }, "letter");
    }
  }
  if (plan.licenceType !== QLD_PLATE.licenceType) {
    const src = pickGlyph(plan.licenceType, "letter");
    if (src) {
      cloneGlyph(ctx, plate, src, { ch: plan.licenceType, ...QLD_VALUE_STRIPS.licenceType }, "letter");
    }
  }
  stampRun(ctx, plate, plan.effective, QLD_DATE_SLOTS.effective, "any");
  stampRun(ctx, plate, plan.expiry, QLD_DATE_SLOTS.expiry, "any");
  stampRun(ctx, plate, plan.effective, QLD_DATE_SLOTS.effective.map((s) => ({ ...s, y: s.y + 44 })), "any");
  stampRun(ctx, plate, plan.expiry, QLD_DATE_SLOTS.expiry.map((s) => ({ ...s, y: s.y + 44 })), "any");
  stampRun(ctx, plate, plan.cardNumber, QLD_HEX_SLOTS, "hex");

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => {
      if (!next) reject(new Error("Failed to encode plate"));
      else resolve(next);
    }, "image/png");
  });

  return {
    blob,
    dataUrl: canvas.toDataURL("image/png"),
    width: 1280,
    height: 826,
    note: plan.note,
    yearFrom: QLD_PLATE.dobYear,
    yearTo: plan.dobYear,
  };
}

function scaledStrips(width: number, height: number) {
  const sx = width / 1280;
  const sy = height / 826;
  return Object.values(QLD_VALUE_STRIPS).map((box) => ({
    x: Math.round(box.x * sx),
    y: Math.round(box.y * sy),
    w: Math.round(box.w * sx),
    h: Math.round(box.h * sy),
  }));
}

function scaleWell(
  well: { x: number; y: number; w: number; h: number },
  width: number,
  height: number
) {
  const sx = width / 1280;
  const sy = height / 826;
  return {
    x: Math.round(well.x * sx),
    y: Math.round(well.y * sy),
    w: Math.round(well.w * sx),
    h: Math.round(well.h * sy),
  };
}

/** Paste the aligned 2K selfie into an already-edited plate, then stamp plate grain. */
export async function pasteSelfieOntoQld(input: {
  plate: CanvasImageSource;
  photo: CanvasImageSource;
  ghostPhoto?: CanvasImageSource | null;
}): Promise<SurgicalResult> {
  const { sw, sh } = sourceSize(input.plate);
  const width = Math.max(1, sw);
  const height = Math.max(1, sh);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(input.plate, 0, 0, width, height);

  const copy = document.createElement("canvas");
  copy.width = width;
  copy.height = height;
  copy.getContext("2d")?.drawImage(canvas, 0, 0);

  let portrait: CanvasImageSource = input.photo;
  let ghost: CanvasImageSource = input.ghostPhoto || input.photo;
  try {
    const aligned = await alignFaceToIdFrame(input.photo);
    portrait = aligned.canvas;
    if (!input.ghostPhoto) ghost = aligned.canvas;
  } catch {
    // keep the unaligned crop
  }

  const well = scaleWell(QLD_PHOTO_INNER, width, height);
  paintFaceIntoWell(ctx, well, portrait, copy, "portrait");
  paintFaceIntoWell(ctx, scaleWell(QLD_GHOST_FACE, width, height), ghost, copy, "ghost");

  try {
    const stock = await loadOriginalQldPlate();
    applyImperfectionLayer({ edited: canvas, original: stock, photoWell: well, exclude: scaledStrips(width, height) });
  } catch {
    applyImperfectionLayer({ edited: canvas, original: copy, photoWell: well, exclude: scaledStrips(width, height) });
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => {
      if (!next) reject(new Error("Failed to paste selfie"));
      else resolve(next);
    }, "image/png");
  });

  return {
    blob,
    dataUrl: canvas.toDataURL("image/png"),
    width,
    height,
    note: "Aligned 2K selfie pasted. Plate grain/scratches stamped back. Text untouched.",
    yearFrom: QLD_PLATE.dobYear,
    yearTo: QLD_PLATE.dobYear,
  };
}
