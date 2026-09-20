import {
  QLD_PLATE,
  QLD_SAFE_GIVENS,
  QLD_SAFE_SURNAMES,
  defaultYearShift,
  fitDigits,
  fitHex,
  fitLetters,
  fitYearToPlate,
} from "@/lib/documents/qld-glyphs";
import { parseAuDate } from "@/lib/documents/au-identity";
import type { ForgeIdentity } from "@/lib/documents/au-templates";

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function randomTerm(): { effective: string; expiry: string } {
  const start = new Date(2021 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 27));
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 5);
  end.setDate(end.getDate() - 1);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(2)}`;
  return { effective: fmt(start), expiry: fmt(end) };
}

export function planQldPlate(identity: ForgeIdentity): {
  surname: string;
  givenNames: string;
  crn: string;
  dob: string;
  dobYear: string;
  dobDay: string;
  dobMonth: string;
  cardClass: string;
  licenceType: string;
  effective: string;
  expiry: string;
  cardNumber: string;
  note: string;
} {
  const surname = identity.surname.trim()
    ? fitLetters(identity.surname)
    : pick(QLD_SAFE_SURNAMES);
  const givenNames = identity.givenNames.trim()
    ? fitLetters(identity.givenNames)
    : pick(QLD_SAFE_GIVENS);
  const crnDigits = identity.documentNumber.trim()
    ? fitDigits(identity.documentNumber, 9)
    : fitDigits(String(Math.floor(100000000 + Math.random() * 899999999)), 9);
  const crn = `${crnDigits.slice(0, 3)} ${crnDigits.slice(3, 6)} ${crnDigits.slice(6, 9)}`;
  const parsed = parseAuDate(identity.dob || "");
  const dobYear = parsed ? fitYearToPlate(parsed.year) : defaultYearShift();
  const dobDay = parsed ? fitDigits(String(parsed.day).padStart(2, "0"), 2) : "05";
  const dobMonth = parsed ? MONTHS[parsed.month - 1] || "Feb" : "Feb";
  const dob = `${dobDay} ${dobMonth} ${dobYear}`;
  const cardClass = identity.cardClass.trim() ? fitLetters(identity.cardClass).slice(0, 2) || "C" : "C";
  const licenceType = identity.licenceType?.trim() ? fitLetters(identity.licenceType).slice(0, 1) || "O" : "O";
  const term = randomTerm();
  const effective = identity.effective?.trim() ? fitDigits(identity.effective, 6) : term.effective;
  const expiry = identity.expiry.trim() ? fitDigits(identity.expiry, 6) : term.expiry;
  const cardNumber = identity.cardNumber?.trim()
    ? fitHex(identity.cardNumber)
    : fitHex(Array.from({ length: 10 }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join(""));

  return {
    surname,
    givenNames,
    crn,
    dob,
    dobYear,
    dobDay,
    dobMonth,
    cardClass,
    licenceType,
    effective,
    expiry,
    cardNumber,
    note: `Red values only: ${surname} ${givenNames} · ${crn} · ${dob} · ${cardClass}/${licenceType}. Labels, signature, granite, holograms frozen.`,
  };
}

export function resolvePlateYear(identity: ForgeIdentity): { from: string; to: string; note: string } {
  const planned = planQldPlate(identity);
  return { from: QLD_PLATE.dobYear, to: planned.dobYear, note: planned.note };
}
