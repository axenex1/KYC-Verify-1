import type { PromptResult, SessionMetrics } from "@/types/session";

export type LivenessPromptId =
  | "center_face"
  | "blink_twice"
  | "turn_left"
  | "turn_right"
  | "smile"
  | "hold_still";

export type SessionStatus =
  | "idle"
  | "initializing"
  | "active"
  | "completed"
  | "error";

export interface LivenessPrompt {
  id: LivenessPromptId;
  title: string;
  instruction: string;
  timeoutMs: number;
  maxAttempts: number;
}

export interface PersistedSessionState {
  sessionId: string;
  currentStepIndex: number;
  promptResults: PromptResult[];
  status: SessionStatus;
  backgroundMode: string;
  presetId?: string;
}

export interface MotionSignals {
  faceDetected: boolean;
  ear: number;
  blinkCount: number;
  yawDeg: number;
  pitchDeg: number;
  smileRatio: number;
  faceCentered: boolean;
  stabilityScore: number;
  fps: number;
  holdStillMs?: number;
}

export interface SessionState {
  sessionId: string | null;
  status: SessionStatus;
  currentStepIndex: number;
  promptResults: PromptResult[];
  metrics: SessionMetrics;
  motionSignals: MotionSignals | null;
  error: string | null;
}
