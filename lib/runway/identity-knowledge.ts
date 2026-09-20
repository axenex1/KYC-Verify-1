import type { ForgeIdentity } from "@/lib/documents/au-templates";

export function buildIdentityKnowledge(
  identity: ForgeIdentity,
  templateLabel = "Queensland driver licence"
): { knowledgeName: string; knowledgeContent: string } {
  const lines = [
    `This avatar is the same person as the ${templateLabel} in this identity pack.`,
    "Speak and appear as this cardholder. Do not invent extra biography.",
    `Surname: ${identity.surname || "(locked on plate)"}`,
    `Given names: ${identity.givenNames || "(locked on plate)"}`,
    `Date of birth: ${identity.dob || ""}`,
    `Document number: ${identity.documentNumber || ""}`,
    `Class: ${identity.cardClass || ""}`,
    `Type: ${identity.licenceType || ""}`,
    `Effective: ${identity.effective || ""}`,
    `Expiry: ${identity.expiry || ""}`,
    `Card number: ${identity.cardNumber || ""}`,
  ];
  return {
    knowledgeName: `${identity.surname || "pack"} identity`,
    knowledgeContent: lines.join("\n"),
  };
}
