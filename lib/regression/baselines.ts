/**
 * Regression baselines for QA session quality.
 * Dashboard and CLI regression script compare real session aggregates against these.
 */
export const REGRESSION_BASELINES = {
  /** Minimum acceptable average pass-rate across all sessions */
  minAvgPassRate: 0.8,
  /** Maximum acceptable average session duration (ms) */
  maxAvgDurationMs: 120_000,
  /** Per-prompt minimum acceptable pass-rate */
  perPrompt: {
    center_face: 0.9,
    blink_twice: 0.85,
    turn_left: 0.8,
    turn_right: 0.8,
    smile: 0.85,
    hold_still: 0.9,
  } as Record<string, number>,
  /** Minimum sessions required before regression checks apply */
  minSessions: 3,
} as const;

export interface RegressionCheck {
  name: string;
  value: number;
  threshold: number;
  passed: boolean;
  unit?: string;
}

export interface RegressionResult {
  meetsBaseline: boolean;
  checkedAt: string;
  sessionCount: number;
  sufficientData: boolean;
  checks: RegressionCheck[];
}
