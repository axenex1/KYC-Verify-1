"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Crosshair,
  Fingerprint,
  FileKey2,
  Loader2,
  Radar,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsolePanel } from "@/components/ui/console-panel";
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

const SURFACE_OPTIONS: {
  id: TargetCapability;
  label: string;
  hint: string;
  icon: typeof Fingerprint;
}[] = [
  {
    id: "liveness",
    label: "Liveness",
    hint: "Face / challenge prompts",
    icon: Fingerprint,
  },
  {
    id: "document",
    label: "Document",
    hint: "ID OCR & forgery vectors",
    icon: FileKey2,
  },
  {
    id: "behavioral",
    label: "Behavioral",
    hint: "Blink / pose sequences",
    icon: Crosshair,
  },
  {
    id: "sdk",
    label: "SDK",
    hint: "Vendor SDK interception",
    icon: Zap,
  },
];

const VECTOR_META: Record<
  VectorPayloadKind,
  { label: string; surfaces: TargetCapability[]; blurb: string }
> = {
  deepfake: {
    label: "Deepfake Injection",
    surfaces: ["liveness"],
    blurb: "Synthetic face stream into liveness",
  },
  document: {
    label: "Document Forgery",
    surfaces: ["document"],
    blurb: "Tampered ID / passport payloads",
  },
  behavioral: {
    label: "Behavioral Spoofing",
    surfaces: ["behavioral", "liveness"],
    blurb: "Replay blink / pose sequences",
  },
  sdk: {
    label: "SDK Interception",
    surfaces: ["sdk"],
    blurb: "Hook vendor client callbacks",
  },
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
    <div className="hub-canvas relative flex min-h-0 flex-1 flex-col bg-background">
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-5 p-5 sm:p-7">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-neon-green/25 bg-neon-green/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neon-green">
            <Sparkles className="h-3 w-3" strokeWidth={1.75} />
            Engagement setup
          </div>
          <div>
            <h1 className="font-sans text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.75rem]">
              Mint probe engagement
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Lock a target stack, carve the attack surface, load vector
              payloads, then arm Live Probe Run.
            </p>
          </div>
        </header>

        <ConsolePanel
          label="TARGET"
          headerRight={
            <span className="text-[10px] font-medium tracking-[-0.01em] text-muted-foreground">
              {loading ? "scanning…" : `${targets.length} stacks`}
            </span>
          }
        >
          <div className="space-y-4 p-3.5">
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />
                <span className="text-xs">Scanning target registry…</span>
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
                        "select-tile",
                        selected && "select-tile-active"
                      )}
                    >
                      <span className="select-tile-icon">
                        <Radar
                          className={cn(
                            "h-4 w-4",
                            selected ? "text-neon-green" : "text-muted-foreground"
                          )}
                          strokeWidth={1.75}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium tracking-[-0.015em] text-foreground">
                          {t.name}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {t.vendor} · caps: {t.capabilities.join(", ")}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[-0.01em]",
                          t.status === "active"
                            ? "bg-neon-green/10 text-neon-green"
                            : t.status === "error"
                              ? "bg-neon-red/10 text-neon-red"
                              : "bg-surface text-muted-foreground"
                        )}
                      >
                        {t.status === "active" ? (
                          <span className="h-1 w-1 rounded-full bg-neon-green" />
                        ) : null}
                        {t.status === "active"
                          ? "Active"
                          : t.status === "error"
                            ? "Error"
                            : "Inactive"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedTarget && selectedTarget.status !== "active" ? (
              <p className="rounded-xl border border-neon-amber/25 bg-neon-amber/5 px-3 py-2 text-[11px] leading-relaxed text-neon-amber">
                Target is {selectedTarget.status}. Activate it in the registry
                before live SDK probes.
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label
                htmlFor="eng-name"
                className="text-[11px] font-medium tracking-[-0.01em] text-muted-foreground"
              >
                Engagement name
                <span className="ml-1 font-normal opacity-70">(optional)</span>
              </Label>
              <Input
                id="eng-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${selectedTarget?.name ?? "Target"} · ${new Date().toISOString().slice(0, 10)}`}
                className="font-mono text-sm"
              />
            </div>
          </div>
        </ConsolePanel>

        <ConsolePanel
          label="AUTHORIZATION"
          headerRight={
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neon-amber">
              <ShieldAlert className="h-3 w-3" strokeWidth={1.75} />
              Required
            </span>
          }
        >
          <div className="grid gap-3.5 p-3.5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="op-name"
                className="text-[11px] font-medium tracking-[-0.01em] text-muted-foreground"
              >
                Operator name
              </Label>
              <Input
                id="op-name"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="redteam@exchange"
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="auth-ref"
                className="text-[11px] font-medium tracking-[-0.01em] text-muted-foreground"
              >
                Authorization ref
              </Label>
              <Input
                id="auth-ref"
                value={authorizationRef}
                onChange={(e) => setAuthorizationRef(e.target.value)}
                placeholder="TICKET-1234 / SOC approval"
                className="font-mono text-sm"
                required
              />
            </div>
            <p className="sm:col-span-2 rounded-xl border border-neon-amber/20 bg-neon-amber/5 px-3 py-2 text-[11px] leading-relaxed text-neon-amber/95">
              Authorized engagements only. Probe systems you are permitted to
              test.
            </p>
          </div>
        </ConsolePanel>

        <ConsolePanel
          label="ATTACK SURFACE"
          headerRight={
            <span className="text-[10px] text-muted-foreground">
              {surfaces.length} armed
            </span>
          }
        >
          <div className="grid gap-2 p-3.5 sm:grid-cols-2">
            {SURFACE_OPTIONS.map((opt) => {
              const on = surfaces.includes(opt.id);
              const supported =
                !selectedTarget ||
                selectedTarget.capabilities.includes(opt.id);
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!supported}
                  onClick={() => toggleSurface(opt.id)}
                  className={cn(
                    "select-tile select-tile-cyan disabled:cursor-not-allowed disabled:opacity-40",
                    on && "select-tile-active"
                  )}
                >
                  <span className="select-tile-icon">
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        on ? "text-neon-cyan" : "text-muted-foreground"
                      )}
                      strokeWidth={1.75}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-[13px] font-medium tracking-[-0.015em]",
                        on ? "text-neon-cyan" : "text-foreground"
                      )}
                    >
                      {opt.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {opt.hint}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ConsolePanel>

        <ConsolePanel
          label="VECTOR PAYLOADS"
          headerRight={
            <span className="text-[10px] text-muted-foreground">
              {vectors.length} loaded
            </span>
          }
        >
          <div className="grid gap-2 p-3.5 sm:grid-cols-2">
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
                    "select-tile select-tile-red disabled:cursor-not-allowed disabled:opacity-40",
                    on && "select-tile-active"
                  )}
                >
                  <span className="select-tile-icon">
                    <Zap
                      className={cn(
                        "h-4 w-4",
                        on ? "text-neon-red" : "text-muted-foreground"
                      )}
                      strokeWidth={1.75}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "text-[13px] font-medium tracking-[-0.015em]",
                        on ? "text-neon-red" : "text-foreground"
                      )}
                    >
                      {meta.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {meta.blurb}
                    </div>
                    <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/80">
                      {kind}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ConsolePanel>

        <div className="sticky bottom-3 z-20 pt-1">
          <Button
            size="lg"
            disabled={submitting || loading || !targetId}
            onClick={() => void onSubmit()}
            className="h-12 w-full rounded-full text-[13px] font-semibold tracking-[-0.01em] shadow-[0_12px_40px_-12px_hsl(var(--neon-green)/0.55)]"
            variant="console"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Arming engagement…
              </>
            ) : (
              <>
                <Radar className="h-4 w-4" strokeWidth={1.75} />
                Launch Live Probe Run
              </>
            )}
          </Button>
        </div>
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
          <span className="text-xs">Loading setup…</span>
        </div>
      }
    >
      <EngagementSetupInner />
    </Suspense>
  );
}
