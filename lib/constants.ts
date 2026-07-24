export const QA_ENVIRONMENT = "qa" as const;

export const MEDIAPIPE_WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

export const FACE_LANDMARKER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export const SELFIE_SEGMENTER_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

export type CameraFacing = "user" | "environment";

export function getCameraConstraints(
  facingMode: CameraFacing
): MediaStreamConstraints {
  return {
    video: {
      facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };
}

export function getCameraFallbackConstraints(
  facingMode: CameraFacing
): MediaStreamConstraints {
  return {
    video: {
      facingMode,
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  };
}

export const CAMERA_CONSTRAINTS = getCameraConstraints("user");
export const CAMERA_FALLBACK_CONSTRAINTS = getCameraFallbackConstraints("user");

export const BACKGROUND_PRESETS = [
  { id: "office", label: "Office", path: "/backgrounds/office.svg" },
  { id: "neutral", label: "Neutral", path: "/backgrounds/neutral.svg" },
  { id: "outdoor", label: "Outdoor", path: "/backgrounds/outdoor.svg" },
] as const;

export type BackgroundMode = "none" | "blur" | "solid" | "preset";

export const SESSION_STORAGE_KEY = "kyc-verify-session";
