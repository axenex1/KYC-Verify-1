/**
 * Red-mark allowlist from the user's three QLD plates
 * (D:\axel0\Pictures\Saved Pictures\Licenses + public/documents/au/refs-marked).
 *
 * Pairing: unmarked full card → marked overlay
 *   96 lovett     → 97
 *   98 goyeneche  → 99   (working high-res plate: qld-licence.jpg)
 *  100 mason      → 101
 *
 * Red = edit. Everything else is frozen. Selfie / ghost are extra
 * (never circled) because the user always swaps the portrait.
 */

export const QLD_PLATE_REFS = {
  lovett: {
    unmarked: "/documents/au/plates/lovett.png",
    marked: "/documents/au/refs-marked/97.png",
    printed: {
      surname: "LOVETT",
      givenNames: "SONIA ALIENE",
      crn: "095 191 428",
      dob: "25 Mar 1978",
      cardClass: "CA",
      licenceType: "O",
      effective: "29.05.24",
      expiry: "29.05.29",
      cardNumber: null,
    },
    red: ["surname", "givenNames", "documentNumber", "dob", "cardClass", "licenceType", "effective", "expiry"],
  },
  goyeneche: {
    unmarked: "/documents/au/plates/goyeneche.png",
    marked: "/documents/au/refs-marked/99.png",
    printed: {
      surname: "GOYENECHE",
      givenNames: "ELIZABETH REBECA",
      crn: "069 507 828",
      dob: "05 Feb 1981",
      cardClass: "C",
      licenceType: "O",
      secondClass: "R",
      effective: "18.07.22",
      expiry: "17.07.27",
      cardNumber: "E6D6BA1F57",
    },
    red: [
      "surname",
      "givenNames",
      "documentNumber",
      "dob",
      "cardClass",
      "licenceType",
      "effective",
      "expiry",
      "cardNumber",
    ],
  },
  mason: {
    unmarked: "/documents/au/plates/mason.png",
    marked: "/documents/au/refs-marked/101.png",
    printed: {
      surname: "MASON",
      givenNames: "DELANEY MINAIA AWHINA",
      crn: "122 714 670",
      dob: "04 May 2002",
      cardClass: "C",
      licenceType: "L",
      effective: null,
      expiry: null,
      cardNumber: "29E3B1E818",
    },
    red: ["surname", "givenNames", "documentNumber", "dob", "cardClass", "licenceType", "effective", "expiry"],
  },
} as const;

/** Consensus red values across the three marked cards. Plus portrait/ghost. */
export const QLD_EDIT_FIELDS = [
  "surname",
  "givenNames",
  "documentNumber",
  "dob",
  "cardClass",
  "licenceType",
  "effective",
  "expiry",
  "cardNumber",
  "portrait",
  "ghost",
] as const;

export type QldEditField = (typeof QLD_EDIT_FIELDS)[number];

/** Printed chrome the red marks left alone on every card. Never write these pixels. */
export const QLD_FROZEN = [
  "Driver Licence",
  "LICENCE NO. / CRN label",
  "DOB label",
  "Class header",
  "Type header",
  "Effective header",
  "Expiry header",
  "Conditions",
  "Card number label",
  "Queensland, Australia",
  "Queensland Government crest",
  "signature",
  "Australia watermark in the photo well",
  "contactless waves",
  "granite / card stock / holograms / rounded corners / camera angle",
] as const;

export const QLD_MARKED_REFS = [
  "/documents/au/refs-marked/97.png",
  "/documents/au/refs-marked/99.png",
  "/documents/au/refs-marked/101.png",
] as const;

export const QLD_UNMARKED_REFS = [
  "/documents/au/plates/lovett.png",
  "/documents/au/plates/goyeneche.png",
  "/documents/au/plates/mason.png",
] as const;

/** Working generation plate is the high-res Goyeneche crop. Card number is red on that card. */
export const QLD_WORKING_PLATE = "goyeneche" as const;
