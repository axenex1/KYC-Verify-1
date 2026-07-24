"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  drawTransformedDocument,
  type DocumentTransform,
} from "@/lib/documents/transforms";
import { FileText } from "lucide-react";

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
        "relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-zinc-950 shadow-inner",
        "ring-1 ring-zinc-800/50",
        className
      )}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      {!image && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/50 ring-1 ring-zinc-700">
            <FileText className="h-5 w-5 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-500">Select a template to preview</p>
        </div>
      )}
      {/* QA warning overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-300 backdrop-blur-sm ring-1 ring-red-500/30">
          QA Test — Not Valid ID
        </span>
      </div>
    </div>
  );
}
