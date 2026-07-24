"use client";

import { SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CameraFacing } from "@/lib/constants";

interface CameraSwitcherProps {
  facingMode: CameraFacing;
  onSwitch: () => void;
  disabled?: boolean;
  className?: string;
}

export function CameraSwitcher({
  facingMode,
  onSwitch,
  disabled,
  className,
}: CameraSwitcherProps) {
  const label = facingMode === "user" ? "Front camera" : "Rear camera";

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onSwitch}
      disabled={disabled}
      className={cn("min-h-11", className)}
      aria-label={`Switch camera. Currently using ${label}`}
    >
      <SwitchCamera className="h-4 w-4" />
      {label}
    </Button>
  );
}
