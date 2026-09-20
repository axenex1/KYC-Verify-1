"use client";

import { useReducedMotion } from "framer-motion";
import { ParticleBackdrop } from "@/components/home/ParticleBackdrop";

/** Full-viewport statue + red-pulse glows. One instance, aligned to the window. */
export function StatueStage({
  particleCount = 120000,
}: {
  particleCount?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <ParticleBackdrop
        reduce={reduce}
        imageOpacity={0.15}
        height="100%"
        particleCount={particleCount}
      />
      <div className="absolute left-[12%] top-[8%] h-64 w-64 rounded-full bg-red-500/20 blur-[90px]" />
      <div className="absolute bottom-[12%] right-[8%] h-56 w-56 rounded-full bg-rose-400/10 blur-[80px]" />
    </div>
  );
}
