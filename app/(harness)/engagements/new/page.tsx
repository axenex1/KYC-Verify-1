"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Radar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import { cn } from "@/lib/utils";
import { resolveEngagementLaunchPath } from "@/lib/console/probe-nav";
import { listVectorKinds } from "@/lib/vectors/registry";
import { usePreferencesStore } from "@/lib/preferences/store";
import type {
  CreateEngagementInput,
  Engagement,
  VectorPayload,
  VectorPayloadKind,
} from "@/types/engagement";
import type { Target, TargetCapability } from "@/types/targets";
import { targetStatusClass } from "@/lib/console/status";

const SURFACE_OPTIONS: {
  id: TargetCapability;
  label: string;
  hint: string;
}[] = [
  { id: "liveness", label: "Liveness", hint: "Face / challenge prompts" },
  { id: "document", label: "Document", hint: "ID OCR & forgery vectors" },
  { id: "behavioral", label: "Behavioral", hint: "Blink / pose sequences" },
  { id: "sdk", label: "SDK", hint: "Vendor SDK interception" },
];

const VECTOR_META: Record<
  VectorPayloadKind,
  { label: string; surfaces: TargetCapability[] }
> = {
  deepfake: { label: "Deepfake Injection", surfaces: ["liveness"] },
  document: { label: "Document Forgery", surfaces: ["document"] },
  behavioral: {
    label: "Behavioral Spoofing",
    surfaces: ["behavioral", "liveness"],
  },
  sdk: { label: "SDK Interception", surfaces: ["sdk"] },
};

function EngagementSetupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const prefsOperator = usePreferencesStore((s) => s.operatorDisplayName);
  const hydratePrefs = usePreferencesStore((s) => s.hydrate);

  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const preselect = searchParams.get("targetId");
  const preselectVector = searchParams.get("vector") as VectorPayloadKind | null;
  const [targetId, setTargetId] = useState(preselect ?? "");
  const [name, setName] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [authorizationRef, setAuthorizationRef] = useState("");
  const [surfaces, setSurfaces] = useState<TargetCapability[]>(["liveness"]);
  const [vectors, setVectors] = useState<VectorPayloadKind[]>(
    preselectVector &&
      ["deepfake", "document", "behavioral", "sdk"].includes(preselectVector)
      ? [preselectVector]
      : ["deepfake"]
  );

  useEffect(() => {
    hydratePrefs();
  }, [hydratePrefs]);

  useEffect(() => {
    if (prefsOperator && !operatorName) {
      setOperatorName(prefsOperator);
    }
  }, [prefsOperator, operatorName]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/targets");
        if (!res.ok) throw new Error("targets_failed");
        const json = (await res.json()) as { targets: Target[] };
        if (cancelled) return;
        const list = json.targets ?? [];
        setTargets(list);
        if (!preselect) {
          const preferred =
            list.find((t) => t.status === "active") ?? list[0];
          if (preferred) setTargetId(preferred.id);
        } else {
          setTargetId(preselect);
        }
      } catch {
        toast.error("Could not load targets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [preselect]);

  const selectedTarget = targets.find((t) => t.id === targetId);

  const availableVectors = useMemo(
    () =>
      listVectorKinds().filter((kind) => {
        const meta = VECTOR_META[kind];
        return meta.surfaces.some((s) => surfaces.includes(s));
      }),
    [surfaces]
  );

  const availableKey = availableVectors.join(",");

  useEffect(() => {
    setVectors((prev) => {
      const filtered = prev.filter((v) => availableVectors.includes(v));
      if (filtered.length > 0) return filtered;
      return availableVectors.slice(0, 1);
    });
  }, [availableKey, availableVectors]);

  const toggleSurface = (cap: TargetCapability) => {
    setSurfaces((prev) => {
      if (prev.includes(cap)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== cap);
      }
      return [...prev, cap];
    });
  };

  const toggleVector = (kind: VectorPayloadKind) => {
    setVectors((prev) => {
      if (prev.includes(kind)) {
        if (prev.length === 1) return prev;
        return prev.filter((k) => k !== kind);
      }
      return [...prev, kind];
    });
  };

  const onSubmit = async () => {
    if (!targetId) {
      toast.error("Select a target");
      return;
    }
    if (!operatorName.trim()) {
      toast.error("Operator name is required");
      return;
    }
    if (!authorizationRef.trim()) {
      toast.error("Authorization reference is required");
      return;
    }
    if (surfaces.length === 0) {
      toast.error("Select at least one attack surface");
      return;
    }
    if (vectors.length === 0) {
      toast.error("Select at least one vector payload");
      return;
    }

    setSubmitting(true);
    try {
      const vectorPayloads: VectorPayload[] = vectors.map((kind) => ({
        kind,
        label: VECTOR_META[kind].label,
        config: {},
      }));

      const body: CreateEngagementInput = {
        targetId,
        name: name.trim() || undefined,
        attackSurface: surfaces,
        vectorPayloads,
        status: "active",
        operatorName: operatorName.trim(),
        authorizationRef: authorizationRef.trim(),
      };

      const res = await fetch("/api/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(err?.error ?? "create_failed");
      }

      const json = (await res.json()) as { engagement: Engagement };
      const engagement = json.engagement;

      const { path } = await resolveEngagementLaunchPath(engagement.id);
      toast.success("Engagement armed", {
        description: `Routing to ${path}`,
      });

      startTransition(() => router.push(path));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create engagement"
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-background">
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
        <div>
          <ConsoleLabel>ENGAGEMENT SETUP</ConsoleLabel>
          <h1 className="mt-1 font-mono text-xl font-semibold tracking-tight">
            Mint probe engagement
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a target, define attack surface, select vector payloads, then
            launch Live Probe Run.
          </p>
        </div>

        <ConsolePanel label="TARGET">
          <div className="space-y-3 p-3">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-mono text-xs">loading targets…</span>
              </div>
            ) : (
              <div className="grid gap-2">
                {targets.map((t) => {
                  const selected = t.id === targetId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTargetId(t.id)}
                      className={cn(
                        "flex w-full items-start gap-3 border px-3 py-2.5 text-left transition-colors",
                        selected
                          ? "border-neon-green/40 bg-neon-green/10"
                          : "border-line bg-console-rail hover:bg-surface-elevated"
                      )}
                    >
                      <Radar
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          selected ? "text-neon-green" : "text-muted-foreground"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm text-foreground">
                          {t.name}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {t.vendor} · caps: {t.capabilities.join(", ")}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-wider",
                          targetStatusClass(t.status)
                        )}
                      >
                        {t.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTarget && selectedTarget.status !== "active" ? (
              <p className="font-mono text-[11px] text-neon-amber">
                [!] Target is {selectedTarget.status}. Activate it in the
                registry for live SDK probes.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="eng-name" className="font-mono text-xs">
                Engagement name (optional)
              </Label>
              <Input
                id="eng-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${selectedTarget?.name ?? "Target"} · ${new Date().toISOString().slice(0, 10)}`}
                className="border-line bg-console-rail font-mono text-sm"
              />
            </div>
          </div>
        </ConsolePanel>

        <ConsolePanel label="AUTHORIZATION">
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="op-name" className="font-mono text-xs">
                Operator name
              </Label>
              <Input
                id="op-name"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="redteam@exchange"
                className="border-line bg-console-rail font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auth-ref" className="font-mono text-xs">
                Authorization ref
              </Label>
              <Input
                id="auth-ref"
                value={authorizationRef}
                onChange={(e) => setAuthorizationRef(e.target.value)}
                placeholder="TICKET-1234 / SOC approval"
                className="border-line bg-console-rail font-mono text-sm"
                required
              />
            </div>
            <p className="sm:col-span-2 font-mono text-[11px] text-neon-amber">
              [!] Authorized engagements only - probe systems you are permitted
              to test.
            </p>
          </div>
        </ConsolePanel>

        <ConsolePanel label="ATTACK SURFACE">
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {SURFACE_OPTIONS.map((opt) => {
              const on = surfaces.includes(opt.id);
              const supported =
                !selectedTarget ||
                selectedTarget.capabilities.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!supported}
                  onClick={() => toggleSurface(opt.id)}
                  className={cn(
                    "border px-3 py-2.5 text-left transition-colors disabled:opacity-40",
                    on
                      ? "border-neon-cyan/40 bg-neon-cyan/10"
                      : "border-line bg-console-rail hover:bg-surface-elevated"
                  )}
                >
                  <div
                    className={cn(
                      "font-mono text-xs uppercase tracking-wider",
                      on ? "text-neon-cyan" : "text-foreground"
                    )}
                  >
                    {opt.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </ConsolePanel>

        <ConsolePanel label="VECTOR PAYLOADS">
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {listVectorKinds().map((kind) => {
              const meta = VECTOR_META[kind];
              const available = availableVectors.includes(kind);
              const on = vectors.includes(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={!available}
                  onClick={() => toggleVector(kind)}
                  className={cn(
                    "border px-3 py-2.5 text-left transition-colors disabled:opacity-40",
                    on
                      ? "border-neon-red/40 bg-neon-red/10"
                      : "border-line bg-console-rail hover:bg-surface-elevated"
                  )}
                >
                  <div
                    className={cn(
                      "font-mono text-xs",
                      on ? "text-neon-red" : "text-foreground"
                    )}
                  >
                    {meta.label}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {kind}
                  </div>
                </button>
              );
            })}
          </div>
        </ConsolePanel>

        <Button
          size="lg"
          disabled={submitting || loading || !targetId}
          onClick={() => void onSubmit()}
          className="w-full"
          variant="console"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Arming engagement…
            </>
          ) : (
            <>Launch Live Probe Run</>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function EngagementSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-mono text-xs">loading setup…</span>
        </div>
      }
    >
      <EngagementSetupInner />
    </Suspense>
  );
}
