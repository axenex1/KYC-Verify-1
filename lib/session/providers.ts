import type { LivenessPrompt, LivenessPromptId } from "./types";
import { LIVENESS_PROMPTS, evaluatePrompt } from "./prompts";

export type ProviderEvaluateSignals = {
  faceDetected: boolean;
  blinkCount: number;
  yawDeg: number;
  smileRatio: number;
  faceCentered: boolean;
  stabilityScore: number;
  holdStillMs: number;
};

export type ProviderEvaluateFn = (
  promptId: string,
  signals: ProviderEvaluateSignals
) => { passed: boolean; confidence: number };

export interface KycProvider {
  id: string;
  name: string;
  description: string;
  prompts: LivenessPrompt[];
  promptSetLabel: string;
  evaluate: ProviderEvaluateFn;
}

function makeStandardEvaluator(): ProviderEvaluateFn {
  return (promptId, signals) =>
    evaluatePrompt(promptId as LivenessPromptId, signals);
}

const standardProvider: KycProvider = {
  id: "standard",
  name: "Standard KYC",
  description:
    "Full liveness check: center face, blink twice, turn left/right, smile, hold still.",
  promptSetLabel: "standard-v1",
  prompts: LIVENESS_PROMPTS,
  evaluate: makeStandardEvaluator(),
};

const quickProvider: KycProvider = {
  id: "quick",
  name: "Quick Check",
  description:
    "Abbreviated liveness: center face, blink twice, smile.",
  promptSetLabel: "quick-v1",
  prompts: LIVENESS_PROMPTS.filter((p) =>
    (["center_face", "blink_twice", "smile"] as LivenessPromptId[]).includes(
      p.id
    )
  ),
  evaluate: makeStandardEvaluator(),
};

const minimalProvider: KycProvider = {
  id: "minimal",
  name: "Minimal (Center + Hold)",
  description: "Basic presence check: center face and hold still.",
  promptSetLabel: "minimal-v1",
  prompts: LIVENESS_PROMPTS.filter((p) =>
    (["center_face", "hold_still"] as LivenessPromptId[]).includes(p.id)
  ),
  evaluate: makeStandardEvaluator(),
};

const BUILT_IN_PROVIDERS: KycProvider[] = [
  standardProvider,
  quickProvider,
  minimalProvider,
];

export const DEFAULT_PROVIDER_ID = "standard";

export function getProvider(id: string): KycProvider {
  return BUILT_IN_PROVIDERS.find((p) => p.id === id) ?? standardProvider;
}

export function listProviders(): KycProvider[] {
  return [...BUILT_IN_PROVIDERS];
}
