import {
  AU_TEMPLATE_SPECS,
  fieldValue,
  type ForgeIdentity,
  type ForgeTemplateId,
  type PhotoSlot,
} from "@/lib/documents/au-templates";
import { composeSurgicalQld } from "@/lib/documents/surgical-edit";

export {
  AU_TEMPLATE_SPECS,
  DEFAULT_FORGE_IDENTITY,
  FORGE_TEMPLATES,
  defaultAddressFor,
  defaultNumberFor,
  type ForgeIdentity,
  type ForgeTemplateId,
} from "@/lib/documents/au-templates";

export function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load reference ${src}`));
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
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

function drawCoverPhoto(ctx: CanvasRenderingContext2D, photo: CanvasImageSource, slot: PhotoSlot) {
  ctx.save();
  roundedRect(ctx, slot.x, slot.y, slot.w, slot.h, slot.radius ?? 2);
  ctx.clip();
  const { sw, sh } = sourceSize(photo);
  const scale = Math.max(slot.w / sw, slot.h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(photo, slot.x + (slot.w - dw) / 2, slot.y + (slot.h - dh) / 2, dw, dh);
  ctx.restore();
}

export async function composeForgedDocument(input: {
  templateId: ForgeTemplateId;
  photo?: CanvasImageSource | null;
  ghostPhoto?: CanvasImageSource | null;
  identity: ForgeIdentity;
}): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; referencePath: string; note?: string }> {
  if (input.templateId === "qld-licence") {
    const surgical = await composeSurgicalQld(input);
    return {
      blob: surgical.blob,
      dataUrl: surgical.dataUrl,
      width: surgical.width,
      height: surgical.height,
      referencePath: "/documents/au/qld-licence.jpg",
      note: surgical.note,
    };
  }

  const spec = AU_TEMPLATE_SPECS[input.templateId];
  if (!spec) throw new Error("Unknown Australian template");

  const reference = await loadImageFromUrl(spec.referencePath);
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(reference, 0, 0, spec.width, spec.height);

  if (input.photo && spec.photo) {
    drawCoverPhoto(ctx, input.photo, spec.photo);
  }
  if (input.photo && spec.ghost) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    drawCoverPhoto(ctx, input.ghostPhoto || input.photo, spec.ghost);
    ctx.restore();
  }

  for (const field of spec.fields) {
    const value = fieldValue(field, input.identity);
    if (!value) continue;
    const family =
      field.font === "mono"
        ? "ui-monospace, SFMono-Regular, Menlo, monospace"
        : "ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = field.color;
    ctx.font = `${field.weight ?? 600} ${field.size}px ${family}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(value, field.x, field.y);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => {
      if (!next) reject(new Error("Failed to encode document"));
      else resolve(next);
    }, "image/png");
  });

  return {
    blob,
    dataUrl: canvas.toDataURL("image/png"),
    width: spec.width,
    height: spec.height,
    referencePath: spec.referencePath,
  };
}
