"use client";

import { useEffect, useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";

interface LiveHeadPreviewProps {
  imageUrl: string | null;
  yawDeg: number;
  pitchDeg: number;
  className?: string;
  /** Optional canvas ref for MediaRecorder capture. */
  canvasRef?: RefObject<HTMLCanvasElement | null>;
}

/**
 * Live pose preview of the cropped ID face using CSS 3D + canvas mirror
 * for saveable recordings.
 */
export function LiveHeadPreview({
  imageUrl,
  yawDeg,
  pitchDeg,
  className,
  canvasRef,
}: LiveHeadPreviewProps) {
  const localCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      imgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef?.current ?? localCanvasRef.current;
    if (!canvas || !imageUrl) return;

    let raf = 0;
    const draw = () => {
      const img = imgRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = canvas.width;
      ctx.fillStyle = "#0a0c10";
      ctx.fillRect(0, 0, size, size);

      if (img) {
        ctx.save();
        ctx.translate(size / 2, size / 2);
        // Approximate perspective: yaw → rotateY, pitch → rotateX via 2D skew/scale.
        const yawRad = (yawDeg * Math.PI) / 180;
        const pitchRad = (pitchDeg * Math.PI) / 180;
        const scaleX = Math.max(0.55, Math.cos(yawRad));
        const scaleY = Math.max(0.65, Math.cos(pitchRad));
        const skewX = Math.sin(yawRad) * 0.18;
        const offsetY = Math.sin(pitchRad) * size * 0.08;
        ctx.transform(scaleX, Math.sin(pitchRad) * 0.05, skewX, scaleY, 0, offsetY);
        const drawSize = size * 0.92;
        ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, imageUrl, yawDeg, pitchDeg]);

  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden border border-line bg-console-rail",
        className
      )}
      style={{ perspective: "900px" }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Live head pose preview"
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          style={{
            transform: `rotateY(${-yawDeg}deg) rotateX(${pitchDeg}deg) scale(1.02)`,
            transformStyle: "preserve-3d",
            transition: "transform 120ms cubic-bezier(0.23, 1, 0.32, 1)",
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          awaiting face crop
        </div>
      )}
      <canvas
        ref={canvasRef ?? localCanvasRef}
        width={512}
        height={512}
        className="pointer-events-none absolute -left-[9999px] h-px w-px opacity-0"
        aria-hidden
      />
    </div>
  );
}
