/** Printed QLD plate (public/documents/au/qld-licence.jpg @ 1280×826). */

export interface GlyphBox {
  ch: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const QLD_PLATE = {
  surname: "GOYENECHE",
  givenNames: "ELIZABETH REBECA",
  crn: "069 507 828",
  dob: "05 Feb 1981",
  dobYear: "1981",
  cardClass: "C",
  licenceType: "O",
  effective: "18.07.22",
  expiry: "17.07.27",
  cardNumber: "E6D6BA1F57",
} as const;

export const QLD_PHOTO_INNER = { x: 920, y: 254, w: 282, h: 368 };
export const QLD_GHOST_FACE = { x: 110, y: 510, w: 172, h: 214 };

/** Destination strips for red-highlighted VALUES only. Labels sit outside these. */
export const QLD_VALUE_STRIPS = {
  surname: { x: 150, y: 124, w: 300, h: 46 },
  givenNames: { x: 140, y: 174, w: 420, h: 36 },
  crn: { x: 974, y: 94, w: 274, h: 42 },
  dob: { x: 486, y: 248, w: 268, h: 50 },
  cardClass: { x: 396, y: 378, w: 32, h: 52 },
  licenceType: { x: 486, y: 376, w: 36, h: 54 },
  effective: { x: 582, y: 384, w: 158, h: 46 },
  expiry: { x: 748, y: 384, w: 156, h: 46 },
  effective2: { x: 582, y: 430, w: 158, h: 46 },
  expiry2: { x: 748, y: 430, w: 156, h: 46 },
  cardNumber: { x: 582, y: 750, w: 180, h: 42 },
} as const;

export const QLD_CRN_GLYPHS: GlyphBox[] = [
  { ch: "0", x: 978, y: 97, w: 22, h: 36 },
  { ch: "6", x: 1004, y: 97, w: 22, h: 36 },
  { ch: "9", x: 1031, y: 97, w: 22, h: 36 },
  { ch: "5", x: 1073, y: 97, w: 22, h: 36 },
  { ch: "0", x: 1099, y: 97, w: 22, h: 36 },
  { ch: "7", x: 1126, y: 97, w: 22, h: 36 },
  { ch: "8", x: 1168, y: 96, w: 22, h: 36 },
  { ch: "2", x: 1195, y: 96, w: 22, h: 36 },
  { ch: "8", x: 1221, y: 96, w: 22, h: 36 },
];

export const QLD_CRN_SLOTS: GlyphBox[] = QLD_CRN_GLYPHS.map((g) => ({ ...g }));

export const QLD_DOB_YEAR_SLOTS: GlyphBox[] = [
  { ch: "1", x: 656, y: 254, w: 14, h: 34 },
  { ch: "9", x: 679, y: 250, w: 22, h: 38 },
  { ch: "8", x: 704, y: 254, w: 22, h: 33 },
  { ch: "1", x: 734, y: 254, w: 13, h: 33 },
];

export const QLD_DOB_DAY_SLOTS: GlyphBox[] = [
  { ch: "0", x: 489, y: 254, w: 23, h: 36 },
  { ch: "5", x: 516, y: 253, w: 22, h: 36 },
];

export const QLD_LETTER_GLYPHS: GlyphBox[] = [
  { ch: "E", x: 141, y: 175, w: 21, h: 26 },
  { ch: "L", x: 169, y: 175, w: 18, h: 26 },
  { ch: "I", x: 192, y: 175, w: 6, h: 26 },
  { ch: "Z", x: 200, y: 175, w: 24, h: 26 },
  { ch: "A", x: 227, y: 175, w: 25, h: 26 },
  { ch: "B", x: 259, y: 175, w: 21, h: 26 },
  { ch: "E", x: 287, y: 175, w: 21, h: 26 },
  { ch: "T", x: 318, y: 175, w: 16, h: 26 },
  { ch: "H", x: 342, y: 175, w: 23, h: 26 },
  { ch: "R", x: 384, y: 175, w: 23, h: 25 },
  { ch: "E", x: 415, y: 175, w: 20, h: 25 },
  { ch: "B", x: 442, y: 175, w: 22, h: 25 },
  { ch: "E", x: 470, y: 175, w: 21, h: 25 },
  { ch: "C", x: 497, y: 175, w: 24, h: 25 },
  { ch: "A", x: 525, y: 175, w: 24, h: 25 },
  { ch: "G", x: 156, y: 128, w: 22, h: 36 },
  { ch: "O", x: 182, y: 128, w: 22, h: 36 },
  { ch: "Y", x: 208, y: 128, w: 20, h: 36 },
  { ch: "N", x: 254, y: 128, w: 22, h: 36 },
  { ch: "C", x: 399, y: 381, w: 26, h: 48 },
  { ch: "O", x: 489, y: 378, w: 30, h: 51 },
  { ch: "F", x: 558, y: 255, w: 22, h: 34 },
];

export const QLD_HEX_GLYPHS: GlyphBox[] = [
  { ch: "E", x: 585, y: 754, w: 16, h: 36 },
  { ch: "6", x: 602, y: 754, w: 16, h: 36 },
  { ch: "D", x: 619, y: 754, w: 16, h: 36 },
  { ch: "6", x: 636, y: 754, w: 16, h: 36 },
  { ch: "B", x: 653, y: 754, w: 16, h: 36 },
  { ch: "A", x: 670, y: 754, w: 16, h: 36 },
  { ch: "1", x: 687, y: 754, w: 14, h: 36 },
  { ch: "F", x: 704, y: 754, w: 16, h: 36 },
  { ch: "5", x: 721, y: 754, w: 16, h: 36 },
  { ch: "7", x: 738, y: 754, w: 16, h: 36 },
];

export const QLD_HEX_SLOTS: GlyphBox[] = QLD_HEX_GLYPHS.map((g) => ({ ...g }));

export const QLD_DATE_SLOTS = {
  effective: [
    { ch: "1", x: 586, y: 388, w: 13, h: 40 },
    { ch: "8", x: 605, y: 388, w: 19, h: 40 },
    { ch: "0", x: 639, y: 388, w: 19, h: 40 },
    { ch: "7", x: 662, y: 388, w: 17, h: 40 },
    { ch: "2", x: 695, y: 388, w: 19, h: 40 },
    { ch: "2", x: 718, y: 388, w: 18, h: 40 },
  ],
  expiry: [
    { ch: "1", x: 756, y: 388, w: 10, h: 42 },
    { ch: "7", x: 773, y: 388, w: 13, h: 42 },
    { ch: "0", x: 803, y: 388, w: 18, h: 42 },
    { ch: "7", x: 828, y: 388, w: 13, h: 42 },
    { ch: "2", x: 860, y: 388, w: 16, h: 42 },
    { ch: "7", x: 882, y: 388, w: 13, h: 42 },
  ],
} as const;

export const QLD_AVAILABLE_DIGITS = "01256789";
export const QLD_AVAILABLE_LETTERS = "ABCEFGHILNORTUYZab";
export const QLD_AVAILABLE_HEX = "16ABDEF";

export function pickGlyph(ch: string, prefer: "dob" | "crn" | "letter" | "hex" | "any" = "any"): GlyphBox | null {
  const up = ch.toUpperCase();
  if (prefer === "dob" || prefer === "any") {
    const y = QLD_DOB_YEAR_SLOTS.find((g) => g.ch === ch);
    if (y) return y;
    const d = QLD_DOB_DAY_SLOTS.find((g) => g.ch === ch);
    if (d) return d;
  }
  if (prefer === "hex" || (prefer === "any" && /[A-F]/.test(up))) {
    const h = QLD_HEX_GLYPHS.find((g) => g.ch === up);
    if (h) return h;
  }
  if (prefer === "letter" || /[A-Za-z]/.test(ch)) {
    const L = QLD_LETTER_GLYPHS.find((g) => g.ch === up);
    if (L) return L;
  }
  return QLD_CRN_GLYPHS.find((g) => g.ch === ch) ?? QLD_HEX_GLYPHS.find((g) => g.ch === up) ?? null;
}

export function fitDigits(raw: string, length: number): string {
  let out = "";
  for (const c of raw.replace(/\D/g, "")) {
    if (QLD_AVAILABLE_DIGITS.includes(c)) out += c;
    else if (c === "3") out += "2";
    else if (c === "4") out += "5";
  }
  while (out.length < length) out += QLD_AVAILABLE_DIGITS[out.length % QLD_AVAILABLE_DIGITS.length];
  return out.slice(0, length);
}

export function fitYearToPlate(year: number, from = QLD_PLATE.dobYear): string {
  return fitDigits(String(Math.max(1920, Math.min(2010, Math.round(year)))), 4) || from;
}

export function defaultYearShift(from = QLD_PLATE.dobYear): string {
  return fitYearToPlate(Number(from.slice(0, 3) + "8"), from);
}

export function fitLetters(value: string): string {
  return value
    .toUpperCase()
    .split("")
    .map((c) => {
      if (c === " " || c === "-") return c;
      if (QLD_AVAILABLE_LETTERS.includes(c)) return c;
      if (c === "D") return "B";
      if (c === "J") return "I";
      if (c === "K") return "H";
      if (c === "M") return "N";
      if (c === "P") return "R";
      if (c === "Q") return "O";
      if (c === "S") return "E";
      if (c === "V") return "Y";
      if (c === "W") return "N";
      if (c === "X") return "Y";
      return "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function fitHex(raw: string): string {
  let out = "";
  for (const c of raw.toUpperCase().replace(/[^0-9A-F]/g, "")) {
    if (QLD_AVAILABLE_HEX.includes(c) || QLD_AVAILABLE_DIGITS.includes(c)) out += c;
    else if (c === "0") out += "6";
    else if (c === "2") out += "1";
    else if (c === "3" || c === "8" || c === "9") out += "5";
    else if (c === "4") out += "A";
    else if (c === "C") out += "B";
  }
  while (out.length < 10) out += QLD_AVAILABLE_HEX[out.length % QLD_AVAILABLE_HEX.length];
  return out.slice(0, 10);
}

export const QLD_SAFE_SURNAMES = ["CHEN", "HALL", "RYAN", "BELL", "CORAL", "BLAIR", "REILLY", "GRANT"];
export const QLD_SAFE_GIVENS = ["NICOLE", "CHLOE", "GRETA", "HOLLY", "CLAIRE", "THEA", "NOAH", "HARLEY", "ELIZA BETH"];
