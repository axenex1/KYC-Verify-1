import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createDocumentImageJob,
  isBudgetPixelConfigured,
  uploadBudgetPixelFile,
} from "@/lib/budgetpixel/client";
import { PASS_NEGATIVE_PROMPT, QLD_PASSES, buildQldPassPrompt, type QldPassId } from "@/lib/budgetpixel/passes";
import { planQldPlate } from "@/lib/documents/qld-plan";
import type { ForgeIdentity, ForgeTemplateId } from "@/lib/documents/au-templates";

export const runtime = "nodejs";

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

async function plateBuffer(form: FormData, templateId: ForgeTemplateId): Promise<{ buf: Buffer; name: string; mime: string }> {
  const plate = form.get("plate");
  if (plate instanceof File && plate.size > 0) {
    return {
      buf: Buffer.from(await plate.arrayBuffer()),
      name: plate.name || "plate.png",
      mime: plate.type || "image/png",
    };
  }
  const file = templateId === "qld-licence" ? "qld-licence.jpg" : `${templateId}.jpg`;
  const buf = await readFile(join(process.cwd(), "public", "documents", "au", file));
  return { buf, name: file, mime: "image/jpeg" };
}

export async function POST(request: Request) {
  if (!isBudgetPixelConfigured()) {
    return NextResponse.json({ error: "BudgetPixel is not configured." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const templateId = String(form.get("templateId") ?? "qld-licence") as ForgeTemplateId;
    if (templateId !== "qld-licence") {
      return NextResponse.json({ error: "Isolated passes are QLD-only." }, { status: 400 });
    }
    const passId = String(form.get("passId") ?? "") as QldPassId;
    const pass = QLD_PASSES.find((item) => item.id === passId);
    if (!pass) {
      return NextResponse.json({ error: "Unknown pass." }, { status: 400 });
    }

    if (pass.kind === "paste") {
      return NextResponse.json({ error: "Paste is a local step." }, { status: 400 });
    }

    const identity = IdentitySchema.parse(JSON.parse(String(form.get("identity") ?? "{}"))) as ForgeIdentity;
    const plan = planQldPlate(identity);
    const plate = await plateBuffer(form, templateId);
    const plateUrl = await uploadBudgetPixelFile(plate.buf, plate.name, plate.mime);
    const refs = [plateUrl];

    if (pass.needsFace || pass.kind === "nano") {
      const face = form.get("file");
      if (face instanceof File && face.size > 0) {
        const faceBuf = Buffer.from(await face.arrayBuffer());
        refs.push(await uploadBudgetPixelFile(faceBuf, face.name || "face.jpg", face.type || "image/jpeg"));
      }
    }

    const job = await createDocumentImageJob({
      prompt: buildQldPassPrompt(passId, identity),
      referenceUrls: refs,
      negativePrompt: PASS_NEGATIVE_PROMPT,
      model: pass.kind === "nano" ? "nano-banana-pro" : "qwen-image-2.0-pro",
    });

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        passId,
        label: pass.label,
        plan,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid identity fields", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Pass failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
