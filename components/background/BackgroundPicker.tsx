"use client";

import type { BackgroundMode } from "@/lib/constants";
import { BACKGROUND_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Monitor, Droplets, Square, Image } from "lucide-react";

interface BackgroundPickerProps {
  mode: BackgroundMode;
  presetId: string;
  onModeChange: (mode: BackgroundMode) => void;
  onPresetChange: (presetId: string) => void;
  lowLightWarning?: boolean;
}

const MODES: {
  id: BackgroundMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "none", label: "Raw", icon: Monitor },
  { id: "blur", label: "Blur", icon: Droplets },
  { id: "solid", label: "Solid", icon: Square },
  { id: "preset", label: "Preset", icon: Image },
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
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Background
        </p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onModeChange(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                  mode === item.id
                    ? "border-primary/40 bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "border-zinc-200 bg-card text-muted-foreground hover:bg-accent hover:text-foreground dark:border-zinc-800"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "preset" && (
        <div className="rounded-lg border border-zinc-200/60 bg-zinc-50/50 p-3 dark:border-zinc-800/60 dark:bg-zinc-900/50">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preset scene
          </p>
          <div className="flex flex-wrap gap-2">
            {BACKGROUND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPresetChange(preset.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                  presetId === preset.id
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300"
                    : "border-zinc-200 bg-card text-muted-foreground hover:bg-accent hover:text-foreground dark:border-zinc-800"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {lowLightWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-100">
          <div className="mt-0.5 h-3 w-3 shrink-0 rounded-full bg-amber-400" />
          Low ambient light detected — consider enabling blur or solid
          background.
        </div>
      )}
    </div>
  );
}
