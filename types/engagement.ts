import { z } from "zod";
import { TargetCapabilitySchema } from "./targets";

export const EngagementStatusSchema = z.enum([
  "draft",
  "active",
  "completed",
  "archived",
]);

export const VectorPayloadKindSchema = z.enum([
  "deepfake",
  "document",
  "behavioral",
  "sdk",
]);

export const VectorPayloadSchema = z.object({
  kind: VectorPayloadKindSchema,
  label: z.string().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const TargetVerdictSchema = z.object({
  outcome: z.enum(["pass", "fail", "review", "error", "unknown"]),
  confidence: z.number().min(0).max(1).optional(),
  signals: z.record(z.string(), z.unknown()).optional(),
  raw: z.unknown().optional(),
  receivedAt: z.string().optional(),
});

export const EngagementSchema = z.object({
  id: z.string(),
  targetId: z.string(),
  name: z.string().nullable().optional(),
  attackSurface: z.array(TargetCapabilitySchema).default([]),
  vectorPayloads: z.array(VectorPayloadSchema).default([]),
  status: EngagementStatusSchema.default("draft"),
  operatorName: z.string().nullable().optional(),
  authorizationRef: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().optional(),
});

export const CreateEngagementSchema = z.object({
  targetId: z.string().min(1),
  name: z.string().optional(),
  attackSurface: z.array(TargetCapabilitySchema).default([]),
  vectorPayloads: z.array(VectorPayloadSchema).default([]),
  status: EngagementStatusSchema.optional(),
  operatorName: z.string().min(1, "Operator name required"),
  authorizationRef: z
    .string()
    .min(1, "Authorization reference required for authorized engagements"),
});

export const UpdateEngagementSchema = z.object({
  name: z.string().optional(),
  attackSurface: z.array(TargetCapabilitySchema).optional(),
  vectorPayloads: z.array(VectorPayloadSchema).optional(),
  status: EngagementStatusSchema.optional(),
  completedAt: z.string().nullable().optional(),
  operatorName: z.string().optional(),
  authorizationRef: z.string().optional(),
});

export const RunStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "aborted",
]);

export const RunSchema = z.object({
  id: z.string(),
  engagementId: z.string(),
  sessionId: z.string().nullable().optional(),
  status: RunStatusSchema.default("running"),
  vectorPayload: VectorPayloadSchema.nullable().optional(),
  targetVerdict: TargetVerdictSchema.nullable().optional(),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type EngagementStatus = z.infer<typeof EngagementStatusSchema>;
export type VectorPayloadKind = z.infer<typeof VectorPayloadKindSchema>;
export type VectorPayload = z.infer<typeof VectorPayloadSchema>;
export type TargetVerdict = z.infer<typeof TargetVerdictSchema>;
export type Engagement = z.infer<typeof EngagementSchema>;
export type CreateEngagementInput = z.infer<typeof CreateEngagementSchema>;
export type UpdateEngagementInput = z.infer<typeof UpdateEngagementSchema>;
export type RunStatus = z.infer<typeof RunStatusSchema>;
export type Run = z.infer<typeof RunSchema>;
