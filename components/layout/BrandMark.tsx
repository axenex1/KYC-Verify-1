"use client";

import { cn } from "@/lib/utils";

interface BrandMarkProps {
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/40 bg-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.25)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#22d3ee33,transparent_55%),linear-gradient(135deg,#0f172a_15%,#111827_60%,#020617)]" />
        <svg
          viewBox="0 0 64 64"
          className="relative h-7 w-7 text-cyan-300 drop-shadow-[0_0_10px_rgba(103,232,249,0.7)]"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M32 7 14 17v13c0 13.2 7.8 24.4 18 28 10.2-3.6 18-14.8 18-28V17L32 7Z"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path d="M24 33.5 29 39l11-13" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 23h20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
            KYC-Verify
          </span>
          {!compact ? (
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.24em] text-cyan-100">
              Cyber Desk
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-slate-400">
          Trust cockpit for liveness, documents, and audit flow
        </p>
      </div>
    </div>
  );
}
