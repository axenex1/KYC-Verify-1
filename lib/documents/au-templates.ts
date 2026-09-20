export type ForgeTemplateId =
  | "qld-licence"
  | "vic-licence"
  | "nsw-licence"
  | "au-passport"
  | "medicare";

export interface ForgeIdentity {
  givenNames: string;
  surname: string;
  address: string;
  dob: string;
  expiry: string;
  documentNumber: string;
  sex: string;
  cardClass: string;
  placeOfBirth?: string;
  licenceType?: string;
  effective?: string;
  conditions?: string;
  cardNumber?: string;
}

export interface FieldSlot {
  key:
    | keyof ForgeIdentity
    | "nationality"
    | "mrz1"
    | "mrz2"
    | "irn"
    | "medicareName"
    | "qldDob"
    | "qldExpiry"
    | "qldEffective"
    | "qldCrn"
    | "surnameUpper"
    | "givenUpper";
  x: number;
  y: number;
  size: number;
  color: string;
  weight?: number;
  font?: "sans" | "mono";
  maxWidth?: number;
}

export interface PhotoSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  style?: "portrait" | "ghost";
}

export interface CoverRect {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface AuTemplateSpec {
  id: ForgeTemplateId;
  label: string;
  jurisdiction: string;
  width: number;
  height: number;
  referencePath: string;
  photo?: PhotoSlot;
  ghost?: PhotoSlot;
  covers: CoverRect[];
  fields: FieldSlot[];
}

export const AU_TEMPLATE_SPECS: Record<ForgeTemplateId, AuTemplateSpec> = {
  "qld-licence": {
    id: "qld-licence",
    label: "QLD licence",
    jurisdiction: "Queensland",
    width: 1280,
    height: 826,
    referencePath: "/documents/au/qld-licence.jpg",
    photo: { x: 912, y: 246, w: 298, h: 384, radius: 2, style: "portrait" },
    ghost: { x: 102, y: 498, w: 196, h: 246, radius: 8, style: "ghost" },
    covers: [
      { x: 910, y: 244, w: 302, h: 388, color: "#F0F2F4" },
      { x: 96, y: 128, w: 520, h: 92, color: "#E8C034" },
      { x: 930, y: 104, w: 280, h: 40, color: "#E8C034" },
      { x: 476, y: 258, w: 176, h: 36, color: "#E8C034" },
      { x: 376, y: 378, w: 380, h: 76, color: "#E8C034" },
      { x: 524, y: 752, w: 160, h: 28, color: "#E8C034" },
    ],
    fields: [
      { key: "surnameUpper", x: 156, y: 154, size: 26, color: "#111111", weight: 700 },
      { key: "givenUpper", x: 156, y: 204, size: 22, color: "#111111", weight: 600 },
      { key: "qldCrn", x: 948, y: 136, size: 26, color: "#111111", weight: 700 },
      { key: "qldDob", x: 478, y: 286, size: 24, color: "#111111", weight: 700 },
      { key: "cardClass", x: 380, y: 408, size: 24, color: "#111111", weight: 700 },
      { key: "licenceType", x: 450, y: 408, size: 24, color: "#111111", weight: 700 },
      { key: "qldEffective", x: 538, y: 408, size: 22, color: "#111111", weight: 700 },
      { key: "qldExpiry", x: 658, y: 408, size: 22, color: "#111111", weight: 700 },
      { key: "cardNumber", x: 528, y: 776, size: 18, color: "#111111", weight: 700, font: "mono" },
    ],
  },
  "vic-licence": {
    id: "vic-licence",
    label: "VIC licence",
    jurisdiction: "Victoria",
    width: 856,
    height: 540,
    referencePath: "/documents/au/vic-licence.svg",
    photo: { x: 36, y: 92, w: 196, h: 248, radius: 6, style: "portrait" },
    ghost: { x: 690, y: 292, w: 118, h: 148, radius: 4, style: "ghost" },
    covers: [],
    fields: [
      { key: "surname", x: 256, y: 128, size: 28, color: "#10231b", weight: 700 },
      { key: "givenNames", x: 256, y: 196, size: 22, color: "#10231b", weight: 600 },
      { key: "address", x: 256, y: 268, size: 16, color: "#1f3a2e", maxWidth: 400 },
      { key: "documentNumber", x: 36, y: 392, size: 22, color: "#10231b", weight: 700, font: "mono" },
      { key: "dob", x: 292, y: 392, size: 20, color: "#10231b" },
      { key: "expiry", x: 508, y: 392, size: 20, color: "#10231b" },
      { key: "cardClass", x: 724, y: 392, size: 22, color: "#10231b", weight: 700 },
    ],
  },
  "nsw-licence": {
    id: "nsw-licence",
    label: "NSW licence",
    jurisdiction: "New South Wales",
    width: 856,
    height: 540,
    referencePath: "/documents/au/nsw-licence.svg",
    photo: { x: 36, y: 92, w: 196, h: 248, radius: 6, style: "portrait" },
    ghost: { x: 690, y: 292, w: 118, h: 148, radius: 4, style: "ghost" },
    covers: [],
    fields: [
      { key: "surname", x: 256, y: 128, size: 28, color: "#2a0714", weight: 700 },
      { key: "givenNames", x: 256, y: 196, size: 22, color: "#2a0714", weight: 600 },
      { key: "address", x: 256, y: 268, size: 16, color: "#4a1528", maxWidth: 400 },
      { key: "documentNumber", x: 36, y: 392, size: 22, color: "#2a0714", weight: 700, font: "mono" },
      { key: "dob", x: 292, y: 392, size: 20, color: "#2a0714" },
      { key: "expiry", x: 508, y: 392, size: 20, color: "#2a0714" },
      { key: "cardClass", x: 724, y: 392, size: 22, color: "#2a0714", weight: 700 },
    ],
  },
  "au-passport": {
    id: "au-passport",
    label: "AU passport",
    jurisdiction: "Commonwealth",
    width: 912,
    height: 639,
    referencePath: "/documents/au/au-passport.jpg",
    photo: { x: 20, y: 132, w: 228, h: 298, radius: 6, style: "portrait" },
    covers: [
      { x: 16, y: 126, w: 238, h: 312, color: "#efe6d4" },
      { x: 258, y: 124, w: 360, h: 68, color: "#f6f1e6" },
      { x: 258, y: 218, w: 300, h: 36, color: "#f4efe3" },
      { x: 258, y: 276, w: 300, h: 36, color: "#f3eee2" },
      { x: 258, y: 334, w: 80, h: 32, color: "#f3eee2" },
      { x: 258, y: 388, w: 300, h: 22, color: "#f2ecdf" },
      { x: 258, y: 436, w: 300, h: 30, color: "#f2ecdf" },
      { x: 650, y: 48, w: 240, h: 40, color: "#f7f3ea" },
      { x: 572, y: 286, w: 260, h: 48, color: "#f4efe4" },
      { x: 12, y: 526, w: 888, h: 92, color: "#f7f4ec" },
    ],
    fields: [
      { key: "surname", x: 268, y: 148, size: 22, color: "#111111", weight: 700 },
      { key: "givenNames", x: 268, y: 186, size: 20, color: "#111111", weight: 700 },
      { key: "nationality", x: 268, y: 246, size: 18, color: "#111111", weight: 700 },
      { key: "dob", x: 268, y: 306, size: 18, color: "#111111", weight: 700 },
      { key: "sex", x: 268, y: 356, size: 18, color: "#111111", weight: 700 },
      { key: "expiry", x: 268, y: 456, size: 18, color: "#111111", weight: 700 },
      { key: "documentNumber", x: 668, y: 78, size: 20, color: "#111111", weight: 700, font: "mono" },
      { key: "mrz1", x: 22, y: 556, size: 16, color: "#111111", font: "mono" },
      { key: "mrz2", x: 22, y: 592, size: 16, color: "#111111", font: "mono" },
    ],
  },
  medicare: {
    id: "medicare",
    label: "Medicare",
    jurisdiction: "Commonwealth",
    width: 1280,
    height: 766,
    referencePath: "/documents/au/medicare.jpg",
    covers: [
      { x: 170, y: 238, w: 820, h: 110, color: "#8fd95a" },
      { x: 70, y: 360, w: 980, h: 86, color: "#8ad456" },
      { x: 860, y: 648, w: 280, h: 56, color: "#86d054" },
    ],
    fields: [
      { key: "documentNumber", x: 250, y: 318, size: 46, color: "#1a1a1a", weight: 700 },
      { key: "medicareName", x: 130, y: 418, size: 28, color: "#1a1a1a", weight: 700 },
      { key: "expiry", x: 860, y: 688, size: 26, color: "#1a1a1a", weight: 700 },
    ],
  },
};

export const FORGE_TEMPLATES = [
  AU_TEMPLATE_SPECS["qld-licence"],
  AU_TEMPLATE_SPECS.medicare,
  AU_TEMPLATE_SPECS["au-passport"],
  AU_TEMPLATE_SPECS["vic-licence"],
  AU_TEMPLATE_SPECS["nsw-licence"],
];

export const DEFAULT_FORGE_IDENTITY: ForgeIdentity = {
  givenNames: "",
  surname: "",
  address: "",
  dob: "",
  expiry: "",
  documentNumber: "",
  sex: "",
  cardClass: "",
  placeOfBirth: "",
  licenceType: "",
  effective: "",
  conditions: "",
  cardNumber: "",
};

export function defaultNumberFor(templateId: ForgeTemplateId): string {
  switch (templateId) {
    case "qld-licence":
      return "069 507 828";
    case "nsw-licence":
      return "18472639";
    case "au-passport":
      return "PA8392614";
    case "medicare":
      return "4262 22141 8";
    default:
      return "084219673";
  }
}

export function defaultAddressFor(templateId: ForgeTemplateId): string {
  switch (templateId) {
    case "qld-licence":
      return "8 Suffolk Street, Caboolture South QLD 4510";
    case "nsw-licence":
      return "88 George Street, Sydney NSW 2000";
    case "au-passport":
      return "Canberra ACT 2600";
    case "medicare":
      return "Services Australia";
    default:
      return "14 Flinders Lane, Melbourne VIC 3000";
  }
}

function mrzSanitize(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9<]/g, "")
    .replace(/\s+/g, "<");
}

export function buildPassportMrz(identity: ForgeIdentity): { mrz1: string; mrz2: string } {
  const surname = mrzSanitize(identity.surname);
  const given = mrzSanitize(identity.givenNames.replace(/\s+/g, "<"));
  const line1 = `P<AUS${surname}<<${given}`.padEnd(44, "<").slice(0, 44);
  const number = mrzSanitize(identity.documentNumber).padEnd(9, "<").slice(0, 9);
  const dob = identity.dob.replace(/\D/g, "");
  const exp = identity.expiry.replace(/\D/g, "");
  const yyMmDd = (raw: string) => {
    if (raw.length === 8) return raw.slice(6, 8) + raw.slice(2, 4) + raw.slice(0, 2);
    return raw.slice(0, 6).padEnd(6, "0");
  };
  const line2 = `${number}4AUS${yyMmDd(dob)}${identity.sex || "M"}${yyMmDd(exp)}<<<<<<<<<<<<<<`.padEnd(44, "<").slice(0, 44);
  return { mrz1: line1, mrz2: line2 };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatQldDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    const day = digits.slice(0, 2);
    const month = Number(digits.slice(2, 4));
    const year = digits.slice(4, 8);
    return `${day} ${MONTHS[Math.max(0, month - 1)] ?? "Jan"} ${year}`;
  }
  return value;
}

export function formatQldDotDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(6, 8)}`;
  }
  if (digits.length === 6) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 6)}`;
  }
  const named = value.match(/^(\d{1,2})\s+[A-Za-z]{3}\s+(\d{4})$/);
  if (named) return formatQldDotDate(value.replace(/[A-Za-z]/g, "").trim());
  return value;
}

export function formatQldCrn(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9).padStart(9, "0");
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

/** QLD card number: 10 uppercase hex, no spaces — same glyph run as E6D6BA1F57. */
export function formatQldCardNumber(value: string): string {
  const hex = value.replace(/[^0-9A-Fa-f]/g, "").toUpperCase().slice(0, 10);
  return hex.padEnd(10, "0");
}

export function fieldValue(spec: FieldSlot, identity: ForgeIdentity): string {
  if (spec.key === "nationality") return "AUSTRALIAN";
  if (spec.key === "irn") return "1";
  if (spec.key === "medicareName") {
    return `1  ${identity.givenNames} ${identity.surname}`.toUpperCase();
  }
  if (spec.key === "surnameUpper") return identity.surname.toUpperCase();
  if (spec.key === "givenUpper") return identity.givenNames.toUpperCase();
  if (spec.key === "qldDob") return formatQldDate(identity.dob);
  if (spec.key === "qldExpiry") return formatQldDotDate(identity.expiry);
  if (spec.key === "qldEffective") return formatQldDotDate(identity.effective || identity.expiry);
  if (spec.key === "qldCrn") return formatQldCrn(identity.documentNumber);
  if (spec.key === "licenceType") return (identity.licenceType || "O").toUpperCase();
  if (spec.key === "cardNumber") return formatQldCardNumber(identity.cardNumber || "");
  if (spec.key === "mrz1") return buildPassportMrz(identity).mrz1;
  if (spec.key === "mrz2") return buildPassportMrz(identity).mrz2;
  return String(identity[spec.key as keyof ForgeIdentity] ?? "");
}
