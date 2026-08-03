"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionStore } from "@/lib/session/store";
import { getProvider, DEFAULT_PROVIDER_ID } from "@/lib/session/providers";
import type { ProviderEvaluateFn } from "@/lib/session/providers";
import type { LivenessPrompt, LivenessPromptId } from "@/lib/session/types";
import { evaluatePrompt } from "@/lib/session/prompts";
import { CustomPromptSetSchema } from "@/lib/prompt-sets/types";

const LivenessPromptController = dynamic(
  () =>
    import("@/components/liveness/LivenessPromptController").then(
      (m) => m.LivenessPromptController
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="space-y-4"
        aria-busy="true"
        aria-label="Loading liveness UI"
      >
        <Skeleton className="h-10 w-48" />
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-24 w-full" />
      </div>
    ),
  }
);

interface ResolvedProviderConfig {
  prompts: LivenessPrompt[];
  evaluator: ProviderEvaluateFn;
  promptSetLabel: string;
  providerId?: string;
  customPromptSetId?: string;
}

const CUSTOM_EVALUATOR: ProviderEvaluateFn = (id, signals) =>
  evaluatePrompt(id as LivenessPromptId, signals);

export function LivenessSessionClient({ sessionId }: { sessionId: string }) {
  const { providerId, customPromptSetId, hydrate } = useSessionStore();
  const [config, setConfig] = useState<ResolvedProviderConfig | null>(null);

  useEffect(() => {
    hydrate(sessionId);
  }, [sessionId, hydrate]);

  useEffect(() => {
    async function resolve() {
      if (customPromptSetId) {
        try {
          const res = await fetch(`/api/prompt-sets/${customPromptSetId}`);
          if (res.ok) {
            const data = CustomPromptSetSchema.parse(await res.json());

            const { LIVENESS_PROMPTS } = await import("@/lib/session/prompts");
            const resolved: LivenessPrompt[] = data.prompts
              .map((item) => {
                const base = LIVENESS_PROMPTS.find((p) => p.id === item.id);
                if (!base) return null;
                return {
                  ...base,
                  timeoutMs: item.timeoutMs,
                  maxAttempts: item.maxAttempts,
                };
              })
              .filter((p): p is LivenessPrompt => p !== null);

            setConfig({
              prompts: resolved,
              evaluator: CUSTOM_EVALUATOR,
              promptSetLabel: `custom:${data.name}`,
              customPromptSetId,
            });
            return;
          }
        } catch {
          // Fall through to built-in provider
        }
      }

      const provider = getProvider(providerId ?? DEFAULT_PROVIDER_ID);
      setConfig({
        prompts: provider.prompts,
        evaluator: provider.evaluate,
        promptSetLabel: provider.promptSetLabel,
        providerId: provider.id,
      });
    }

    resolve();
  }, [providerId, customPromptSetId, hydrate]);

  if (!config) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading liveness UI">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="aspect-video w-full rounded-lg" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <LivenessPromptController
      sessionId={sessionId}
      prompts={config.prompts}
      evaluator={config.evaluator}
      promptSetLabel={config.promptSetLabel}
      providerId={config.providerId}
      customPromptSetId={config.customPromptSetId}
    />
  );
}
