import {
  formatQldCardNumber,
  type ForgeIdentity,
  type ForgeTemplateId,
} from "@/lib/documents/au-templates";

export { formatQldCardNumber };

export const STOCK_FORGE_IDENTITY: ForgeIdentity = {
  givenNames: "Lachlan James",
  surname: "Whitaker",
  address: "14 Flinders Lane, Melbourne VIC 3000",
  dob: "14/03/1994",
  expiry: "14/03/2031",
  documentNumber: "069 507 828",
  sex: "M",
  cardClass: "C",
  placeOfBirth: "BRISBANE",
};

export const EMPTY_FORGE_IDENTITY: ForgeIdentity = {
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

const STOCK_NUMBERS = new Set([
  "069 507 828",
  "069507828",
  "18472639",
  "PA8392614",
  "4262 22141 8",
  "4262221418",
  "084219673",
]);

const STOCK_ADDRESSES = new Set([
  "14 Flinders Lane, Melbourne VIC 3000",
  "8 Suffolk Street, Caboolture South QLD 4510",
  "88 George Street, Sydney NSW 2000",
  "Canberra ACT 2600",
  "Services Australia",
]);

const GIVEN_M = [
  "Mason James",
  "Jack Thomas",
  "Harrison Cole",
  "Cooper Blake",
  "Finn Alexander",
  "Archie William",
  "Callum Rhys",
  "Hugo Bennett",
  "Nate Oliver",
  "Hamish George",
  "Levi Samuel",
  "Banjo Reid",
];

const GIVEN_F = [
  "Olivia Grace",
  "Amelia Rose",
  "Charlotte Eve",
  "Isla Marie",
  "Matilda Jane",
  "Sienna Kate",
  "Harper Elise",
  "Imogen Claire",
  "Freya Louise",
  "Piper Skye",
  "Zara Elise",
  "Willow Anne",
  "Evie Margaret",
];

const SURNAMES = [
  "Nguyen",
  "Patel",
  "Williams",
  "Chen",
  "Taylor",
  "Anderson",
  "Singh",
  "Walker",
  "Thompson",
  "Campbell",
  "Murphy",
  "Rossi",
  "Ibrahim",
  "OConnor",
  "McKenzie",
  "Walsh",
  "Brennan",
  "Fraser",
  "Reid",
  "Papadopoulos",
];

const QLD_ADDRESSES = [
  "22 Sandgate Road, Albion QLD 4010",
  "14 Agnes Street, Fortitude Valley QLD 4006",
  "9 Duporth Avenue, Maroochydore QLD 4558",
  "31 Victoria Street, Mackay QLD 4740",
  "6 Flinders Street, Townsville QLD 4810",
  "18 Spence Street, Cairns QLD 4870",
  "4 Ellenborough Street, Ipswich QLD 4305",
  "27 Vulture Street, West End QLD 4101",
  "11 Sydney Street, Mackay QLD 4740",
  "8 Browns Plains Road, Browns Plains QLD 4118",
];

const NSW_ADDRESSES = [
  "12 Church Street, Parramatta NSW 2150",
  "45 King Street, Newcastle NSW 2300",
  "9 Crown Street, Wollongong NSW 2500",
  "18 Oxford Street, Darlinghurst NSW 2010",
  "3 Hunter Street, Newcastle NSW 2300",
];

const VIC_ADDRESSES = [
  "9 Swanston Street, Carlton VIC 3053",
  "22 Ryrie Street, Geelong VIC 3220",
  "7 Bridge Road, Richmond VIC 3121",
  "16 Lydiard Street, Ballarat VIC 3350",
  "4 Deakin Avenue, Mildura VIC 3500",
];

const QLD_BIRTH = ["BRISBANE", "GOLD COAST", "TOWNSVILLE", "CAIRNS", "TOOWOOMBA", "MACKAY", "ROCKHAMPTON"];
const NSW_BIRTH = ["SYDNEY", "NEWCASTLE", "WOLLONGONG", "PARAMATTA"];
const VIC_BIRTH = ["MELBOURNE", "GEELONG", "BALLARAT", "BENDIGO"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface AuDate {
  day: number;
  month: number;
  year: number;
}

export interface IdentityCheck {
  ok: boolean;
  identity: ForgeIdentity;
  randomized: string[];
  fixes: string[];
  notes: string[];
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function parseAuDate(value: string): AuDate | null {
  const raw = value.trim();
  if (!raw) return null;

  const monthName = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (monthName) {
    const day = Number(monthName[1]);
    const year = Number(monthName[3]);
    const idx = MONTHS.findIndex((m) => m.toLowerCase() === monthName[2]!.slice(0, 3).toLowerCase());
    if (idx >= 0 && day >= 1 && day <= 31) return { day, month: idx + 1, year };
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
  }

  const dotted = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    let year = Number(dotted[3]);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      return { day, month, year };
    }
  }

  return null;
}

export function formatQldDob(value: string | AuDate): string {
  const date = typeof value === "string" ? parseAuDate(value) : value;
  if (!date) return typeof value === "string" ? value : "";
  return `${pad2(date.day)} ${MONTHS[date.month - 1]} ${date.year}`;
}

export function formatQldDotDate(value: string | AuDate): string {
  const date = typeof value === "string" ? parseAuDate(value) : value;
  if (!date) return typeof value === "string" ? value : "";
  return `${pad2(date.day)}.${pad2(date.month)}.${String(date.year).slice(-2)}`;
}

export function formatSlashDate(value: string | AuDate): string {
  const date = typeof value === "string" ? parseAuDate(value) : value;
  if (!date) return typeof value === "string" ? value : "";
  return `${pad2(date.day)}/${pad2(date.month)}/${date.year}`;
}

export function formatQldCrn(value: string): string {
  const digits = digitsOnly(value).slice(0, 9).padStart(9, "0");
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}

function dateFrom(date: AuDate): Date {
  return new Date(date.year, date.month - 1, date.day);
}

function toAuDate(date: Date): AuDate {
  return { day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() };
}

function addYearsMinusDay(date: AuDate, years: number): AuDate {
  const next = new Date(date.year + years, date.month - 1, date.day);
  next.setDate(next.getDate() - 1);
  return toAuDate(next);
}

function ageOn(dob: AuDate, on: Date = new Date()): number {
  let age = on.getFullYear() - dob.year;
  const hadBirthday =
    on.getMonth() + 1 > dob.month || (on.getMonth() + 1 === dob.month && on.getDate() >= dob.day);
  if (!hadBirthday) age -= 1;
  return age;
}

function jurisdictionOf(templateId: ForgeTemplateId): "QLD" | "NSW" | "VIC" | "ACT" | "AUS" {
  if (templateId === "qld-licence") return "QLD";
  if (templateId === "nsw-licence") return "NSW";
  if (templateId === "vic-licence") return "VIC";
  if (templateId === "au-passport") return "ACT";
  return "AUS";
}

function addressState(address: string): string | null {
  const match = address.toUpperCase().match(/\b(QLD|NSW|VIC|ACT|SA|WA|TAS|NT)\b/);
  return match?.[1] ?? null;
}

function addressesFor(templateId: ForgeTemplateId): string[] {
  switch (templateId) {
    case "qld-licence":
      return QLD_ADDRESSES;
    case "nsw-licence":
      return NSW_ADDRESSES;
    case "vic-licence":
      return VIC_ADDRESSES;
    case "au-passport":
      return ["18 London Circuit, Canberra ACT 2601", "7 Marcus Clarke Street, Canberra ACT 2601"];
    default:
      return QLD_ADDRESSES;
  }
}

function birthplacesFor(templateId: ForgeTemplateId): string[] {
  switch (templateId) {
    case "nsw-licence":
      return NSW_BIRTH;
    case "vic-licence":
      return VIC_BIRTH;
    default:
      return QLD_BIRTH;
  }
}

function randomCrn(): string {
  let digits = "";
  for (let i = 0; i < 9; i += 1) digits += String(randInt(i === 0 ? 1 : 0, 9));
  if (digits === "069507828") return randomCrn();
  return formatQldCrn(digits);
}

function randomCardNumber(): string {
  const hex = "0123456789ABCDEF";
  let out = "";
  for (let i = 0; i < 10; i += 1) out += hex[randInt(0, 15)];
  if (out === "E6D6BA1F57") return randomCardNumber();
  return out;
}

function randomDocumentNumber(templateId: ForgeTemplateId): string {
  switch (templateId) {
    case "qld-licence":
      return randomCrn();
    case "nsw-licence":
      return String(randInt(10_000_000, 99_999_999));
    case "vic-licence":
      return String(randInt(100_000_000, 999_999_999));
    case "au-passport": {
      const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
      return `P${letters[randInt(0, letters.length - 1)]}${randInt(1_000_000, 9_999_999)}`;
    }
    case "medicare": {
      const a = String(randInt(2000, 5999));
      const b = String(randInt(10000, 99999));
      const c = String(randInt(1, 9));
      return `${a} ${b} ${c}`;
    }
    default:
      return randomCrn();
  }
}

function randomEligibleDates(): { dob: AuDate; effective: AuDate; expiry: AuDate } {
  const today = new Date();
  const age = randInt(23, 58);
  const dob: AuDate = {
    day: randInt(1, 28),
    month: randInt(1, 12),
    year: today.getFullYear() - age,
  };
  const yearsAgo = randInt(0, 4);
  const effective: AuDate = {
    day: randInt(1, 28),
    month: randInt(1, 12),
    year: today.getFullYear() - yearsAgo,
  };
  if (dateFrom(effective) > today) {
    effective.year -= 1;
  }
  let expiry = addYearsMinusDay(effective, 5);
  if (dateFrom(expiry) <= today) {
    effective.year = today.getFullYear() - 1;
    effective.month = today.getMonth() + 1;
    effective.day = Math.min(28, today.getDate());
    expiry = addYearsMinusDay(effective, 5);
  }
  return { dob, effective, expiry };
}

export function isBlankIdentityValue(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

export function isStockIdentityValue(key: keyof ForgeIdentity, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const stock = STOCK_FORGE_IDENTITY[key];
  if (typeof stock === "string" && stock.toLowerCase() === trimmed.toLowerCase()) return true;
  if (key === "documentNumber" && STOCK_NUMBERS.has(trimmed.replace(/\s+/g, " "))) return true;
  if (key === "documentNumber" && STOCK_NUMBERS.has(digitsOnly(trimmed))) return true;
  if (key === "address" && STOCK_ADDRESSES.has(trimmed)) return true;
  if (key === "cardNumber" && trimmed.toUpperCase() === "E6D6BA1F57") return true;
  return false;
}

function userProvided<K extends keyof ForgeIdentity>(input: ForgeIdentity, key: K): boolean {
  const value = input[key];
  if (typeof value !== "string") return false;
  return !isStockIdentityValue(key, value);
}

function randomBase(templateId: ForgeTemplateId): ForgeIdentity {
  const dates = randomEligibleDates();
  const sex = Math.random() < 0.5 ? "F" : "M";
  return {
    givenNames: pick(sex === "F" ? GIVEN_F : GIVEN_M),
    surname: pick(SURNAMES),
    address: pick(addressesFor(templateId)),
    dob: formatSlashDate(dates.dob),
    expiry: formatSlashDate(dates.expiry),
    documentNumber: randomDocumentNumber(templateId),
    sex,
    cardClass: "C",
    placeOfBirth: pick(birthplacesFor(templateId)),
    licenceType: "O",
    effective: formatSlashDate(dates.effective),
    conditions: "",
    cardNumber: randomCardNumber(),
  };
}

function formatForTemplate(templateId: ForgeTemplateId, identity: ForgeIdentity): ForgeIdentity {
  const dob = parseAuDate(identity.dob);
  const expiry = parseAuDate(identity.expiry);
  const effective = parseAuDate(identity.effective || identity.expiry);

  const next: ForgeIdentity = {
    ...identity,
    givenNames: identity.givenNames.trim().replace(/\s+/g, " "),
    surname: identity.surname.trim().replace(/\s+/g, " "),
    address: identity.address.trim().replace(/\s+/g, " "),
    sex: (identity.sex || "M").trim().toUpperCase().slice(0, 1) === "F" ? "F" : "M",
    cardClass: (identity.cardClass || "C").trim().toUpperCase() || "C",
    licenceType: (identity.licenceType || "O").trim().toUpperCase() || "O",
    conditions: (identity.conditions || "").trim().toUpperCase(),
    placeOfBirth: (identity.placeOfBirth || "").trim().toUpperCase(),
    cardNumber: formatQldCardNumber(identity.cardNumber || randomCardNumber()),
  };

  if (templateId === "qld-licence") {
    next.documentNumber = formatQldCrn(identity.documentNumber);
    next.dob = dob ? formatQldDob(dob) : identity.dob;
    next.expiry = expiry ? formatQldDotDate(expiry) : identity.expiry;
    next.effective = effective ? formatQldDotDate(effective) : identity.effective || "";
  } else if (templateId === "medicare") {
    const digits = digitsOnly(identity.documentNumber).padEnd(11, "1").slice(0, 11);
    next.documentNumber = `${digits.slice(0, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`;
    next.dob = dob ? formatSlashDate(dob) : identity.dob;
    next.expiry = expiry ? `${pad2(expiry.month)}/${String(expiry.year).slice(-2)}` : identity.expiry;
  } else {
    next.dob = dob ? formatSlashDate(dob) : identity.dob;
    next.expiry = expiry ? formatSlashDate(expiry) : identity.expiry;
    next.effective = effective ? formatSlashDate(effective) : identity.effective || "";
  }

  return next;
}

export function resolveForgeIdentity(templateId: ForgeTemplateId, input: ForgeIdentity): IdentityCheck {
  const randomized: string[] = [];
  const fixes: string[] = [];
  const notes: string[] = [];
  const generated = randomBase(templateId);
  const merged: ForgeIdentity = { ...generated };

  (Object.keys(generated) as (keyof ForgeIdentity)[]).forEach((key) => {
    if (userProvided(input, key)) {
      merged[key] = String(input[key] ?? "").trim() as never;
    } else if (!isBlankIdentityValue(input[key]) && isStockIdentityValue(key, String(input[key]))) {
      randomized.push(key);
    } else if (isBlankIdentityValue(input[key])) {
      randomized.push(key);
    }
  });

  const state = jurisdictionOf(templateId);
  const addrState = addressState(merged.address);
  if (templateId.endsWith("-licence") && addrState && addrState !== state) {
    merged.address = generated.address;
    fixes.push(`address moved to ${state} so it matches the licence`);
  }

  let dob = parseAuDate(merged.dob) ?? parseAuDate(generated.dob)!;
  const years = ageOn(dob);
  if (years < 21 || years > 74) {
    dob = parseAuDate(generated.dob)!;
    merged.dob = generated.dob;
    fixes.push("date of birth set to an adult eligible for an open licence");
  }

  let effective = parseAuDate(merged.effective || "") ?? parseAuDate(generated.effective || "")!;
  const today = new Date();
  if (dateFrom(effective) > today) {
    effective = parseAuDate(generated.effective || "")!;
    fixes.push("effective date moved to the past");
  }
  if (ageOn(dob, dateFrom(effective)) < 17) {
    effective = parseAuDate(generated.effective || "")!;
    fixes.push("effective date moved after the 17th birthday");
  }

  let expiry = parseAuDate(merged.expiry) ?? addYearsMinusDay(effective, 5);
  if (dateFrom(expiry) <= today) {
    expiry = addYearsMinusDay(effective, 5);
    if (dateFrom(expiry) <= today) {
      effective = toAuDate(new Date(today.getFullYear() - 1, today.getMonth(), Math.min(28, today.getDate())));
      expiry = addYearsMinusDay(effective, 5);
    }
    fixes.push("expiry extended so the licence is still current");
  }

  const termMs = dateFrom(expiry).getTime() - dateFrom(effective).getTime();
  const termYears = termMs / (365.25 * 24 * 3600 * 1000);
  if (termYears < 4 || termYears > 6) {
    expiry = addYearsMinusDay(effective, 5);
    fixes.push("term set to the standard 5-year open licence");
  }

  merged.dob = formatSlashDate(dob);
  merged.effective = formatSlashDate(effective);
  merged.expiry = formatSlashDate(expiry);
  merged.cardClass = (merged.cardClass || "C").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) || "C";
  merged.licenceType = "O";
  merged.conditions = merged.conditions || "";
  if (!merged.cardNumber || isStockIdentityValue("cardNumber", merged.cardNumber)) {
    merged.cardNumber = generated.cardNumber;
  }
  if (!merged.documentNumber || isStockIdentityValue("documentNumber", merged.documentNumber)) {
    merged.documentNumber = generated.documentNumber;
  }

  const identity = formatForTemplate(templateId, merged);

  notes.push(
    `Eligible ${state === "AUS" ? templateId : state} ${identity.licenceType || "O"} ${identity.cardClass}`.trim()
  );
  if (templateId === "qld-licence") {
    notes.push("DOB dd Mmm yyyy · effective/expiry dd.mm.yy · CRN 3-3-3 · card 10-hex");
    notes.push("Portrait: flat cool white · ghost: translucent gold print · plate deglared");
  }

  return {
    ok: true,
    identity,
    randomized: Array.from(new Set(randomized)),
    fixes,
    notes,
  };
}

export function describeIdentityCheck(check: IdentityCheck): string {
  const bits = [...check.notes];
  if (check.randomized.length) bits.push(`randomised ${check.randomized.join(", ")}`);
  if (check.fixes.length) bits.push(check.fixes.join("; "));
  return bits.join(" · ");
}
