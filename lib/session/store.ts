import { create } from "zustand";
import type { PromptResult, SessionMetrics } from "@/types/session";
import type { MotionSignals, SessionStatus } from "./types";
import { SESSION_STORAGE_KEY } from "@/lib/constants";

interface SessionStore {
  sessionId: string | null;
  status: SessionStatus;
  currentStepIndex: number;
  promptResults: PromptResult[];
  metrics: SessionMetrics;
  motionSignals: MotionSignals | null;
  error: string | null;
  setSessionId: (id: string) => void;
  setStatus: (status: SessionStatus) => void;
  setCurrentStepIndex: (index: number) => void;
  addPromptResult: (result: PromptResult) => void;
  setMotionSignals: (signals: MotionSignals | null) => void;
  updateMetrics: (metrics: Partial<SessionMetrics>) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  persist: () => void;
  hydrate: (sessionId: string) => void;
}

const initialState = {
  sessionId: null,
  status: "idle" as SessionStatus,
  currentStepIndex: 0,
  promptResults: [] as PromptResult[],
  metrics: {} as SessionMetrics,
  motionSignals: null as MotionSignals | null,
  error: null as string | null,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  setSessionId: (id) => set({ sessionId: id }),

  setStatus: (status) => {
    set({ status });
    get().persist();
  },

  setCurrentStepIndex: (index) => {
    set({ currentStepIndex: index });
    get().persist();
  },

  addPromptResult: (result) => {
    set((state) => ({
      promptResults: [...state.promptResults, result],
    }));
    get().persist();
  },

  setMotionSignals: (signals) => set({ motionSignals: signals }),

  updateMetrics: (metrics) => {
    set((state) => ({
      metrics: { ...state.metrics, ...metrics },
    }));
    get().persist();
  },

  setError: (error) => set({ error }),

  reset: () => set({ ...initialState }),

  persist: () => {
    if (typeof window === "undefined") return;
    const state = get();
    if (!state.sessionId) return;

    const payload = {
      sessionId: state.sessionId,
      currentStepIndex: state.currentStepIndex,
      promptResults: state.promptResults,
      status: state.status,
    };

    sessionStorage.setItem(
      `${SESSION_STORAGE_KEY}:${state.sessionId}`,
      JSON.stringify(payload)
    );
  },

  hydrate: (sessionId) => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(`${SESSION_STORAGE_KEY}:${sessionId}`);
    if (!raw) return;

    try {
      const data = JSON.parse(raw) as {
        currentStepIndex: number;
        promptResults: PromptResult[];
        status: SessionStatus;
      };
      set({
        sessionId,
        currentStepIndex: data.currentStepIndex,
        promptResults: data.promptResults,
        status: data.status,
      });
    } catch {
      // Ignore corrupt session storage
    }
  },
}));
