import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createDocumentImageJob,
  isBudgetPixelConfigured,
  uploadBudgetPixelFile,
} from "@/lib/budgetpixel/client";
import { buildDocumentPrompt } from "@/lib/budgetpixel/prompts";
import { resolveForgeIdentity } from "@/lib/documents/au-identity";
import type { ForgeTemplateId } from "@/lib/documents/au-templates";
import { flattenReferenceBuffer } from "@/lib/documents/flatten-card-node";

export const runtime = "nodejs";

const REFERENCE_FILES: Record<string, { file: string; mime: string }> = {
  "qld-licence": { file: "qld-licence.jpg", mime: "image/jpeg" },
  medicare: { file: "medicare.jpg", mime: "image/jpeg" },
  "au-passport": { file: "au-passport.jpg", mime: "image/jpeg" },
};

const IdentitySchema = z.object({
  givenNames: z.string().optional().default(""),
  surname: z.string().optional().default(""),
  address: z.string().optional().default(""),
  dob: z.string().optional().default(""),
  expiry: z.string().optional().default(""),
  documentNumber: z.string().optional().default(""),
  sex: z.string().optional().default(""),
  cardClass: z.string().optional().default(""),
  placeOfBirth: z.string().optional(),
  licenceType: z.string().optional(),
  effective: z.string().optional(),
  conditions: z.string().optional(),
  cardNumber: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isBudgetPixelConfigured()) {
    return NextResponse.json(
      { error: "BudgetPixel is not configured. Set BUDGETPIXEL_API_KEY." },
      { status: 503 }
    );
  }

  try {
    const form = await request.formData();
    const templateId = String(form.get("templateId") ?? "") as ForgeTemplateId;
    const ref = REFERENCE_FILES[templateId];
    if (!ref) {
      return NextResponse.json(
        { error: "This template has no photo reference. Use QLD, Medicare, or AU passport." },
        { status: 400 }
      );
    }

    const parsed = IdentitySchema.parse(JSON.parse(String(form.get("identity") ?? "{}")));
    const identity = resolveForgeIdentity(templateId, parsed).identity;
    const referencePath = join(process.cwd(), "public", "documents", "au", ref.file);
    const referenceBuf = await readFile(referencePath);
    const flatBuf = await flattenReferenceBuffer(referenceBuf, templateId);
    const referenceUrl = await uploadBudgetPixelFile(flatBuf, `flat-${ref.file}`, "image/jpeg");

    const refs = [referenceUrl];
    const face = form.get("file");
    if (face instanceof File && face.size > 0) {
      const faceBuf = Buffer.from(await face.arrayBuffer());
      const faceUrl = await uploadBudgetPixelFile(
        faceBuf,
        face.name || "face.jpg",
        face.type || "image/jpeg"
      );
      refs.push(faceUrl);
    }

    const job = await createDocumentImageJob({
      prompt: buildDocumentPrompt(templateId, identity),
      referenceUrls: refs,
    });

    return NextResponse.json({ jobId: job.id, status: job.status, model: job.model }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid identity fields", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
