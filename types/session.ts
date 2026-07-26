import { z } from "zod";

export const PromptResultSchema = z.object({
  prompt: z.string(),
  passed: z.boolean(),
  confidence: z.number().min(0).max(1),
  durationMs: z.number(),
  attempts: z.number(),
});

export const AuditEventSchema = z.object({
  type: z.string(),
  timestamp: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const SessionMetricsSchema = z.object({
  avgBlinkIntervalMs: z.number().optional(),
  headRotationMaxDeg: z.number().optional(),
  avgFps: z.number().optional(),
});

export const DocumentTransformSchema = z.object({
  scale: z.number(),
  rotationDeg: z.number(),
  skewX: z.number(),
  skewY: z.number(),
});

export const DocumentQASchema = z.object({
  templateId: z.string().optional(),
  appliedTransform: DocumentTransformSchema.optional(),
});

export const PairedDeviceSchema = z.object({
  platform: z.literal("android"),
  connectedAt: z.string(),
  disconnectedAt: z.string().optional(),
  transport: z.literal("usb-adb"),
});

export const SessionExportSchema = z.object({
  sessionId: z.string().uuid(),
  environment: z.literal("application"),
  promptSet: z.string(),
  providerId: z.string().optional(),
  customPromptSetId: z.string().uuid().optional(),
  distortionMode: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  promptResults: z.array(PromptResultSchema),
  metrics: SessionMetricsSchema,
  events: z.array(AuditEventSchema),
  device: z
    .object({
      userAgent: z.string().optional(),
      platform: z.string().optional(),
    })
    .optional(),
  cameraFacing: z.enum(["user", "environment"]).optional(),
  documentQA: DocumentQASchema.optional(),
  pairedDevice: PairedDeviceSchema.optional(),
});

export type PromptResult = z.infer<typeof PromptResultSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type SessionMetrics = z.infer<typeof SessionMetricsSchema>;
export type DocumentTransform = z.infer<typeof DocumentTransformSchema>;
export type DocumentQA = z.infer<typeof DocumentQASchema>;
export type PairedDevice = z.infer<typeof PairedDeviceSchema>;
export type SessionExport = z.infer<typeof SessionExportSchema>;

export interface CreateSessionRequest {
  mode: "verification";
  promptSet: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  createdAt: string;
  environment: "application";
  providerId?: string;
  customPromptSetId?: string;
}
