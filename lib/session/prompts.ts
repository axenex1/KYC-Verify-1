import type { LivenessPrompt, LivenessPromptId } from "./types";

export const STANDARD_PROMPT_SET = "standard-v1";

export const LIVENESS_PROMPTS: LivenessPrompt[] = [
  {
    id: "center_face",
    title: "Center your face",
    instruction: "Position your face in the center of the frame.",
    timeoutMs: 15000,
    maxAttempts: 3,
  },
  {
    id: "blink_twice",
    title: "Blink twice",
    instruction: "Blink your eyes twice naturally.",
    timeoutMs: 20000,
    maxAttempts: 3,
  },
  {
    id: "turn_left",
    title: "Turn head left",
    instruction: "Slowly turn your head to the left.",
    timeoutMs: 15000,
    maxAttempts: 3,
  },
  {
    id: "turn_right",
    title: "Turn head right",
    instruction: "Slowly turn your head to the right.",
    timeoutMs: 15000,
    maxAttempts: 3,
  },
  {
    id: "smile",
    title: "Smile",
    instruction: "Give a natural smile for the camera.",
    timeoutMs: 15000,
    maxAttempts: 3,
  },
  {
    id: "hold_still",
    title: "Hold still",
    instruction: "Keep your face steady and look at the camera for 2 seconds.",
    timeoutMs: 10000,
    maxAttempts: 3,
  },
];

export const PROMPT_THRESHOLDS = {
  centerFaceMinStability: 0.7,
  blinkEarThreshold: 0.21,
  blinkMinCount: 2,
  turnLeftYawDeg: -12,
  turnRightYawDeg: 12,
  smileMinRatio: 0.35,
  holdStillMinStability: 0.85,
  holdStillDurationMs: 2000,
} as const;

export function getPromptById(id: LivenessPromptId): LivenessPrompt {
  const prompt = LIVENESS_PROMPTS.find((p) => p.id === id);
  if (!prompt) {
    throw new Error(`Unknown prompt id: ${id}`);
  }
  return prompt;
}

export function evaluatePrompt(
  promptId: LivenessPromptId,
  signals: {
    faceDetected: boolean;
    blinkCount: number;
    yawDeg: number;
    smileRatio: number;
    faceCentered: boolean;
    stabilityScore: number;
    holdStillMs: number;
  }
): { passed: boolean; confidence: number } {
  if (!signals.faceDetected) {
    return { passed: false, confidence: 0 };
  }

  switch (promptId) {
    case "center_face": {
      const confidence = signals.faceCentered
        ? Math.min(1, signals.stabilityScore)
        : signals.stabilityScore * 0.5;
      return {
        passed:
          signals.faceCentered &&
          signals.stabilityScore >= PROMPT_THRESHOLDS.centerFaceMinStability,
        confidence,
      };
    }
    case "blink_twice": {
      const ratio = Math.min(
        1,
        signals.blinkCount / PROMPT_THRESHOLDS.blinkMinCount
      );
      return {
        passed: signals.blinkCount >= PROMPT_THRESHOLDS.blinkMinCount,
        confidence: ratio,
      };
    }
    case "turn_left": {
      const delta = Math.abs(signals.yawDeg - PROMPT_THRESHOLDS.turnLeftYawDeg);
      const confidence = Math.max(0, 1 - delta / 20);
      return {
        passed: signals.yawDeg <= PROMPT_THRESHOLDS.turnLeftYawDeg,
        confidence: Math.min(1, confidence),
      };
    }
    case "turn_right": {
      const delta = Math.abs(signals.yawDeg - PROMPT_THRESHOLDS.turnRightYawDeg);
      const confidence = Math.max(0, 1 - delta / 20);
      return {
        passed: signals.yawDeg >= PROMPT_THRESHOLDS.turnRightYawDeg,
        confidence: Math.min(1, confidence),
      };
    }
    case "smile": {
      const confidence = Math.min(
        1,
        signals.smileRatio / PROMPT_THRESHOLDS.smileMinRatio
      );
      return {
        passed: signals.smileRatio >= PROMPT_THRESHOLDS.smileMinRatio,
        confidence,
      };
    }
    case "hold_still": {
      const stabilityConfidence = signals.stabilityScore;
      const durationConfidence = Math.min(
        1,
        signals.holdStillMs / PROMPT_THRESHOLDS.holdStillDurationMs
      );
      const confidence = (stabilityConfidence + durationConfidence) / 2;
      return {
        passed:
          signals.stabilityScore >= PROMPT_THRESHOLDS.holdStillMinStability &&
          signals.holdStillMs >= PROMPT_THRESHOLDS.holdStillDurationMs,
        confidence: Math.min(1, confidence),
      };
    }
    default: {
      const _exhaustive: never = promptId;
      return _exhaustive;
    }
  }
}
