"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Shield, ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        mode: "verification",
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
      toast.success("Verification session created");
      startTransition(() => {
        router.push(`/verify/${data.sessionId}`);
      });
    } catch {
      setError("Could not start verification session. Please try again.");
      toast.error("Could not start verification session");
      setIsStarting(false);
    }
  };

  const startCompanionSession = async () => {
    setIsStartingCompanion(true);
    setError(null);

    try {
      const data = await createSession();
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
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">KYC-Verify</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Full verification workspace for identity capture and review workflows
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <Camera className="mb-2 h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-base">Liveness Simulation</CardTitle>
            <CardDescription>
              Run standard blink, head-turn, and smile prompts against your
              webcam.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <Shield className="mb-2 h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-base">Workflow-Ready</CardTitle>
            <CardDescription>
              Built as a full application foundation for capture, review, and
              operational verification workflows.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader>
            <ClipboardCheck className="mb-2 h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-base">Audit Export</CardTitle>
            <CardDescription>
              Download structured JSON with prompt results, document review state,
              metrics, and full event trail.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Start a test session</CardTitle>
          <CardDescription>
            Requires a webcam and a modern browser. Sessions resume after refresh
            via session storage. Use companion mode for Android emulator pairing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {error ? (
            <p className="w-full rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            size="lg"
            onClick={startSession}
            disabled={isStarting || isStartingCompanion}
          >
            {isStarting ? (
              <>
                <Loader2 className="animate-spin" />
                Starting...
              </>
            ) : (
              "Start Verification Session"
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={startCompanionSession}
            disabled={isStarting || isStartingCompanion}
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
        </CardContent>
      </Card>
    </div>
  );
}
