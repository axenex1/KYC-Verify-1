"use client";

import { cn } from "@/lib/utils";

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
        "relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 dark:border-zinc-800",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full object-cover"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
          <p className="text-sm text-zinc-300">Loading vision models...</p>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex gap-2">
        {faceDetected !== undefined && (
          <span
            className={cn(
              "rounded-full px-2 py-1 text-xs font-medium",
              faceDetected
                ? "bg-emerald-500/90 text-white"
                : "bg-zinc-600/90 text-white"
            )}
          >
            {faceDetected ? "Face detected" : "No face"}
          </span>
        )}
        {lowFps && (
          <span className="rounded-full bg-amber-500/90 px-2 py-1 text-xs font-medium text-white">
            Low FPS
          </span>
        )}
      </div>
    </div>
  );
}
