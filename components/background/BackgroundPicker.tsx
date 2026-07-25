"use client";

import type { BackgroundMode } from "@/lib/constants";
import { BACKGROUND_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BackgroundPickerProps {
  mode: BackgroundMode;
  presetId: string;
  onModeChange: (mode: BackgroundMode) => void;
  onPresetChange: (presetId: string) => void;
  lowLightWarning?: boolean;
}

const MODES: { id: BackgroundMode; label: string }[] = [
  { id: "none", label: "Raw" },
  { id: "blur", label: "Blur" },
  { id: "solid", label: "Solid" },
  { id: "preset", label: "Preset" },
];

export function BackgroundPicker({
  mode,
  presetId,
  onModeChange,
  onPresetChange,
  lowLightWarning,
}: BackgroundPickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Background mode
        </p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(item.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                mode === item.id
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "preset" && (
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Preset scene
          </p>
          <div className="flex flex-wrap gap-2">
            {BACKGROUND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPresetChange(preset.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  presetId === preset.id
                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {lowLightWarning && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Background lighting appears low. Consider increasing ambient light for
          clearer captures.
        </p>
      )}
    </div>
  );
}
