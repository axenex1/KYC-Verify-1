export const RUNWAY_VOICE_PRESETS = [
  { id: "clara", label: "Clara", hint: "soft" },
  { id: "victoria", label: "Victoria", hint: "firm" },
  { id: "vincent", label: "Vincent", hint: "authoritative" },
  { id: "adrian", label: "Adrian", hint: "neutral" },
  { id: "mia", label: "Mia", hint: "warm" },
  { id: "marcus", label: "Marcus", hint: "steady" },
  { id: "skye", label: "Skye", hint: "bright" },
  { id: "drew", label: "Drew", hint: "calm" },
] as const;

export type RunwayVoicePresetId = (typeof RUNWAY_VOICE_PRESETS)[number]["id"];

export const DEFAULT_RUNWAY_VOICE: RunwayVoicePresetId = "clara";

export const DEFAULT_AVATAR_PERSONALITY =
  "You are a synthetic identity used only in an authorized KYC red-team engagement. Answer briefly and stay in character as the document subject.";
