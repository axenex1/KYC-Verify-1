"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Shield, ClipboardCheck, Loader2, Settings2 } from "lucide-react";
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

const PROVIDERS = listProviders();

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
        mode: "verification",
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

      {/* Session configuration */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Session Configuration</CardTitle>
          </div>
          <CardDescription>
            Choose the provider and prompt set for this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="provider-select">Provider</Label>
              <select
                id="provider-select"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
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
