/**
 * KYC harness library — desktop avatar generation, arm, and inject surface.
 *
 * Import from `@/lib/harness` in Electron/desktop UI and Probe vectors.
 * Native Android Companion (`android/`) consumes `desktop_to_mobile` WebRTC
 * plus `/companion/clip` push over adb reverse — see docs/companion-protocol.md.
 */

export {
  DESKTOP_TO_MOBILE_CAPTURE_FPS,
  DESKTOP_TO_MOBILE_STREAM_TYPE,
  type ArmAvatarClipInput,
  type CompanionOutboundMode,
  type HarnessAvatarClip,
  type HeadTiltPose,
} from "./types";

export {
  HARNESS_MOTION_MODEL,
  HARNESS_MOTION_RATIO,
  buildHeadMotionPrompt,
  buildPersistentHeadMotionPrompt,
  describeMotion,
  describePersistentMotion,
  getRunwayClient,
  isRunwayConfigured,
  PERSISTENT_LIVENESS_CONTROLS,
  PERSISTENT_LIVENESS_KEYFRAMES,
  samplePersistentPose,
  startHeadMotionTask,
  type HeadMotionControls,
  type HeadMotionKeyframe,
  type HeadMotionMode,
  type StartHeadMotionInput,
  type StartHeadMotionResult,
} from "./avatar-runway";

export {
  createLoopingClipStream,
  downloadBlob,
  downloadUrl,
  type LoopingClipHandle,
  type LoopingClipOptions,
} from "./export-video";

export {
  armAvatarClip,
  clearArmedAvatarClip,
  getArmedAvatarClip,
  subscribeArmedAvatarClip,
} from "./armed-clip-store";

export {
  pushCompanionClip,
  pushCompanionClipBrowser,
  type PushCompanionClipInput,
  type PushCompanionClipResult,
} from "./push-clip";
