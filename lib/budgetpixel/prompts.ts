import {
  formatQldCardNumber,
  formatQldCrn,
  formatQldDate,
  formatQldDotDate,
  type ForgeIdentity,
  type ForgeTemplateId,
} from "@/lib/documents/au-templates";
import { layoutLockPreamble } from "@/lib/documents/locked-layout";

const CARD: Record<ForgeTemplateId, string> = {
  "qld-licence":
    "a real Queensland Australia yellow plastic driver licence, same card stock, gold-yellow gradient, Queensland Government crest, Driver Licence header, contactless icon, holographic Queensland overlay",
  medicare:
    "a real Australian Medicare card, pale green wave microprint, green medicare wordmark badge, embossed-looking number and name, VALID TO date, no portrait photo",
  "au-passport":
    "a real Australian passport biodata page, cream security paper, PASSPORT header, AUSTRALIA, Type P, Code AUS, colour portrait, MRZ two lines at the bottom",
  "vic-licence":
    "a real Victorian Australia driver licence, green and gold VicRoads card, photo on the left",
  "nsw-licence":
    "a real New South Wales Australia driver licence, magenta Transport for NSW card, photo on the left",
};

function qldPrompt(identity: ForgeIdentity): string {
  const surname = identity.surname.toUpperCase();
  const given = identity.givenNames.toUpperCase();
  const crn = formatQldCrn(identity.documentNumber);
  const dob = formatQldDate(identity.dob);
  const effective = formatQldDotDate(identity.effective || identity.expiry);
  const expiry = formatQldDotDate(identity.expiry);
  const type = (identity.licenceType || "O").toUpperCase();
  const klass = (identity.cardClass || "C").toUpperCase();
  const cardNo = formatQldCardNumber(identity.cardNumber || "");
  const conditions = (identity.conditions || "").trim() || "(blank — no conditions printed)";

  return [
    `Photorealistic photograph of ${CARD["qld-licence"]}.`,
    "Reference image 1 is the deglared flat plate of the real card. Keep the even gold stock — do not reintroduce plastic glare, blown highlights, hotspots, or a shiny wash.",
    layoutLockPreamble("qld-licence"),
    "REPLACE ONLY these driver values, each at the original value slot, original size, original weight:",
    `SURNAME under Driver Licence, bold black ALL CAPS, same size as the original surname: ${surname}.`,
    `GIVEN NAMES directly under the surname, ALL CAPS, same size as the original given names: ${given}.`,
    `LICENCE NO / CRN value under the frozen LICENCE NO. / CRN label, bold, exactly 9 digits grouped 3-3-3 with single spaces: ${crn}.`,
    `DOB value immediately after the frozen DOB label, same baseline, same bold sans, same size as the original date: ${dob}. Format dd Mmm yyyy. Do not move or restyle the DOB letters.`,
    `Class / Type / Effective / Expiry VALUE ROW only, under the frozen headers, same size as the original C / O / dd.mm.yy glyphs: ${klass}   ${type}   ${effective}   ${expiry}. Leave the header words Class, Type, Effective, Expiry exactly where they are. If a second class row existed, fill that row with matching gold stock — do not delete or shift the headers.`,
    `Conditions value under the frozen Conditions label: ${conditions}.`,
    `Card number value under the frozen Card number label, same formatting family as the licence number (original type, original width): exactly 10 uppercase hex characters with no spaces and no dashes: ${cardNo}.`,
    "MAIN PORTRAIT, right photo window: the exact person from reference image 2. Head-and-shoulders licence photograph. Backdrop is a FLAT cool white / pale grey plate (#F0F2F4). No glow, no halo, no bloom, no coloured rim light, no yellow wash behind the head, no gradient, no vignette. Thin white frame like the original. Neutral expression, even office lighting.",
    "GHOST PRINT, lower left — this is mandatory and must match authentic Queensland cards: a SECOND, SMALLER print of the SAME face sitting where the original ghost sits. It is NOT a second full-colour photo and NOT a white rectangle. It is a slightly translucent security ghost: desaturated, soft-edged, faintly gold-tinted, printed into the yellow stock so the card microprint shows through the face. Same pose as the main portrait. Opacity like the original ghost on reference 1. Soft falloff into the card, no hard photo frame, no cool-white plate, no glow.",
    "Replace the original ink signature with a plausible black ballpoint signature of the new name, overlapping the ghost the same way the original signature does.",
    "No extra logos, no captions, no hands, no studio backdrop beyond what is already in reference 1. Flat even-lit product photo of the card only. No glare.",
  ].join(" ");
}

function medicarePrompt(identity: ForgeIdentity): string {
  const number = identity.documentNumber;
  const name = `1  ${identity.givenNames.toUpperCase()} ${identity.surname.toUpperCase()}`;
  return [
    `Photorealistic photograph of ${CARD.medicare}.`,
    "Reference image 1 is the deglared flat plate of the real card. Keep the even lime-green stock — no glare, no blur bloom, no blown highlights.",
    layoutLockPreamble("medicare"),
    "REPLACE ONLY these holder values, original size and original slots:",
    `CARD NUMBER, embossed-looking groups 4-5-1: ${number}.`,
    `NAME LINE: ${name}.`,
    `VALID TO value after the frozen VALID TO label, same size: ${identity.expiry}.`,
    "Do not add a portrait. No extra logos, no captions, no hands. Flat even-lit product photo only.",
  ].join(" ");
}

function passportPrompt(identity: ForgeIdentity): string {
  return [
    `Photorealistic photograph of ${CARD["au-passport"]}.`,
    "Reference image 1 is the deglared flat plate of the real biodata page. Keep cream security paper even — no glare, no blown white patches.",
    layoutLockPreamble("au-passport"),
    "REPLACE ONLY these holder values, original type size and original slots:",
    `SURNAME ${identity.surname.toUpperCase()}`,
    `GIVEN NAMES ${identity.givenNames.toUpperCase()}`,
    `DOCUMENT NUMBER ${identity.documentNumber}`,
    `DATE OF BIRTH ${identity.dob}`,
    `SEX ${identity.sex}`,
    `DATE OF EXPIRY ${identity.expiry}`,
    `NATIONALITY AUSTRALIAN`,
    "Reference image 2 is the subject's face. Put that exact person in the passport photo window. MAIN PORTRAIT: flat cool white / pale grey backdrop, no glow, no halo, no coloured rim light.",
    "Rebuild the two MRZ lines to match the new identity. No extra logos, no captions, no hands. Flat even-lit product photo only.",
  ].join(" ");
}

export function buildDocumentPrompt(templateId: ForgeTemplateId, identity: ForgeIdentity): string {
  if (templateId === "qld-licence") return qldPrompt(identity);
  if (templateId === "medicare") return medicarePrompt(identity);
  if (templateId === "au-passport") return passportPrompt(identity);

  const card = CARD[templateId];
  return [
    `Photorealistic overhead photograph of ${card}.`,
    "Reference image 1 is the deglared flat plate of the real card. Keep lighting even — no glare, no blown highlights.",
    layoutLockPreamble(templateId),
    "Reference image 2 is the subject's face. Put that exact person in the licence photo window.",
    "GHOST PRINT is mandatory: a second smaller slightly translucent print of the same face in the original ghost position. Desaturated, soft-edged, card texture showing through, no white rectangle, no glow, matching the ghost treatment on reference 1.",
    "Print these exact fields, spelled correctly, matching the original type style and original size:",
    `SURNAME ${identity.surname.toUpperCase()}`,
    `GIVEN NAMES ${identity.givenNames.toUpperCase()}`,
    `DOCUMENT NUMBER ${identity.documentNumber}`,
    `DATE OF BIRTH ${identity.dob}`,
    `EXPIRY ${identity.expiry}`,
    "MAIN PORTRAIT: flat cool white backdrop, no glow, no halo, no coloured rim light.",
    "No extra logos, no captions, no studio backdrop, no hands unless already in the reference. Flat even-lit product photo of the card only.",
  ].join(" ");
}

export const DOCUMENT_NEGATIVE_PROMPT = [
  "cartoon, illustration, watermark, extra fingers, misspelled text, extra logos",
  "fake hologram rainbow smear, low-res, cropped card",
  "glare, specular hotspot, blown highlight, shiny plastic wash, uneven lighting, flash reflection",
  "missing DOB label, missing Class label, missing Type label, missing Effective label, missing Expiry label",
  "deleted Card number label, rearranged text, resized text, restyled font, moved labels",
  "glowing face, halo around head, bloom, beauty lighting, yellow glow behind portrait",
  "warm rim light, coloured backdrop in photo window",
  "second full-colour photo as ghost, white rectangle behind ghost, hard-edged ghost photo, missing ghost image",
  "learner plates, P plates",
].join(", ");
