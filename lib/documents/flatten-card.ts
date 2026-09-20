/**
 * Flatten a photographed card to an even stock plate.
 * Kills specular glare / blown highlights on the plastic before any new ink is applied.
 * Never touches dark printed labels or fine ink.
 */

export type FlattenPreset = "auto" | "gold" | "green" | "cream";

export interface FlattenOptions {
  preset?: FlattenPreset;
  strength?: number;
}

export interface FlattenResult {
  stock: [number, number, number];
  specularCount: number;
  stockPixels: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function satOf(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function hueOf(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 1) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function presetHue(preset: FlattenPreset): number | null {
  if (preset === "gold") return 46;
  if (preset === "green") return 88;
  if (preset === "cream") return 48;
  return null;
}

function sampleStock(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  channels: number,
  hintHue: number | null
): [number, number, number] {
  const acc = [0, 0, 0];
  let count = 0;
  const stepX = Math.max(1, Math.floor(width / 80));
  const stepY = Math.max(1, Math.floor(height / 50));
  for (let y = Math.floor(height * 0.12); y < height * 0.88; y += stepY) {
    for (let x = Math.floor(width * 0.12); x < width * 0.88; x += stepX) {
      const i = (y * width + x) * channels;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const L = luma(r, g, b);
      const s = satOf(r, g, b);
      if (L < 120 || L > 228) continue;
      if (s < 0.08) continue;
      if (hintHue != null && hueDist(hueOf(r, g, b), hintHue) > 38) continue;
      acc[0] += r;
      acc[1] += g;
      acc[2] += b;
      count += 1;
    }
  }
  if (count < 8) {
    if (hintHue === 88) return [154, 214, 86];
    if (hintHue === 48) return [244, 238, 222];
    return [230, 188, 52];
  }
  return [Math.round(acc[0] / count), Math.round(acc[1] / count), Math.round(acc[2] / count)];
}

function buildDetailMask(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  channels: number
): Uint8Array {
  const lumaAt = (x: number, y: number) => {
    const xx = x < 0 ? 0 : x >= width ? width - 1 : x;
    const yy = y < 0 ? 0 : y >= height ? height - 1 : y;
    const i = (yy * width + xx) * channels;
    return luma(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
  };
  const raw = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const c = lumaAt(x, y);
      const gx = Math.abs(lumaAt(x + 1, y) - lumaAt(x - 1, y));
      const gy = Math.abs(lumaAt(x, y + 1) - lumaAt(x, y - 1));
      const lap = Math.abs(4 * c - lumaAt(x - 1, y) - lumaAt(x + 1, y) - lumaAt(x, y - 1) - lumaAt(x, y + 1));
      raw[y * width + x] = gx + gy > 18 || lap > 16 ? 1 : 0;
    }
  }
  // Dilate so letter interiors (Driver Licence, AUSTRALIA) stay protected.
  const dilate = new Uint8Array(width * height);
  const r = 3;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let hit = 0;
      for (let oy = -r; oy <= r && !hit; oy += 1) {
        const yy = y + oy;
        if (yy < 0 || yy >= height) continue;
        for (let ox = -r; ox <= r; ox += 1) {
          const xx = x + ox;
          if (xx < 0 || xx >= width) continue;
          if (raw[yy * width + xx]) {
            hit = 1;
            break;
          }
        }
      }
      dilate[y * width + x] = hit;
    }
  }
  return dilate;
}

function buildIllumination(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  channels: number
): { grid: Float32Array; gw: number; gh: number } {
  const gw = Math.max(16, Math.round(width / 16));
  const gh = Math.max(10, Math.round(height / 16));
  const grid = new Float32Array(gw * gh);
  const counts = new Uint16Array(gw * gh);
  for (let y = 0; y < height; y += 2) {
    const gy = Math.min(gh - 1, Math.floor((y / height) * gh));
    for (let x = 0; x < width; x += 2) {
      const gx = Math.min(gw - 1, Math.floor((x / width) * gw));
      const i = (y * width + x) * channels;
      const idx = gy * gw + gx;
      grid[idx] += luma(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      counts[idx] += 1;
    }
  }
  for (let i = 0; i < grid.length; i += 1) {
    grid[i] = counts[i] ? grid[i] / counts[i] : 160;
  }
  const blurred = new Float32Array(grid.length);
  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      let sum = 0;
      let n = 0;
      for (let oy = -2; oy <= 2; oy += 1) {
        for (let ox = -2; ox <= 2; ox += 1) {
          const xx = x + ox;
          const yy = y + oy;
          if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
          sum += grid[yy * gw + xx] ?? 160;
          n += 1;
        }
      }
      blurred[y * gw + x] = n ? sum / n : 160;
    }
  }
  return { grid: blurred, gw, gh };
}

function sampleGrid(grid: Float32Array, gw: number, gh: number, x: number, y: number, width: number, height: number): number {
  const fx = ((x + 0.5) / width) * (gw - 1);
  const fy = ((y + 0.5) / height) * (gh - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(gw - 1, x0 + 1);
  const y1 = Math.min(gh - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const a = grid[y0 * gw + x0] ?? 160;
  const b = grid[y0 * gw + x1] ?? 160;
  const c = grid[y1 * gw + x0] ?? 160;
  const d = grid[y1 * gw + x1] ?? 160;
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}

/**
 * In-place flatten of an RGBA/RGB buffer. Ink (labels, MRZ, signature) is preserved.
 */
export function flattenCardRgba(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options: FlattenOptions = {}
): FlattenResult {
  const channels = data.length >= width * height * 4 ? 4 : 3;
  const preset = options.preset ?? "auto";
  const strength = options.strength ?? 0.86;
  const hintHue = presetHue(preset);
  const stock = sampleStock(data, width, height, channels, hintHue);
  const stockL = luma(stock[0], stock[1], stock[2]);
  const stockHue = hueOf(stock[0], stock[1], stock[2]);
  const { grid, gw, gh } = buildIllumination(data, width, height, channels);
  const detail = buildDetailMask(data, width, height, channels);

  let specularCount = 0;
  let stockPixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const L = luma(r, g, b);
      const s = satOf(r, g, b);
      const h = hueOf(r, g, b);

      // Dark ink, granite, hair, MRZ, and any printed glyph — never touch.
      if (L < 92) continue;
      if (detail[y * width + x]) continue;

      const nearStock = hueDist(h, stockHue) < 42 && s > 0.1;
      const blown = L > 226 && s < 0.28;
      const hot = L > 205 && s < 0.38 && (nearStock || hueDist(h, stockHue) < 70);
      const creamBlow = preset === "cream" && L > 242 && s < 0.12;

      if (blown || hot || creamBlow) {
        const glare = clamp((L - Math.max(stockL, 170)) / 70, 0, 1);
        const mix = Math.min(1, strength * (0.48 + glare * 0.42));
        data[i] = Math.round(r * (1 - mix) + stock[0] * mix);
        data[i + 1] = Math.round(g * (1 - mix) + stock[1] * mix);
        data[i + 2] = Math.round(b * (1 - mix) + stock[2] * mix);
        specularCount += 1;
        continue;
      }

      if (!nearStock) continue;
      if (L < 118) continue;

      stockPixels += 1;
      const illum = sampleGrid(grid, gw, gh, x, y, width, height);
      const scale = stockL / Math.max(96, illum);
      const pulled = clamp(scale, 0.78, 1.14);
      const t = strength * 0.62;
      const nr = clamp(r * (1 - t) + r * pulled * t, 0, 255);
      const ng = clamp(g * (1 - t) + g * pulled * t, 0, 255);
      const nb = clamp(b * (1 - t) + b * pulled * t, 0, 255);
      const tint = strength * 0.16 * clamp((L - stockL) / 50, 0, 1);
      data[i] = Math.round(nr * (1 - tint) + stock[0] * tint);
      data[i + 1] = Math.round(ng * (1 - tint) + stock[1] * tint);
      data[i + 2] = Math.round(nb * (1 - tint) + stock[2] * tint);
    }
  }

  return { stock, specularCount, stockPixels };
}

export function flattenPresetFor(templateId: string): FlattenPreset {
  if (templateId === "qld-licence" || templateId === "vic-licence") return "gold";
  if (templateId === "medicare") return "green";
  if (templateId === "au-passport") return "cream";
  return "auto";
}
