import type { HeadMotionControls } from "@/lib/runway/motion-prompt";

/**
 * Desktop → mobile WebRTC contract (consumed by a future native Companion).
 *
 * - Stream label: `desktop_to_mobile`
 * - Source: hidden canvas `captureStream(15)` on the desktop controller
 * - Typical canvas size: 1280×720 (document) or source clip resolution (avatar)
 * - Peer role: desktop initiates offer when `shouldInitiate("desktop_to_mobile")`
 * - Companion must accept the inbound track and may present it to KYC flows
 */
export const DESKTOP_TO_MOBILE_STREAM_TYPE = "desktop_to_mobile" as const;
export const DESKTOP_TO_MOBILE_CAPTURE_FPS = 15;

export type HeadTiltPose = Pick<
  HeadMotionControls,
  "yawDeg" | "pitchDeg" | "expression" | "durationSec"
>;

/** Armed avatar motion clip shared by Document Gen → Probe → Companion. */
export interface HarnessAvatarClip {
  clipUrl: string;
  avatarId?: string | null;
  avatarName?: string | null;
  sourceFileName?: string | null;
  pose?: HeadTiltPose | null;
  armedAt: string;
  /** Originating session when armed from a live probe, if known. */
  sessionId?: string | null;
}

export interface ArmAvatarClipInput {
  clipUrl: string;
  avatarId?: string | null;
  avatarName?: string | null;
  sourceFileName?: string | null;
  pose?: HeadTiltPose | null;
  sessionId?: string | null;
}

export type CompanionOutboundMode = "document" | "avatar";
