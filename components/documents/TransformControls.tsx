"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_DOCUMENT_TRANSFORM,
  type DocumentTransform,
} from "@/lib/documents/transforms";
import { RotateCcw, Check, Maximize, RotateCw, ArrowUpDown } from "lucide-react";

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
  icon?: React.ComponentType<{ className?: string }>;
  onChange: (value: number) => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  icon: Icon,
  onChange,
}: SliderRowProps) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
          {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
          {label}
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
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
        className="h-1.5 w-full cursor-pointer rounded-full bg-zinc-200 accent-primary dark:bg-zinc-700"
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
      <p className="text-sm font-semibold tracking-tight">Transform</p>

      <div className="space-y-3">
        <SliderRow
          label="Scale"
          value={pending.scale}
          min={0.5}
          max={2}
          step={0.05}
          icon={Maximize}
          onChange={(v) => update({ scale: v })}
        />
        <SliderRow
          label="Rotation"
          value={pending.rotationDeg}
          min={-45}
          max={45}
          step={1}
          unit="°"
          icon={RotateCw}
          onChange={(v) => update({ rotationDeg: v })}
        />
        <SliderRow
          label="Skew X"
          value={pending.skewX}
          min={-30}
          max={30}
          step={1}
          unit="°"
          icon={ArrowUpDown}
          onChange={(v) => update({ skewX: v })}
        />
        <SliderRow
          label="Skew Y"
          value={pending.skewY}
          min={-30}
          max={30}
          step={1}
          unit="°"
          icon={ArrowUpDown}
          onChange={(v) => update({ skewY: v })}
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button
          size="sm"
          onClick={onRequestApply}
          disabled={!hasPendingChanges}
          className="gap-1.5"
        >
          <Check className="h-3.5 w-3.5" />
          Apply Transform
        </Button>
      </div>
    </div>
  );
}

export { DEFAULT_DOCUMENT_TRANSFORM };
