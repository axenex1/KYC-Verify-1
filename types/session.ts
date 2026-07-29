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

export const DocumentGenerationSchema = z.object({
  avatarId: z.string().optional(),
  avatarName: z.string().optional(),
  status: z.string().optional(),
  sourceFileName: z.string().optional(),
  faceCropped: z.boolean().optional(),
  motionVideoUrl: z.string().optional(),
  armedClipUrl: z.string().optional(),
  armedAt: z.string().optional(),
});

export const PairedDeviceSchema = z.object({
  platform: z.literal("android"),
  connectedAt: z.string(),
  disconnectedAt: z.string().optional(),
  transport: z.literal("usb-adb"),
});

export const TargetRefSchema = z.object({
  id: z.string(),
  vendor: z.string().optional(),
  name: z.string().optional(),
});

export const SessionFindingRefSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  triageState: z
    .enum(["open", "confirmed", "reported", "remediated"])
    .optional(),
});

export const SessionExportSchema = z.object({
  sessionId: z.string().uuid(),
  environment: z.literal("qa"),
  promptSet: z.string(),
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
  documentGeneration: DocumentGenerationSchema.optional(),
  pairedDevice: PairedDeviceSchema.optional(),
  /** Pluggable KYC target under test (vendor or MediaPipe). */
  target: TargetRefSchema.optional(),
  /** Attack vector payload applied during the probe run. */
  vectorPayload: z
    .object({
      kind: z.enum(["deepfake", "document", "behavioral", "sdk"]),
      label: z.string().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
  /** Verdict returned by the detection target. */
  targetVerdict: z
    .object({
      outcome: z.enum(["pass", "fail", "review", "error", "unknown"]),
      confidence: z.number().min(0).max(1).optional(),
      signals: z.record(z.string(), z.unknown()).optional(),
      raw: z.unknown().optional(),
      receivedAt: z.string().optional(),
    })
    .optional(),
  /** Auto-extracted or manually attached findings for this run. */
  findings: z.array(SessionFindingRefSchema).optional(),
});

export type PromptResult = z.infer<typeof PromptResultSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type SessionMetrics = z.infer<typeof SessionMetricsSchema>;
export type DocumentTransform = z.infer<typeof DocumentTransformSchema>;
export type DocumentQA = z.infer<typeof DocumentQASchema>;
export type PairedDevice = z.infer<typeof PairedDeviceSchema>;
export type TargetRef = z.infer<typeof TargetRefSchema>;
export type SessionFindingRef = z.infer<typeof SessionFindingRefSchema>;
export type SessionExport = z.infer<typeof SessionExportSchema>;

export interface CreateSessionRequest {
  mode: "qa";
  promptSet: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  createdAt: string;
  environment: "qa";
}
