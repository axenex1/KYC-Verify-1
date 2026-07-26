"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Orbit,
  ScanSearch,
  Settings2,
  Shield,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { STANDARD_PROMPT_SET } from "@/lib/session/prompts";
import { listProviders } from "@/lib/session/providers";
import { useSessionStore } from "@/lib/session/store";
import type { CustomPromptSet } from "@/lib/prompt-sets/types";
import { BrandMark } from "@/components/layout/BrandMark";

const PROVIDERS = listProviders();
const capabilityCards = [
  {
    icon: Orbit,
    title: "Signal-rich simulation",
    description: "Run guided blink, head-turn, and smile flows with real-time control over the full capture journey.",
  },
  {
    icon: ScanSearch,
    title: "Document QA deck",
    description: "Review transforms, preview templates, and keep document validation artifacts close to the liveness workflow.",
  },
  {
    icon: ClipboardCheck,
    title: "Traceable exports",
    description: "Produce structured audit output with prompt decisions, QA state, event history, and review-ready evidence.",
  },
] as const;

const quickSteps = [
  "Choose a provider profile and prompt set.",
  "Launch webcam or mobile-companion mode.",
  "Capture signals, review documents, and export the audit trail.",
] as const;

export default function HomePage() {
  const router = useRouter();
  const setSessionId = useSessionStore((s) => s.setSessionId);
  const setProviderId = useSessionStore((s) => s.setProviderId);
  const setCustomPromptSetId = useSessionStore((s) => s.setCustomPromptSetId);

  const [isStarting, setIsStarting] = useState(false);
  const [isStartingCompanion, setIsStartingCompanion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [selectedProviderId, setSelectedProviderId] = useState<string>("standard");
  const [selectedPromptSetId, setSelectedPromptSetId] = useState<string>("__builtin__");
  const [customPromptSets, setCustomPromptSets] = useState<CustomPromptSet[]>([]);

  useEffect(() => {
    fetch("/api/prompt-sets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCustomPromptSets(data as CustomPromptSet[]);
      })
      .catch(() => {/* ignore — custom sets are optional */});
  }, []);

  const createSession = async (mode: "local" | "companion") => {
    const customPromptSetId =
      selectedPromptSetId !== "__builtin__" ? selectedPromptSetId : undefined;

    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "qa",
        promptSet: STANDARD_PROMPT_SET,
        providerId: selectedProviderId,
        ...(customPromptSetId ? { customPromptSetId } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    const data = (await response.json()) as { sessionId: string };

    setProviderId(selectedProviderId);
    setCustomPromptSetId(customPromptSetId ?? null);

    return data;
  };

  const startSession = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const data = await createSession("local");
      setSessionId(data.sessionId);
      toast.success("QA session created");
      startTransition(() => {
        router.push(`/verify/${data.sessionId}`);
      });
    } catch {
      setError("Could not start QA session. Please try again.");
      toast.error("Could not start QA session");
      setIsStarting(false);
    }
  };

  const startCompanionSession = async () => {
    setIsStartingCompanion(true);
    setError(null);

    try {
      const data = await createSession("companion");
      setSessionId(data.sessionId);
      toast.success("Companion session created");
      startTransition(() => {
        router.push(`/controller/${data.sessionId}`);
      });
    } catch {
      setError("Could not start companion session. Please try again.");
      toast.error("Could not start companion session");
      setIsStartingCompanion(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:py-10">
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="overflow-hidden border-cyan-400/20 bg-slate-950/75 shadow-[0_0_50px_rgba(34,211,238,0.08)] backdrop-blur">
          <CardContent className="relative p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#22d3ee26,transparent_25%),radial-gradient(circle_at_75%_20%,#d946ef1f,transparent_20%)]"
            />
            <div className="relative space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <BrandMark />
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-100">
                  Desktop QA command center
                </div>
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Beautiful cyber workflow for KYC rehearsal, review, and export.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Launch guided liveness checks, inspect document evidence, and keep every
                  session easy to understand with a cleaner operator-first interface.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-cyan-400/15 bg-slate-900/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-cyan-100">
                    <Activity className="h-4 w-4" />
                    Live capture rails
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Guided operator flow with clear start points and mode switching.
                  </p>
                </div>
                <div className="rounded-2xl border border-fuchsia-400/15 bg-slate-900/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-fuchsia-100">
                    <Waypoints className="h-4 w-4" />
                    Companion-ready
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Pair desktop and mobile QA paths without losing session context.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-400/15 bg-slate-900/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-100">
                    <Shield className="h-4 w-4" />
                    Audit confidence
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    Reviewable evidence, exports, and QA-only guardrails stay visible.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    Quick operator flow
                  </div>
                  <ol className="mt-4 space-y-3 text-sm text-slate-300">
                    {quickSteps.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {capabilityCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
                      >
                        <Icon className="h-5 w-5 text-cyan-300" />
                        <h2 className="mt-4 text-base font-semibold text-slate-50">
                          {item.title}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-400/15 bg-slate-950/75 shadow-[0_0_40px_rgba(34,211,238,0.08)] backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2 text-cyan-200">
              <Camera className="h-5 w-5" />
              <CardTitle>Launch session</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Start in desktop capture mode or jump into the mobile companion controller.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {error ? (
              <p className="w-full rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              size="lg"
              onClick={startSession}
              disabled={isStarting || isStartingCompanion}
              className="h-12 rounded-2xl bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            >
              {isStarting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Starting...
                </>
              ) : (
                "Start QA Session"
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={startCompanionSession}
              disabled={isStarting || isStartingCompanion}
              className="h-12 rounded-2xl border-cyan-400/30 bg-cyan-400/5 text-cyan-100 hover:bg-cyan-400/10 hover:text-cyan-50"
            >
              {isStartingCompanion ? (
                <>
                  <Loader2 className="animate-spin" />
                  Starting...
                </>
              ) : (
                "Start with Mobile Companion"
              )}
            </Button>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                What this desktop includes
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>Provider and prompt-set switching before launch</li>
                <li>Companion pairing path for Android emulator testing</li>
                <li>Exportable session evidence and dashboard visibility</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6 border-cyan-400/15 bg-slate-950/75 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-cyan-300" />
            <CardTitle>Session Configuration</CardTitle>
          </div>
          <CardDescription>
            Choose the provider and prompt set for this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr]">
            <div className="space-y-1.5">
              <Label htmlFor="provider-select">Provider</Label>
              <select
                id="provider-select"
                className="flex h-11 w-full rounded-2xl border border-cyan-400/15 bg-slate-900 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {PROVIDERS.find((p) => p.id === selectedProviderId)?.description && (
                <p className="text-xs text-muted-foreground">
                  {PROVIDERS.find((p) => p.id === selectedProviderId)?.description}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promptset-select">Prompt Set</Label>
              <select
                id="promptset-select"
                className="flex h-11 w-full rounded-2xl border border-cyan-400/15 bg-slate-900 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedPromptSetId}
                onChange={(e) => setSelectedPromptSetId(e.target.value)}
              >
                <option value="__builtin__">Built-in (provider default)</option>
                {customPromptSets.map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    {ps.name}
                  </option>
                ))}
              </select>
              {selectedPromptSetId === "__builtin__" ? (
                <p className="text-xs text-muted-foreground">
                  Uses the default prompt set for the selected provider.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Custom prompt set —{" "}
                  <a
                    href="/prompt-sets"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    manage sets
                  </a>
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100">
                Readability wins
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Provider selection, prompt-set behavior, and launch modes are kept in one panel
                so the next action is always obvious.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
