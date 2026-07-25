export type DistortionMode =
  | "none"
  | "stretch-h"
  | "stretch-v"
  | "barrel"
  | "pinch"
  | "skew-x";

export interface DistortionSettings {
  mode: DistortionMode;
  /** 0.0 – 1.0 */
  intensity: number;
}

export const DEFAULT_DISTORTION: DistortionSettings = {
  mode: "none",
  intensity: 0.5,
};

export const DISTORTION_MODES: { id: DistortionMode; label: string; description: string }[] = [
  { id: "none", label: "None", description: "No distortion applied" },
  { id: "stretch-h", label: "Stretch H", description: "Horizontal stretch" },
  { id: "stretch-v", label: "Stretch V", description: "Vertical stretch" },
  { id: "barrel", label: "Barrel", description: "Barrel (fisheye) warp" },
  { id: "pinch", label: "Pinch", description: "Pinch (pincushion) warp" },
  { id: "skew-x", label: "Skew", description: "Horizontal shear" },
];
