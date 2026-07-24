"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  drawTransformedDocument,
  type DocumentTransform,
} from "@/lib/documents/transforms";

interface DocumentPreviewProps {
  image: HTMLImageElement | null;
  transform: DocumentTransform;
  className?: string;
}

export function DocumentPreview({
  image,
  transform,
  className,
}: DocumentPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);

    canvas.width = width;
    canvas.height = height;
    ctx.scale(dpr, dpr);

    drawTransformedDocument(ctx, image, transform, rect.width, rect.height);
  }, [image, transform]);

  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 dark:border-zinc-800",
        className
      )}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {!image && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-zinc-400">Select a template to preview</p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <span className="rounded-full bg-red-600/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          QA Test — Not Valid ID
        </span>
      </div>
    </div>
  );
}
