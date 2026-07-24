import { z } from "zod";

export const SyncRoleSchema = z.enum(["desktop", "mobile"]);
export const CameraFacingSchema = z.enum(["user", "environment"]);
export const PairStatusSchema = z.enum(["waiting", "connected", "disconnected"]);

export const DocumentTransformPayloadSchema = z.object({
  scale: z.number(),
  rotationDeg: z.number(),
  skewX: z.number(),
  skewY: z.number(),
});

const BaseMessageSchema = z.object({
  sessionId: z.string().uuid(),
});

export const PairRequestSchema = BaseMessageSchema.extend({
  type: z.literal("pair_request"),
  role: SyncRoleSchema,
  token: z.string().min(8),
});

export const PairAckSchema = BaseMessageSchema.extend({
  type: z.literal("pair_ack"),
  role: SyncRoleSchema,
  success: z.boolean(),
  error: z.string().optional(),
});

export const CameraFacingMessageSchema = BaseMessageSchema.extend({
  type: z.literal("camera_facing"),
  facing: CameraFacingSchema,
});

export const TransformProposedSchema = BaseMessageSchema.extend({
  type: z.literal("transform_proposed"),
  transform: DocumentTransformPayloadSchema,
});

export const TransformAppliedSchema = BaseMessageSchema.extend({
  type: z.literal("transform_applied"),
  transform: DocumentTransformPayloadSchema,
});

export const TransformRejectedSchema = BaseMessageSchema.extend({
  type: z.literal("transform_rejected"),
});

export const StreamOfferSchema = BaseMessageSchema.extend({
  type: z.literal("stream_offer"),
  sdp: z.string(),
  streamType: z.enum(["desktop_to_mobile", "mobile_to_desktop"]),
});

export const StreamAnswerSchema = BaseMessageSchema.extend({
  type: z.literal("stream_answer"),
  sdp: z.string(),
  streamType: z.enum(["desktop_to_mobile", "mobile_to_desktop"]),
});

export const IceCandidateSchema = BaseMessageSchema.extend({
  type: z.literal("ice_candidate"),
  candidate: z.string(),
  sdpMid: z.string().nullable(),
  sdpMLineIndex: z.number().nullable(),
  streamType: z.enum(["desktop_to_mobile", "mobile_to_desktop"]),
});

export const PingSchema = BaseMessageSchema.extend({
  type: z.literal("ping"),
});

export const PongSchema = BaseMessageSchema.extend({
  type: z.literal("pong"),
});

export const SyncMessageSchema = z.discriminatedUnion("type", [
  PairRequestSchema,
  PairAckSchema,
  CameraFacingMessageSchema,
  TransformProposedSchema,
  TransformAppliedSchema,
  TransformRejectedSchema,
  StreamOfferSchema,
  StreamAnswerSchema,
  IceCandidateSchema,
  PingSchema,
  PongSchema,
]);

export type SyncMessage = z.infer<typeof SyncMessageSchema>;
export type SyncRole = z.infer<typeof SyncRoleSchema>;
export type PairStatus = z.infer<typeof PairStatusSchema>;

export const SYNC_WS_PORT = 3001;
export const SYNC_HTTP_PORT = 3002;
export const SYNC_WS_PATH = "/sync";

export function getSyncWsUrl(host = "localhost"): string {
  return `ws://${host}:${SYNC_WS_PORT}${SYNC_WS_PATH}`;
}
