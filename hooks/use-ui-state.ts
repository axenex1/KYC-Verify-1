"use client";

import { useSessionStore } from "@/lib/session/store";
import { usePreferencesStore } from "@/lib/preferences/store";

/** Thin selectors for UI — keep camera/WebRTC refs out of these stores. */
export function useSessionUi() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const status = useSessionStore((s) => s.status);
  const currentStepIndex = useSessionStore((s) => s.currentStepIndex);
  const promptResults = useSessionStore((s) => s.promptResults);
  const error = useSessionStore((s) => s.error);
  const motionSignals = useSessionStore((s) => s.motionSignals);

  return {
    sessionId,
    status,
    currentStepIndex,
    promptResults,
    error,
    motionSignals,
  };
}

export function usePreferencesUi() {
  const cameraFacing = usePreferencesStore((s) => s.cameraFacing);
  const lastWsUrl = usePreferencesStore((s) => s.lastWsUrl);
  const panelLayout = usePreferencesStore((s) => s.panelLayout);
  const density = usePreferencesStore((s) => s.density);
  const setCameraFacing = usePreferencesStore((s) => s.setCameraFacing);
  const setLastWsUrl = usePreferencesStore((s) => s.setLastWsUrl);
  const setPanelLayout = usePreferencesStore((s) => s.setPanelLayout);
  const setDensity = usePreferencesStore((s) => s.setDensity);

  return {
    cameraFacing,
    lastWsUrl,
    panelLayout,
    density,
    setCameraFacing,
    setLastWsUrl,
    setPanelLayout,
    setDensity,
  };
}
