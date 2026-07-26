"use client";

import { cn } from "@/lib/utils";
import { DISTORTION_MODES } from "@/lib/distortion/types";
import type { DistortionSettings } from "@/lib/distortion/types";

interface DistortionPickerProps {
  settings: DistortionSettings;
  onChange: (settings: DistortionSettings) => void;
}

export function DistortionPicker({ settings, onChange }: DistortionPickerProps) {
  const handleModeChange = (mode: DistortionSettings["mode"]) => {
    onChange({ ...settings, mode });
  };

  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...settings, intensity: Number(e.target.value) / 100 });
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Selfie Distortion{" "}
          <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            QA only
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DISTORTION_MODES.map((dm) => (
            <button
              key={dm.id}
              type="button"
              title={dm.description}
              onClick={() => handleModeChange(dm.id)}
              className={cn(
                "rounded-md border px-3 py-1 text-sm transition-colors",
                settings.mode === dm.id
                  ? "border-violet-600 bg-violet-600 text-white dark:border-violet-400 dark:bg-violet-500"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              )}
            >
              {dm.label}
            </button>
          ))}
        </div>
      </div>

      {settings.mode !== "none" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Intensity
            </span>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {Math.round(settings.intensity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(settings.intensity * 100)}
            onChange={handleIntensityChange}
            className="h-1.5 w-full cursor-pointer accent-violet-600"
            aria-label="Distortion intensity"
          />
        </div>
      )}
    </div>
  );
}
