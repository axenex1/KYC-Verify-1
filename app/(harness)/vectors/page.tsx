"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { Cpu, FileWarning, Radio, Bug } from "lucide-react";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import { Button } from "@/components/ui/button";
import { listVectors } from "@/lib/vectors/registry";
import type { VectorPayloadKind } from "@/types/engagement";

const ICONS: Record<VectorPayloadKind, ComponentType<{ className?: string }>> = {
  deepfake: Cpu,
  document: FileWarning,
  behavioral: Bug,
  sdk: Radio,
};

const DESCRIPTIONS: Record<VectorPayloadKind, string> = {
  deepfake:
    "Armed Runway head-motion clips injected as a looping MediaStream into Probe capture and Companion desktop_to_mobile.",
  document:
    "Tampered ID templates and metadata manipulation targeting OCR and verification layers.",
  behavioral:
    "Pre-recorded blink and head-turn sequences injected as biometric challenge responses.",
  sdk: "Man-in-the-middle replay and telemetry tampering against provider SDK channels.",
};

export default function VectorLibraryPage() {
  const vectors = listVectors();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-background">
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
        <div>
          <ConsoleLabel>VECTOR LIBRARY</ConsoleLabel>
          <h1 className="mt-1.5 font-mono text-xl font-semibold tracking-[-0.02em]">
            Attack vector payloads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure deepfake sources, document transforms, behavioral replays,
            and SDK shims for authorized engagements.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {vectors.map((v) => {
            const Icon = ICONS[v.kind];
            return (
              <ConsolePanel key={v.kind} label={v.kind.toUpperCase()}>
                <div className="flex flex-col gap-3 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-neon-red/25 bg-neon-red/5">
                      <Icon className="h-4 w-4 text-neon-red" />
                    </div>
                    <div>
                      <h2 className="font-mono text-sm text-neon-red">
                        {v.label}
                      </h2>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {DESCRIPTIONS[v.kind]}
                      </p>
                    </div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    configure · inject · teardown
                  </div>
                  <Button asChild variant="console" size="sm">
                    <Link href={`/engagements/new?vector=${v.kind}`}>
                      Use in engagement
                    </Link>
                  </Button>
                </div>
              </ConsolePanel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
