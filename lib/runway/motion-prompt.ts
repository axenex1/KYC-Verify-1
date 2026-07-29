export interface HeadMotionControls {
  /** Negative = turn left, positive = turn right. Degrees roughly -35..35. */
  yawDeg: number;
  /** Negative = look up, positive = look down. Degrees roughly -25..25. */
  pitchDeg: number;
  /** Soft expression intensity 1-5 for prompt wording. */
  expression: number;
  /** Output clip length in seconds (2-8). */
  durationSec: number;
}

/** Canonical liveness sweep used for every generation so motion stays consistent. */
export const PERSISTENT_LIVENESS_CONTROLS: HeadMotionControls = {
  yawDeg: 0,
  pitchDeg: 0,
  expression: 3,
  durationSec: 8,
};

export interface HeadMotionKeyframe {
  yawDeg: number;
  pitchDeg: number;
  /** Normalized 0..1 position in the clip. */
  t: number;
  label: string;
}

/**
 * Fixed keyframe timeline:
 * center → left → center → right → center → up → center → down → center
 * → subtle left (~8°) → center → subtle right (~8°) → center.
 * Shared by live CSS scrub and Runway prompt so character movement is persistent.
 */
export const PERSISTENT_LIVENESS_KEYFRAMES: HeadMotionKeyframe[] = [
  { t: 0, yawDeg: 0, pitchDeg: 0, label: "center" },
  { t: 0.1, yawDeg: -25, pitchDeg: 0, label: "left" },
  { t: 0.2, yawDeg: 0, pitchDeg: 0, label: "center" },
  { t: 0.3, yawDeg: 25, pitchDeg: 0, label: "right" },
  { t: 0.4, yawDeg: 0, pitchDeg: 0, label: "center" },
  { t: 0.5, yawDeg: 0, pitchDeg: -15, label: "up" },
  { t: 0.58, yawDeg: 0, pitchDeg: 0, label: "center" },
  { t: 0.66, yawDeg: 0, pitchDeg: 15, label: "down" },
  { t: 0.74, yawDeg: 0, pitchDeg: 0, label: "center" },
  { t: 0.82, yawDeg: -8, pitchDeg: 0, label: "subtle-left" },
  { t: 0.88, yawDeg: 0, pitchDeg: 0, label: "center" },
  { t: 0.94, yawDeg: 8, pitchDeg: 0, label: "subtle-right" },
  { t: 1, yawDeg: 0, pitchDeg: 0, label: "center" },
];

/**
 * Deterministic Runway prompt: same head-tilt sequence on every generation
 * (left / right / up / down) plus a soft subtle left/right finish.
 */
export function buildPersistentHeadMotionPrompt(
  expression: number = PERSISTENT_LIVENESS_CONTROLS.expression
): string {
  const intensity =
    expression >= 4
      ? "natural micro-expressions and soft blinks"
      : expression <= 2
        ? "subtle, restrained facial motion"
        : "gentle facial motion and a soft blink";

  return [
    "Photorealistic passport-style headshot of the exact same person,",
    "locked identity, clothing, hair, skin tone, and facial structure from the reference image,",
    "perform this exact liveness head-motion sequence every time:",
    "start facing the camera,",
    "slowly turn head left about 25 degrees,",
    "return to center,",
    "slowly turn head right about 25 degrees,",
    "return to center,",
    "tilt chin slightly upward about 15 degrees,",
    "return to center,",
    "tilt chin slightly downward about 15 degrees,",
    "return to center,",
    "then finish with a very slight head turn left about 8 degrees,",
    "return to center,",
    "then a very slight head turn right about 8 degrees,",
    "return to center and hold still,",
    intensity + ",",
    "stable framing, soft studio lighting, no background change,",
    "no camera pan, no zoom, no text overlays, no identity drift.",
  ].join(" ");
}

export function samplePersistentPose(progress01: number): {
  yawDeg: number;
  pitchDeg: number;
  label: string;
} {
  const t = Math.min(1, Math.max(0, progress01));
  const frames = PERSISTENT_LIVENESS_KEYFRAMES;
  let i = 0;
  while (i < frames.length - 1 && frames[i + 1]!.t < t) i += 1;
  const a = frames[i]!;
  const b = frames[Math.min(i + 1, frames.length - 1)]!;
  const span = Math.max(1e-6, b.t - a.t);
  const u = (t - a.t) / span;
  const eased = u * u * (3 - 2 * u);
  return {
    yawDeg: a.yawDeg + (b.yawDeg - a.yawDeg) * eased,
    pitchDeg: a.pitchDeg + (b.pitchDeg - a.pitchDeg) * eased,
    label: eased < 0.5 ? a.label : b.label,
  };
}

export function buildHeadMotionPrompt(controls: HeadMotionControls): string {
  const yaw = Math.round(controls.yawDeg);
  const pitch = Math.round(controls.pitchDeg);
  const yawDir =
    Math.abs(yaw) < 4
      ? "facing the camera"
      : yaw < 0
        ? `slowly turning their head to their right about ${Math.abs(yaw)} degrees`
        : `slowly turning their head to their left about ${yaw} degrees`;
  const pitchDir =
    Math.abs(pitch) < 4
      ? "with a level gaze"
      : pitch < 0
        ? `tilting the chin slightly upward about ${Math.abs(pitch)} degrees`
        : `tilting the chin slightly downward about ${pitch} degrees`;

  const intensity =
    controls.expression >= 4
      ? "natural micro-expressions and soft blinks"
      : controls.expression <= 2
        ? "subtle, restrained facial motion"
        : "gentle facial motion and a soft blink";

  return [
    "Photorealistic passport-style headshot of the same person,",
    "locked identity and clothing from the reference image,",
    yawDir + ",",
    pitchDir + ",",
    intensity + ",",
    "stable framing, soft studio lighting, no background change,",
    "no camera pan, no zoom, no text overlays.",
  ].join(" ");
}

export function describeMotion(controls: HeadMotionControls): string {
  const parts: string[] = [];
  if (Math.abs(controls.yawDeg) >= 4) {
    parts.push(controls.yawDeg < 0 ? "yaw left" : "yaw right");
  }
  if (Math.abs(controls.pitchDeg) >= 4) {
    parts.push(controls.pitchDeg < 0 ? "pitch up" : "pitch down");
  }
  if (parts.length === 0) parts.push("hold still");
  return parts.join(" · ");
}

export function describePersistentMotion(): string {
  return "left · right · up · down · soft L/R";
}
