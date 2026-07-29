import { z } from "zod";
import { VectorPayloadKindSchema } from "./engagement";

export const FindingSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
]);

export const TriageStateSchema = z.enum([
  "open",
  "confirmed",
  "reported",
  "remediated",
]);

export const FindingSchema = z.object({
  id: z.string(),
  engagementId: z.string().nullable().optional(),
  runId: z.string().nullable().optional(),
  targetId: z.string().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  severity: FindingSeveritySchema,
  vector: VectorPayloadKindSchema.nullable().optional(),
  triageState: TriageStateSchema.default("open"),
  evidence: z.record(z.string(), z.unknown()).default({}),
  reproSteps: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateFindingSchema = z.object({
  engagementId: z.string().optional(),
  runId: z.string().optional(),
  targetId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  severity: FindingSeveritySchema,
  vector: VectorPayloadKindSchema.optional(),
  triageState: TriageStateSchema.optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  reproSteps: z.string().optional(),
});

export const UpdateFindingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  severity: FindingSeveritySchema.optional(),
  triageState: TriageStateSchema.optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  reproSteps: z.string().nullable().optional(),
});

export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;
export type TriageState = z.infer<typeof TriageStateSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type CreateFindingInput = z.infer<typeof CreateFindingSchema>;
export type UpdateFindingInput = z.infer<typeof UpdateFindingSchema>;
