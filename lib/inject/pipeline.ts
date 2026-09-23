/**
 * Lab inject pipeline (authorized sandboxes only).
 *
 * Ideal chain:
 *   arm (desktop selection)
 *     → desktop virtcam / OBS loop (preview + captureStream)
 *     → companion WebRTC (desktop_to_mobile) when paired
 *     → optional Zygisk Camera2 buffer replace on rooted lab device
 *
 * Zygisk is NOT the injector. It is the optional phone HAL hook at the end.
 */

export type InjectStageId =
  | "arm"
  | "desktop_loop"
  | "companion"
  | "zygisk";

export type InjectStageStatus = "idle" | "ready" | "active" | "blocked" | "optional";

export interface InjectStage {
  id: InjectStageId;
  label: string;
  hint: string;
  status: InjectStageStatus;
}

export interface ArmedInjectPayload {
  assetId: string;
  packId?: string | null;
  kind: "video" | "document" | "still" | "selfie" | "unknown";
  label: string;
  mimeType: string;
  armedAt: string;
  source: "library" | "forge" | "api";
}

export interface InjectPipelineState {
  armed: ArmedInjectPayload | null;
  stages: InjectStage[];
  loopRunning: boolean;
  companionSessionId: string | null;
  zygiskNote: string;
}

export const PIPELINE_STAGE_DEFS: Omit<InjectStage, "status">[] = [
  {
    id: "arm",
    label: "Arm",
    hint: "Pick pack video (preferred) or document from Library / Forge",
  },
  {
    id: "desktop_loop",
    label: "Desktop loop",
    hint: "Play armed media into a canvas → captureStream for OBS / virtcam",
  },
  {
    id: "companion",
    label: "Companion",
    hint: "Optional: pair phone session, push desktop_to_mobile WebRTC",
  },
  {
    id: "zygisk",
    label: "Zygisk (optional)",
    hint: "Rooted lab device only — Magisk module replaces Camera2 planes from frame ring",
  },
];

export function buildPipelineStages(input: {
  armed: boolean;
  loopRunning: boolean;
  companionSessionId: string | null;
}): InjectStage[] {
  return PIPELINE_STAGE_DEFS.map((def) => {
    if (def.id === "arm") {
      return { ...def, status: input.armed ? "ready" : "idle" };
    }
    if (def.id === "desktop_loop") {
      if (!input.armed) return { ...def, status: "blocked" };
      return { ...def, status: input.loopRunning ? "active" : "ready" };
    }
    if (def.id === "companion") {
      if (!input.armed) return { ...def, status: "blocked" };
      return {
        ...def,
        status: input.companionSessionId ? "active" : "optional",
      };
    }
    // zygisk
    return { ...def, status: "optional" };
  });
}

export function createEmptyPipelineState(): InjectPipelineState {
  return {
    armed: null,
    stages: buildPipelineStages({ armed: false, loopRunning: false, companionSessionId: null }),
    loopRunning: false,
    companionSessionId: null,
    zygiskNote:
      "Zygisk Magisk module is optional and separate. It only runs on a rooted lab phone after companion frames hit the frame ring.",
  };
}
