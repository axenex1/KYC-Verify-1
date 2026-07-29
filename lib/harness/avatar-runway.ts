import { toFile } from "@runwayml/sdk";
import { getRunwayClient, isRunwayConfigured } from "@/lib/runway/client";
import {
  buildHeadMotionPrompt,
  buildPersistentHeadMotionPrompt,
  describeMotion,
  describePersistentMotion,
  PERSISTENT_LIVENESS_CONTROLS,
  type HeadMotionControls,
} from "@/lib/runway/motion-prompt";

export {
  buildHeadMotionPrompt,
  buildPersistentHeadMotionPrompt,
  describeMotion,
  describePersistentMotion,
  PERSISTENT_LIVENESS_CONTROLS,
  PERSISTENT_LIVENESS_KEYFRAMES,
  samplePersistentPose,
  type HeadMotionControls,
  type HeadMotionKeyframe,
} from "@/lib/runway/motion-prompt";
export { getRunwayClient, isRunwayConfigured } from "@/lib/runway/client";

export const HARNESS_MOTION_MODEL = "gen4_turbo" as const;
export const HARNESS_MOTION_RATIO = "960:960" as const;

export type HeadMotionMode = "pose" | "persistent";

export interface StartHeadMotionInput {
  /** Cropped face image bytes. */
  buffer: Buffer;
  fileName?: string;
  mimeType: string;
  controls: HeadMotionControls;
  /**
   * `persistent` = fixed left/right/up/down liveness sweep (default for camera feed).
   * `pose` = single yaw/pitch target from sliders.
   */
  mode?: HeadMotionMode;
}

export interface StartHeadMotionResult {
  taskId: string;
  promptText: string;
  controls: HeadMotionControls;
  uploadUri: string;
  mode: HeadMotionMode;
}

/**
 * Server-side: upload face crop and start a Runway image-to-video head-motion task.
 * API routes should call this; keep RUNWAYML_API_SECRET off the client.
 */
export async function startHeadMotionTask(
  input: StartHeadMotionInput
): Promise<StartHeadMotionResult> {
  if (!isRunwayConfigured()) {
    throw new Error(
      "Runway is not configured. Set RUNWAYML_API_SECRET in the environment."
    );
  }

  const mode: HeadMotionMode = input.mode ?? "persistent";
  const controls =
    mode === "persistent"
      ? {
          ...PERSISTENT_LIVENESS_CONTROLS,
          expression: input.controls.expression,
          durationSec: input.controls.durationSec || PERSISTENT_LIVENESS_CONTROLS.durationSec,
        }
      : input.controls;

  const promptText =
    mode === "persistent"
      ? buildPersistentHeadMotionPrompt(controls.expression)
      : buildHeadMotionPrompt(controls);

  const client = getRunwayClient();
  const uploadable = await toFile(
    input.buffer,
    input.fileName || "face-crop.jpg",
    { type: input.mimeType }
  );
  const upload = await client.uploads.createEphemeral({ file: uploadable });

  const task = await client.imageToVideo.create({
    model: HARNESS_MOTION_MODEL,
    promptImage: upload.uri,
    promptText,
    ratio: HARNESS_MOTION_RATIO,
    duration: controls.durationSec as
      | 2
      | 3
      | 4
      | 5
      | 6
      | 7
      | 8
      | 10,
  });

  return {
    taskId: task.id,
    promptText,
    controls,
    uploadUri: upload.uri,
    mode,
  };
}
