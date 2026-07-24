"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Shield,
  ClipboardCheck,
  Loader2,
  Play,
  Smartphone,
  ArrowRight,
  Sparkles,
  Activity,
  FileJson,
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
import { Badge } from "@/components/ui/badge";
import { STANDARD_PROMPT_SET } from "@/lib/session/prompts";
import { useSessionStore } from "@/lib/session/store";

export default function HomePage() {
  const router = useRouter();
  const setSessionId = useSessionStore((s) => s.setSessionId);
  const [isStarting, setIsStarting] = useState(false);
  const [isStartingCompanion, setIsStartingCompanion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const createSession = async () => {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "qa",
        promptSet: STANDARD_PROMPT_SET,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create session");
    }

    return (await response.json()) as { sessionId: string };
  };

  const startSession = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const data = await createSession();
      setSessionId(data.sessionId);
      toast.success("QA session created", {
        description: "Redirecting to liveness capture...",
      });
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
      const data = await createSession();
      setSessionId(data.sessionId);
      toast.success("Companion session created", {
        description: "Redirecting to controller...",
      });
      startTransition(() => {
        router.push(`/controller/${data.sessionId}`);
      });
    } catch {
      setError("Could not start companion session. Please try again.");
      toast.error("Could not start companion session");
      setIsStartingCompanion(false);
    }
  };

  const isDisabled = isStarting || isStartingCompanion;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10 sm:py-16">
      {/* Hero Section */}
      <div className="mb-10 text-center sm:mb-14">
        <Badge
          variant="warning"
          className="mb-4 gap-1 px-3 py-1 text-xs font-medium"
        >
          <Shield className="h-3 w-3" />
          QA Environment — Not for production
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          KYC-Verify
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
          Internal QA harness for testing KYC provider liveness integrations
          with simulated behavioral signals
        </p>
      </div>

      {/* Feature Cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Card className="group relative overflow-hidden border-zinc-200/60 bg-gradient-to-b from-transparent to-emerald-500/[0.03] transition-all hover:border-emerald-500/30 hover:shadow-md dark:border-zinc-800/60 dark:to-emerald-500/[0.05]">
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Camera className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-base">Liveness Simulation</CardTitle>
            <CardDescription>
              Run blink, head-turn, and smile prompts against your webcam with
              real-time face tracking.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="group relative overflow-hidden border-zinc-200/60 bg-gradient-to-b from-transparent to-amber-500/[0.03] transition-all hover:border-amber-500/30 hover:shadow-md dark:border-zinc-800/60 dark:to-amber-500/[0.05]">
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-base">Real-time Analytics</CardTitle>
            <CardDescription>
              Monitor pass rates, confidence scores, head rotation, and blink
              intervals across sessions.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="group relative overflow-hidden border-zinc-200/60 bg-gradient-to-b from-transparent to-blue-500/[0.03] transition-all hover:border-blue-500/30 hover:shadow-md dark:border-zinc-800/60 dark:to-blue-500/[0.05]">
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
              <FileJson className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-base">Audit Export</CardTitle>
            <CardDescription>
              Download structured JSON with prompt results, document QA state,
              metrics, and full event trail.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* CTA Section */}
      <Card className="border-zinc-200/60 shadow-sm sm:mx-auto sm:max-w-2xl dark:border-zinc-800/60">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Start a test session
          </CardTitle>
          <CardDescription>
            Requires a webcam and a modern browser. Sessions resume after
            refresh via session storage. Use companion mode for Android emulator
            pairing over ADB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <Shield className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={startSession}
              disabled={isDisabled}
              className="group flex-1 gap-2"
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating session...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 transition-transform group-hover:scale-110" />
                  Start QA Session
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={startCompanionSession}
              disabled={isDisabled}
              className="group flex-1 gap-2"
            >
              {isStartingCompanion ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating session...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 transition-transform group-hover:scale-110" />
                  Start with Mobile Companion
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="mx-auto mt-8 max-w-md text-center text-xs text-muted-foreground">
        <ClipboardCheck className="-mt-0.5 mr-1 inline h-3 w-3" />
        Outputs simulated signals for integration testing — not production
        identity verification.
      </p>
    </div>
  );
}
