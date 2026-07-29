import { create } from "zustand";
import type { CameraFacing } from "@/lib/constants";

const PREFS_STORAGE_KEY = "kyc-verify-preferences";

export type UiDensity = "comfortable" | "compact";

interface PreferencesState {
  cameraFacing: CameraFacing;
  lastWsUrl: string;
  panelLayout: "split" | "stacked";
  density: UiDensity;
  operatorDisplayName: string;
  hydrated: boolean;
  setCameraFacing: (facing: CameraFacing) => void;
  setLastWsUrl: (url: string) => void;
  setPanelLayout: (layout: "split" | "stacked") => void;
  setDensity: (density: UiDensity) => void;
  setOperatorDisplayName: (name: string) => void;
  hydrate: () => void;
  persist: () => void;
}

const defaults = {
  cameraFacing: "user" as CameraFacing,
  lastWsUrl: "ws://127.0.0.1:3001",
  panelLayout: "split" as const,
  density: "comfortable" as UiDensity,
  operatorDisplayName: "local@console",
  hydrated: false,
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...defaults,

  setCameraFacing: (cameraFacing) => {
    set({ cameraFacing });
    get().persist();
  },

  setLastWsUrl: (lastWsUrl) => {
    set({ lastWsUrl });
    get().persist();
  },

  setPanelLayout: (panelLayout) => {
    set({ panelLayout });
    get().persist();
  },

  setDensity: (density) => {
    set({ density });
    get().persist();
  },

  setOperatorDisplayName: (operatorDisplayName) => {
    set({ operatorDisplayName });
    get().persist();
  },

  persist: () => {
    if (typeof window === "undefined") return;
    const {
      cameraFacing,
      lastWsUrl,
      panelLayout,
      density,
      operatorDisplayName,
    } = get();
    localStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        cameraFacing,
        lastWsUrl,
        panelLayout,
        density,
        operatorDisplayName,
      })
    );
  },

  hydrate: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) {
      set({ hydrated: true });
      return;
    }
    try {
      const data = JSON.parse(raw) as Partial<
        Pick<
          PreferencesState,
          | "cameraFacing"
          | "lastWsUrl"
          | "panelLayout"
          | "density"
          | "operatorDisplayName"
        >
      >;
      set({
        cameraFacing: data.cameraFacing ?? defaults.cameraFacing,
        lastWsUrl: data.lastWsUrl ?? defaults.lastWsUrl,
        panelLayout: data.panelLayout ?? defaults.panelLayout,
        density: data.density ?? defaults.density,
        operatorDisplayName:
          data.operatorDisplayName ?? defaults.operatorDisplayName,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));
