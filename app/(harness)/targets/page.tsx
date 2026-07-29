"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Loader2,
  Play,
  Power,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Finding } from "@/types/findings";
import type { Target, TargetStatus } from "@/types/targets";
import {
  VAULT_FIELD_KEYS,
  hasAnyVaultCredentials,
  readVaultFlags,
  targetStatusClass,
  type VaultFieldKey,
} from "@/lib/console/status";

const VAULT_LABELS: Record<VaultFieldKey, string> = {
  apiToken: "API token",
  secretKey: "Secret key",
  clientId: "Client ID",
  webhookSecret: "Webhook secret",
};

export default function TargetRegistryPage() {
  const router = useRouter();
  const [targets, setTargets] = useState<Target[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [configTarget, setConfigTarget] = useState<Target | null>(null);
  const [vaultDraft, setVaultDraft] = useState<Record<VaultFieldKey, string>>({
    apiToken: "",
    secretKey: "",
    clientId: "",
    webhookSecret: "",
  });
  const [savingVault, setSavingVault] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, fRes] = await Promise.all([
        fetch("/api/targets"),
        fetch("/api/findings"),
      ]);
      if (!tRes.ok || !fRes.ok) throw new Error("load_failed");
      const tJson = (await tRes.json()) as { targets: Target[] };
      const fJson = (await fRes.json()) as { findings: Finding[] };
      setTargets(tJson.targets ?? []);
      setFindings(fJson.findings ?? []);
    } catch {
      toast.error("Could not load target registry");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const findingsByTarget = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of findings) {
      if (!f.targetId) continue;
      map.set(f.targetId, (map.get(f.targetId) ?? 0) + 1);
    }
    return map;
  }, [findings]);

  const patchTarget = async (
    id: string,
    body: Record<string, unknown>
  ): Promise<Target | null> => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/targets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("patch_failed");
      const json = (await res.json()) as { target: Target };
      setTargets((prev) =>
        prev.map((t) => (t.id === id ? json.target : t))
      );
      return json.target;
    } catch {
      toast.error("Target update failed");
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const toggleStatus = async (target: Target) => {
    const next: TargetStatus =
      target.status === "active" ? "inactive" : "active";
    const updated = await patchTarget(target.id, { status: next });
    if (updated) {
      toast.success(
        next === "active"
          ? `${target.name} activated`
          : `${target.name} deactivated`
      );
    }
  };

  const openConfig = (target: Target) => {
    setConfigTarget(target);
    setVaultDraft({
      apiToken: "",
      secretKey: "",
      clientId: "",
      webhookSecret: "",
    });
  };

  const saveVault = async () => {
    if (!configTarget) return;
    setSavingVault(true);
    try {
      const existingVault =
        configTarget.config.vault &&
        typeof configTarget.config.vault === "object" &&
        !Array.isArray(configTarget.config.vault)
          ? (configTarget.config.vault as Record<string, unknown>)
          : {};

      const nextVault: Record<string, unknown> = { ...existingVault };
      for (const key of VAULT_FIELD_KEYS) {
        const value = vaultDraft[key].trim();
        if (value.length > 0) {
          nextVault[key] = value;
        }
      }

      // Merge config without logging secret values
      const nextConfig = {
        ...configTarget.config,
        vault: nextVault,
        credentialsConfigured: Object.values(nextVault).some(
          (v) => typeof v === "string" && v.length > 0
        ),
      };

      const updated = await patchTarget(configTarget.id, { config: nextConfig });
      if (updated) {
        toast.success("Credentials stored in target vault");
        setConfigTarget(null);
      }
    } finally {
      setSavingVault(false);
    }
  };

  const vaultFlags = configTarget
    ? readVaultFlags(configTarget.config)
    : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-background">
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <ConsoleLabel>TARGET REGISTRY</ConsoleLabel>
            <h1 className="mt-1.5 font-mono text-xl font-semibold tracking-[-0.02em]">
              KYC vendor targets
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Activate stubs, attach sandbox credentials, and launch engagements
              against registered detection stacks.
            </p>
          </div>
          <Button asChild variant="console">
            <Link href="/engagements/new">Start engagement</Link>
          </Button>
        </div>

        <ConsolePanel
          label="TARGETS"
          headerRight={
            <span className="font-mono text-[10px] text-muted-foreground">
              {targets.length} entries
            </span>
          }
        >
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-mono text-xs">loading registry…</span>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {targets.map((t) => {
                const count = findingsByTarget.get(t.id) ?? 0;
                const creds = hasAnyVaultCredentials(t.config);
                const busy = busyId === t.id;
                return (
                  <div
                    key={t.id}
                    className="flex flex-col gap-3 px-3 py-3 transition-[background-color] duration-150 hover:bg-surface-elevated/60 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-foreground">
                          {t.name}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[10px] uppercase tracking-wider",
                            targetStatusClass(t.status)
                          )}
                        >
                          {t.status}
                        </span>
                        {creds ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-neon-cyan">
                            <KeyRound className="h-3 w-3" />
                            vault
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {t.vendor} · {t.adapterType} · {count} findings
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {t.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-line font-mono text-xs"
                        disabled={busy}
                        onClick={() => void toggleStatus(t)}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Power className="h-3.5 w-3.5" />
                        )}
                        {t.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-line font-mono text-xs"
                        onClick={() => openConfig(t)}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Configure
                      </Button>
                      <Button
                        size="sm"
                        variant="console"
                        className="text-xs"
                        onClick={() =>
                          router.push(
                            `/engagements/new?targetId=${encodeURIComponent(t.id)}`
                          )
                        }
                      >
                        <Play className="h-3.5 w-3.5" />
                        Engage
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ConsolePanel>
      </div>

      <Dialog
        open={!!configTarget}
        onOpenChange={(open) => {
          if (!open) setConfigTarget(null);
        }}
      >
        <DialogContent className="border-line bg-surface font-mono sm:rounded-none">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">
              Configure {configTarget?.name}
            </DialogTitle>
            <DialogDescription className="font-sans text-sm text-muted-foreground">
              Sandbox credentials are stored on the target record. Values are
              never written to the console log.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {VAULT_FIELD_KEYS.map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`vault-${key}`} className="font-mono text-xs">
                  {VAULT_LABELS[key]}
                  {vaultFlags?.[key] ? (
                    <span className="ml-2 text-neon-cyan">[set]</span>
                  ) : null}
                </Label>
                <Input
                  id={`vault-${key}`}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={
                    vaultFlags?.[key] ? "••••••••  (leave blank to keep)" : "-"
                  }
                  value={vaultDraft[key]}
                  onChange={(e) =>
                    setVaultDraft((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  className="border-line bg-console-rail font-mono text-sm"
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="border-line font-mono"
              onClick={() => setConfigTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="console"
              disabled={savingVault}
              onClick={() => void saveVault()}
            >
              {savingVault ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save vault
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
