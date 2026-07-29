"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Loader2,
  Radio,
  Save,
  Terminal,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePreferencesStore } from "@/lib/preferences/store";
import type { Target } from "@/types/targets";
import {
  VAULT_FIELD_KEYS,
  hasAnyVaultCredentials,
  readVaultFlags,
  type VaultFieldKey,
} from "@/lib/console/status";

const VAULT_LABELS: Record<VaultFieldKey, string> = {
  apiToken: "API token",
  secretKey: "Secret key",
  clientId: "Client ID",
  webhookSecret: "Webhook secret",
};

const MCP_COMMAND = "npm run mcp:console";

export default function OperatorSettingsPage() {
  const operatorDisplayName = usePreferencesStore((s) => s.operatorDisplayName);
  const setOperatorDisplayName = usePreferencesStore(
    (s) => s.setOperatorDisplayName
  );
  const hydrate = usePreferencesStore((s) => s.hydrate);
  const hydrated = usePreferencesStore((s) => s.hydrated);

  const [nameDraft, setNameDraft] = useState(operatorDisplayName);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [configTarget, setConfigTarget] = useState<Target | null>(null);
  const [vaultDraft, setVaultDraft] = useState<Record<VaultFieldKey, string>>({
    apiToken: "",
    secretKey: "",
    clientId: "",
    webhookSecret: "",
  });
  const [savingVault, setSavingVault] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) setNameDraft(operatorDisplayName);
  }, [hydrated, operatorDisplayName]);

  const loadTargets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/targets");
      if (!res.ok) throw new Error("load_failed");
      const json = (await res.json()) as { targets: Target[] };
      setTargets(json.targets ?? []);
    } catch {
      toast.error("Could not load credential vault targets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  const saveIdentity = () => {
    const next = nameDraft.trim() || "local@console";
    setOperatorDisplayName(next);
    setNameDraft(next);
    toast.success("Operator identity saved");
  };

  const openVault = (target: Target) => {
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
    setBusyId(configTarget.id);
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

      const nextConfig = {
        ...configTarget.config,
        vault: nextVault,
        credentialsConfigured: Object.values(nextVault).some(
          (v) => typeof v === "string" && v.length > 0
        ),
      };

      const res = await fetch(`/api/targets/${configTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: nextConfig }),
      });
      if (!res.ok) throw new Error("patch_failed");
      const json = (await res.json()) as { target: Target };
      setTargets((prev) =>
        prev.map((t) => (t.id === json.target.id ? json.target : t))
      );
      toast.success("Vault updated");
      setConfigTarget(null);
    } catch {
      toast.error("Failed to store credentials");
    } finally {
      setSavingVault(false);
      setBusyId(null);
    }
  };

  const vaultFlags = configTarget
    ? readVaultFlags(configTarget.config)
    : null;

  const copyMcp = async () => {
    try {
      await navigator.clipboard.writeText(MCP_COMMAND);
      toast.success("MCP command copied");
    } catch {
      toast.message(MCP_COMMAND);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-background">
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
        <div>
          <ConsoleLabel>OPERATOR SETTINGS</ConsoleLabel>
          <h1 className="mt-1.5 font-mono text-2xl font-semibold tracking-[-0.02em]">
            Console preferences
          </h1>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Credential vault, MCP runner, theme, and operator identity.
          </p>
        </div>

        <ConsolePanel label="OPERATOR IDENTITY">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="op-name" className="font-mono text-xs">
                Display name
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="op-name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="glass-chip border-0 bg-console-rail/50 pl-9 font-mono text-sm"
                  placeholder="local@console"
                />
              </div>
            </div>
            <Button onClick={saveIdentity} variant="console">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </ConsolePanel>

        <ConsolePanel
          label="THEME"
          headerRight={<ThemeToggle />}
        >
          <div className="px-3 py-3 font-mono text-xs text-muted-foreground">
            Use the toggle to switch light / dark / system. Console chrome
            follows the active theme tokens.
          </div>
        </ConsolePanel>

        <ConsolePanel
          label="MCP RUNNER"
          headerRight={
            <span className="status-chip status-chip-info">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan" />
              standby
            </span>
          }
        >
          <div className="space-y-3 p-3">
            <div className="flex items-start gap-2">
              <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs text-foreground">
                  Locked-down console MCP server
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Status placeholder - runner is not auto-started from this UI.
                  Launch manually in a terminal when needed.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-md glass-chip px-3 py-2">
              <Radio className="h-3.5 w-3.5 text-muted-foreground" />
              <code className="flex-1 font-mono text-xs text-neon-green">
                {MCP_COMMAND}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs"
                onClick={() => void copyMcp()}
              >
                Copy
              </Button>
            </div>
          </div>
        </ConsolePanel>

        <ConsolePanel
          label="CREDENTIAL VAULT"
          headerRight={
            <span className="font-mono text-[10px] text-muted-foreground">
              via target PATCH
            </span>
          }
        >
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-mono text-xs">loading targets…</span>
            </div>
          ) : (
            <div className="divide-y divide-line/50">
              {targets
                .filter((t) => t.vendor !== "mediapipe")
                .map((t) => {
                  const creds = hasAnyVaultCredentials(t.config);
                  return (
                    <div
                      key={t.id}
                      className="flex flex-col gap-2 px-3.5 py-3.5 transition-colors duration-[var(--response-fast)] ease-[var(--ease-spring)] hover:bg-surface-elevated/40 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="vibrancy font-mono text-sm tracking-normal">
                            {t.name}
                          </span>
                          <span
                            className={cn(
                              "status-chip",
                              t.status === "active"
                                ? "status-chip-ok"
                                : t.status === "error"
                                  ? "status-chip-crit"
                                  : "status-chip-neutral"
                            )}
                          >
                            {t.status}
                          </span>
                          {creds ? (
                            <span className="status-chip status-chip-info">
                              <KeyRound className="h-3 w-3" />
                              configured
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              empty
                            </span>
                          )}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {t.vendor} · secrets never logged
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="font-mono text-xs"
                        disabled={busyId === t.id}
                        onClick={() => openVault(t)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Edit vault
                      </Button>
                    </div>
                  );
                })}
              {targets.filter((t) => t.vendor !== "mediapipe").length === 0 ? (
                <div className="px-3 py-6 font-mono text-xs text-muted-foreground">
                  No vendor stubs registered.
                </div>
              ) : null}
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
        <DialogContent className="font-mono sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">
              Vault · {configTarget?.name}
            </DialogTitle>
            <DialogDescription className="font-sans text-sm text-muted-foreground">
              Leave a field blank to keep the existing secret. Plaintext values
              are not echoed to logs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {VAULT_FIELD_KEYS.map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`settings-vault-${key}`} className="font-mono text-xs">
                  {VAULT_LABELS[key]}
                  {vaultFlags?.[key] ? (
                    <span className="ml-2 text-neon-cyan">[set]</span>
                  ) : null}
                </Label>
                <Input
                  id={`settings-vault-${key}`}
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
