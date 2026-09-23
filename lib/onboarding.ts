export const ONBOARDING_KEY = "kyc-first-load";

export type OnboardingStage = "intro" | "pick" | "guide";

export type UseCaseId = "forge" | "avatar" | "inject" | "liveness";

export interface UseCase {
  id: UseCaseId;
  title: string;
  copy: string;
  href: string;
  cta: string;
  steps: string[];
}

export const USE_CASES: UseCase[] = [
  {
    id: "forge",
    title: "Forge an AU card",
    copy: "One selfie becomes a lookalike AU card and a paired Runway avatar.",
    href: "/forge?tab=face&task=forge",
    cta: "Open Forge hub",
    steps: [
      "Drop a selfie.",
      "Lock identity and generate the plate.",
      "Generate the Runway avatar, then arm the pack.",
    ],
  },
  {
    id: "avatar",
    title: "Make an avatar clip",
    copy: "Same selfie as the plate — Runway clip + stills in the identity pack.",
    href: "/forge?tab=avatar&task=avatar",
    cta: "Open Avatar",
    steps: [
      "Use the pack selfie (or drop one).",
      "Generate the clip. Identity is attached as knowledge.",
      "Arm the pack from Library, then inject.",
    ],
  },
  {
      id: "inject",
      title: "Inject into a camera",
      copy: "Arm a pack, run the desktop loop, optionally pair companion. Zygisk is optional lab phone.",
      href: "/inject?task=inject",
      cta: "Open Injector",
      steps: [
        "Arm a pack video from Library (or Forge).",
        "Start desktop loop for OBS / virtcam.",
        "Optional: companion pair. Zygisk only on rooted lab devices.",
      ],
    },
  {
    id: "liveness",
    title: "Test liveness",
    copy: "Run a session against blink, turn, and prompt checks.",
    href: "/verify?task=liveness",
    cta: "Open Liveness",
    steps: [
      "Open a liveness session.",
      "Arm a saved avatar or live camera.",
      "Walk the prompts and watch the result.",
    ],
  },
];

export function getUseCase(id: string | null): UseCase | undefined {
  return USE_CASES.find((item) => item.id === id);
}

export function readOnboarding(): { stage: OnboardingStage; useCase: UseCaseId | null } {
  if (typeof window === "undefined") {
    return { stage: "intro", useCase: null };
  }
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return { stage: "intro", useCase: null };
    const parsed = JSON.parse(raw) as { stage?: OnboardingStage; useCase?: UseCaseId | null };
    const stage = parsed.stage === "pick" || parsed.stage === "guide" || parsed.stage === "intro" ? parsed.stage : "intro";
    const useCase = parsed.useCase && USE_CASES.some((item) => item.id === parsed.useCase) ? parsed.useCase : null;
    return { stage, useCase };
  } catch {
    return { stage: "intro", useCase: null };
  }
}

export function writeOnboarding(stage: OnboardingStage, useCase: UseCaseId | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ stage, useCase }));
}
