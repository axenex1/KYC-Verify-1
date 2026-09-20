import type { CoverRect, ForgeTemplateId } from "@/lib/documents/au-templates";

export interface LockedLabelBox {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Printed chrome that must survive every generate/compose pass. Values sit beside these, never on them. */
export const LOCKED_LABELS: Record<ForgeTemplateId, string[]> = {
  "qld-licence": [
    "Driver Licence",
    "LICENCE NO. / CRN",
    "DOB",
    "Class",
    "Type",
    "Effective",
    "Expiry",
    "Conditions",
    "Card number",
    "Queensland Government",
    "Queensland, Australia",
    "AUSTRALIA",
  ],
  medicare: ["medicare", "VALID TO", "40 YEAR ANNIVERSARY"],
  "au-passport": [
    "PASSPORT",
    "AUSTRALIA",
    "Type / Type",
    "Code of issuing",
    "DOCUMENT No.",
    "Name / Nom",
    "Nationality / Nationalité",
    "Date of birth / Date de naissance",
    "Sex / Sexe",
    "Date of issue / Date de délivrance",
    "Date of expiry / Date d'expiration",
    "Authority / Autorité",
    "Place of birth / Lieu de naissance",
    "Holder's signature / Signature du titulaire",
  ],
  "vic-licence": ["Driver licence", "Licence No", "DOB", "Expiry", "Class"],
  "nsw-licence": ["Driver licence", "Licence No", "DOB", "Expiry", "Class"],
};

/**
 * Pixel boxes for the real photo plates (QLD 1280×826, Medicare 1280×766, passport 912×639).
 * Covers and stamped values must not intersect these.
 */
export const LOCKED_LABEL_BOXES: Record<ForgeTemplateId, LockedLabelBox[]> = {
  "qld-licence": [
    { text: "Driver Licence", x: 70, y: 36, w: 360, h: 72 },
    { text: "LICENCE NO. / CRN", x: 918, y: 42, w: 290, h: 32 },
    { text: "DOB", x: 416, y: 264, w: 56, h: 28 },
    { text: "Class", x: 374, y: 348, w: 64, h: 28 },
    { text: "Type", x: 444, y: 348, w: 56, h: 28 },
    { text: "Effective", x: 534, y: 346, w: 98, h: 30 },
    { text: "Expiry", x: 658, y: 346, w: 74, h: 30 },
    { text: "Conditions", x: 298, y: 548, w: 170, h: 32 },
    { text: "Card number", x: 522, y: 722, w: 144, h: 28 },
    { text: "Queensland, Australia", x: 70, y: 760, w: 260, h: 36 },
    { text: "Queensland Government", x: 980, y: 680, w: 240, h: 90 },
  ],
  medicare: [
    { text: "40 YEAR ANNIVERSARY", x: 40, y: 20, w: 280, h: 90 },
    { text: "medicare", x: 900, y: 24, w: 320, h: 80 },
    { text: "VALID TO", x: 680, y: 640, w: 170, h: 50 },
  ],
  "au-passport": [
    { text: "PASSPORT", x: 24, y: 18, w: 160, h: 28 },
    { text: "AUSTRALIA", x: 300, y: 12, w: 180, h: 28 },
    { text: "DOCUMENT No.", x: 640, y: 16, w: 160, h: 22 },
    { text: "Type / Type", x: 258, y: 42, w: 90, h: 18 },
    { text: "Name / Nom", x: 258, y: 96, w: 90, h: 16 },
    { text: "Nationality / Nationalité", x: 258, y: 198, w: 200, h: 16 },
    { text: "Date of birth / Date de naissance", x: 258, y: 256, w: 240, h: 16 },
    { text: "Sex / Sexe", x: 258, y: 314, w: 90, h: 16 },
    { text: "Date of expiry / Date d'expiration", x: 258, y: 414, w: 240, h: 16 },
    { text: "Place of birth / Lieu de naissance", x: 560, y: 250, w: 240, h: 16 },
  ],
  "vic-licence": [],
  "nsw-licence": [],
};

export function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  );
}

export function coversHittingLockedLabels(
  templateId: ForgeTemplateId,
  covers: CoverRect[]
): { cover: CoverRect; label: LockedLabelBox }[] {
  const hits: { cover: CoverRect; label: LockedLabelBox }[] = [];
  const labels = LOCKED_LABEL_BOXES[templateId] ?? [];
  for (const cover of covers) {
    for (const label of labels) {
      if (rectsOverlap(cover, label)) hits.push({ cover, label });
    }
  }
  return hits;
}

export function layoutLockPreamble(templateId: ForgeTemplateId): string {
  const labels = LOCKED_LABELS[templateId];
  return [
    "This is a VALUE REPLACEMENT on the real card in reference image 1, not a redesign.",
    "Copy reference 1's physical card pixel-for-pixel: stock colour, microprint, holograms, crests, rounded corners, grain, and every printed label.",
    "Do not change any text size. Do not rearrange any text. Do not restyle any font.",
    `FROZEN LABELS — leave these glyphs exactly where they are, same font, same size, same weight, same colour. Never delete, rewrite, or move them: ${labels.join(", ")}.`,
    "Only replace the changeable driver/holder values listed below. Each new value must sit on the original value's baseline and use the original value's type size.",
  ].join(" ");
}
