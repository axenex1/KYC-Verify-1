import { planQldPlate } from "@/lib/documents/qld-plan";
import { QLD_PLATE } from "@/lib/documents/qld-glyphs";
import type { ForgeIdentity } from "@/lib/documents/au-templates";

export type QldPassId = "names" | "crn" | "dob" | "class" | "dates" | "card" | "polish" | "paste" | "nano";

export type QldPassKind = "qwen" | "paste" | "nano";

export interface QldPass {
  id: QldPassId;
  label: string;
  kind: QldPassKind;
  needsFace: boolean;
}

const LOCK =
  "Copy reference image 1 with no reframing. Same photograph: same granite around the card, same card size, same rounded corners, same camera angle, same lighting, same glare, same scratches, same holograms, same print grain. Do not restyle fonts. Do not move labels. Do not invent extra text. Change ONLY what this step names. Everything else must stay pixel-identical to reference 1.";

/** Field edits first. Pass 7 is print polish. Selfie is pasted locally. Nano Banana Pro is last. */
export const QLD_PASSES: QldPass[] = [
  { id: "names", label: "Names", kind: "qwen", needsFace: false },
  { id: "crn", label: "Licence number", kind: "qwen", needsFace: false },
  { id: "dob", label: "Date of birth", kind: "qwen", needsFace: false },
  { id: "class", label: "Class / type", kind: "qwen", needsFace: false },
  { id: "dates", label: "Effective / expiry", kind: "qwen", needsFace: false },
  { id: "card", label: "Card number", kind: "qwen", needsFace: false },
  { id: "polish", label: "Print polish", kind: "qwen", needsFace: false },
  { id: "paste", label: "Paste + grain", kind: "paste", needsFace: true },
  { id: "nano", label: "Nano Banana Pro", kind: "nano", needsFace: true },
];

export function formatDot(raw: string): string {
  const d = raw.replace(/\D/g, "").padEnd(6, "0").slice(0, 6);
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4, 6)}`;
}

export function buildQldPassPrompt(passId: QldPassId, identity: ForgeIdentity): string {
  const plan = planQldPlate(identity);
  const effective = formatDot(plan.effective);
  const expiry = formatDot(plan.expiry);

  switch (passId) {
    case "names":
      return [
        LOCK,
        `TOUCH 1: the red surname slot under Driver Licence. Print exactly ${plan.surname} in the same black bold capitals, same size, same baseline.`,
        `TOUCH 2: the red given-names slot under the surname. Print exactly ${plan.givenNames} in the same black capitals, same size, same baseline.`,
        "Do not touch the words Driver Licence. Do not change DOB, CRN, class, dates, photo, ghost, signature, or any label.",
      ].join(" ");
    case "crn":
      return [
        LOCK,
        "TOUCH 1: the red licence-number value under the frozen LICENCE NO. / CRN label.",
        `Print exactly ${plan.crn} — nine digits grouped 3-3-3 — same bold black type, same size, same slot.`,
        "Do not change the LICENCE NO. / CRN label, names, photo, signature, or any other field.",
      ].join(" ");
    case "dob":
      return [
        LOCK,
        "TOUCH 1: the red date value immediately after the frozen DOB label.",
        `Print exactly ${plan.dob} in the same bold black type and size (dd Mmm yyyy, like 05 Feb 1981 / 25 Mar 1978 / 04 May 2002).`,
        "Do not move or restyle the letters DOB. Do not change names, CRN, class, photo, or signature.",
      ].join(" ");
    case "class":
      return [
        LOCK,
        `TOUCH 1: the red Class value only. Print ${plan.cardClass} under the frozen Class header, same size as the current letter.`,
        `TOUCH 2: the red Type value only. Print ${plan.licenceType} under the frozen Type header, same size as the current letter.`,
        "If a second class row exists, keep the same Type letter on that row. Leave the words Class, Type, Effective, Expiry where they are.",
      ].join(" ");
    case "dates":
      return [
        LOCK,
        `TOUCH 1: red Effective values only. Print ${effective} under the frozen Effective header on every class row, same dd.mm.yy type as 18.07.22 / 29.05.24.`,
        `TOUCH 2: red Expiry values only. Print ${expiry} under the frozen Expiry header on every class row, same dd.mm.yy type.`,
        "Do not change Class letters, Type letters, names, CRN, photo, or signature.",
      ].join(" ");
    case "card":
      return [
        LOCK,
        "TOUCH 1: the red card-number value under the frozen Card number label (Goyeneche plate only — this value is circled).",
        `Print exactly ${plan.cardNumber} — 10 uppercase hex characters, no spaces — same type and slot as E6D6BA1F57.`,
        "Do not change the Card number label, signature, Conditions, or any other field.",
      ].join(" ");
    case "polish":
      return [
        LOCK,
        "This is a CLEAN POLISH of an already-edited card. Do not change any red value, any label, the photo, the ghost, or the signature.",
        "Only tidy the already-replaced value ink so it sits in the original type: even black, same size, no smear, no extra glyphs.",
        "Keep granite, plastic glare, scratches, holograms, rounded corners, and camera angle exactly as they are.",
      ].join(" ");
    case "nano":
      return [
        "Reference 1 is a finished Queensland driver licence photograph. Do not reframe or crop. Keep the same granite, card size, and camera angle.",
        "Do not change any printed text. Red values are already correct. Frozen chrome (Driver Licence, labels, Conditions, signature, crest) must stay.",
        "Make it look like a real photo of a real plastic card: authentic print grain, natural lighting, subtle plastic sheen, keep existing glare and scratches.",
        "Reference 2 is the subject. That exact person must remain in the right-hand photo window on a flat cool white backdrop with no glow.",
        "The lower-left ghost must stay a translucent gold print of the same face. No white rectangle.",
      ].join(" ");
    default:
      return LOCK;
  }
}

export function passesNeeded(identity: ForgeIdentity, hasFace: boolean): QldPass[] {
  const plan = planQldPlate(identity);
  return QLD_PASSES.filter((pass) => {
    switch (pass.id) {
      case "names":
        return plan.surname !== QLD_PLATE.surname || plan.givenNames !== QLD_PLATE.givenNames;
      case "crn":
        return plan.crn !== QLD_PLATE.crn;
      case "dob":
        return plan.dob !== QLD_PLATE.dob;
      case "class":
        return plan.cardClass !== QLD_PLATE.cardClass || plan.licenceType !== QLD_PLATE.licenceType;
      case "dates":
        return (
          formatDot(plan.effective) !== QLD_PLATE.effective || formatDot(plan.expiry) !== QLD_PLATE.expiry
        );
      case "card":
        return plan.cardNumber !== QLD_PLATE.cardNumber;
      case "polish":
        return true;
      case "paste":
      case "nano":
        return hasFace;
      default:
        return false;
    }
  });
}

export const PASS_NEGATIVE_PROMPT = [
  "reframed photo, cropped card, different angle, missing granite, resized card",
  "restyled font, moved labels, missing DOB label, missing Class label, missing Type label",
  "missing Effective label, missing Expiry label, missing Card number label",
  "changed signature, extra logos, extra class rows invented",
  "glowing face, halo, bloom, coloured backdrop in photo window",
  "white rectangle behind ghost, hard-edged ghost",
  "misspelled text, extra fingers, cartoon, illustration, deprecated plastic, melted type",
].join(", ");
