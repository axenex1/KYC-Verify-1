"use client";

import { cn } from "@/lib/utils";
import { Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";

interface CameraPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading?: boolean;
  lowFps?: boolean;
  faceDetected?: boolean;
  className?: string;
}

export function CameraPreview({
  canvasRef,
  isLoading,
  lowFps,
  faceDetected,
  className,
}: CameraPreviewProps) {
  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-zinc-950 shadow-lg",
        "ring-1 ring-zinc-800/50",
        className
      )}
    >
      <canvas ref={canvasRef} className="h-full w-full object-cover" />

      {/* Overlay gradient at bottom for status badges */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/90">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 ring-1 ring-zinc-700">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-200">
              Loading vision models
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              MediaPipe face landmarker &amp; segmentation
            </p>
          </div>
        </div>
      )}

      {/* Status badges */}
      <div className="absolute bottom-3 left-3 flex gap-2">
        {/* Face detection badge */}
        {faceDetected !== undefined && !isLoading && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm",
              faceDetected
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                : "bg-zinc-500/20 text-zinc-300 ring-1 ring-zinc-500/30"
            )}
          >
            {faceDetected ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            {faceDetected ? "Face detected" : "No face"}
          </span>
        )}

        {/* Low FPS badge */}
        {lowFps && !isLoading && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-300 backdrop-blur-sm ring-1 ring-amber-500/30">
            <AlertTriangle className="h-3 w-3" />
            Low FPS
          </span>
        )}
      </div>

      {/* Center crosshair when face is not detected */}
      {faceDetected === false && !isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-zinc-500/30">
            <div className="h-20 w-20 rounded-full border border-zinc-500/20" />
          </div>
        </div>
      )}
    </div>
  );
}
