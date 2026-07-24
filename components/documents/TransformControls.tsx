"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DOCUMENT_TRANSFORM,
  type DocumentTransform,
} from "@/lib/documents/transforms";

interface TransformControlsProps {
  pending: DocumentTransform;
  applied: DocumentTransform;
  onChange: (transform: DocumentTransform) => void;
  onRequestApply: () => void;
  onReset: () => void;
  className?: string;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: SliderRowProps) {
  return (
    <label className="block space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-zinc-500">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer accent-foreground"
      />
    </label>
  );
}

export function TransformControls({
  pending,
  applied,
  onChange,
  onRequestApply,
  onReset,
  className,
}: TransformControlsProps) {
  const hasPendingChanges =
    pending.scale !== applied.scale ||
    pending.rotationDeg !== applied.rotationDeg ||
    pending.skewX !== applied.skewX ||
    pending.skewY !== applied.skewY;

  const update = (partial: Partial<DocumentTransform>) => {
    onChange({ ...pending, ...partial });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-sm font-medium">Transform controls</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Adjust values, then confirm before each change is applied.
      </p>

      <div className="space-y-3">
        <SliderRow
          label="Scale"
          value={pending.scale}
          min={0.5}
          max={2}
          step={0.05}
          unit="×"
          onChange={(scale) => update({ scale })}
        />
        <SliderRow
          label="Rotation"
          value={pending.rotationDeg}
          min={-45}
          max={45}
          step={1}
          unit="°"
          onChange={(rotationDeg) => update({ rotationDeg })}
        />
        <SliderRow
          label="Warp X (skew)"
          value={pending.skewX}
          min={-0.3}
          max={0.3}
          step={0.01}
          onChange={(skewX) => update({ skewX })}
        />
        <SliderRow
          label="Warp Y (skew)"
          value={pending.skewY}
          min={-0.3}
          max={0.3}
          step={0.01}
          onChange={(skewY) => update({ skewY })}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={onRequestApply}
          disabled={!hasPendingChanges}
          className="min-h-11 flex-1"
        >
          Apply adjustment…
        </Button>
        <Button
          variant="outline"
          onClick={onReset}
          className="min-h-11"
        >
          Reset
        </Button>
      </div>

      {hasPendingChanges && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Unconfirmed changes — preview only until you apply.
        </p>
      )}
    </div>
  );
}

export { DEFAULT_DOCUMENT_TRANSFORM };
