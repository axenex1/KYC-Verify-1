import { z } from "zod";

export const TargetVendorSchema = z.enum([
  "mediapipe",
  "sumsub",
  "onfido",
  "jumio",
  "veriff",
]);

export const TargetAdapterTypeSchema = z.enum([
  "mediapipe",
  "vendor-sdk",
  "vendor-api",
]);

export const TargetStatusSchema = z.enum(["active", "inactive", "error"]);

export const TargetCapabilitySchema = z.enum([
  "liveness",
  "document",
  "behavioral",
  "sdk",
]);

export const TargetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  vendor: TargetVendorSchema,
  adapterType: TargetAdapterTypeSchema,
  capabilities: z.array(TargetCapabilitySchema),
  /** Non-secret configuration only — credentials live in vault (Phase settings). */
  config: z.record(z.string(), z.unknown()).default({}),
  status: TargetStatusSchema.default("active"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateTargetSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  vendor: TargetVendorSchema,
  adapterType: TargetAdapterTypeSchema,
  capabilities: z.array(TargetCapabilitySchema).default([]),
  config: z.record(z.string(), z.unknown()).optional(),
  status: TargetStatusSchema.optional(),
});

export const UpdateTargetSchema = CreateTargetSchema.partial().omit({
  id: true,
});

export type TargetVendor = z.infer<typeof TargetVendorSchema>;
export type TargetAdapterType = z.infer<typeof TargetAdapterTypeSchema>;
export type TargetStatus = z.infer<typeof TargetStatusSchema>;
export type TargetCapability = z.infer<typeof TargetCapabilitySchema>;
export type Target = z.infer<typeof TargetSchema>;
export type CreateTargetInput = z.infer<typeof CreateTargetSchema>;
export type UpdateTargetInput = z.infer<typeof UpdateTargetSchema>;
