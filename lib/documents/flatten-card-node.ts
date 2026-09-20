import sharp from "sharp";
import { flattenCardRgba, flattenPresetFor, type FlattenPreset } from "@/lib/documents/flatten-card";

export async function flattenReferenceBuffer(
  buffer: Buffer,
  templateId: string,
  preset?: FlattenPreset
): Promise<Buffer> {
  const pipeline = sharp(buffer).ensureAlpha().rotate();
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  flattenCardRgba(data, info.width, info.height, {
    preset: preset ?? flattenPresetFor(templateId),
    strength: 0.88,
  });
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
