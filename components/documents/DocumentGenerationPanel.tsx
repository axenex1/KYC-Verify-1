"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileUp,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClientAuditLogger } from "@/lib/audit/logger";
import {
  DEFAULT_AVATAR_PERSONALITY,
  DEFAULT_RUNWAY_VOICE,
  RUNWAY_VOICE_PRESETS,
  type RunwayVoicePresetId,
} from "@/lib/runway/voices";

export interface RunwayAvatarState {
  id: string;
  name: string;
  status: string;
  personality: string | null;
  documentIds: string[];
  referenceImageUri: string | null;
  processedImageUri: string | null;
  startScript: string | null;
  failure: string | null;
  failureCode: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DocumentGenerationState {
  avatarId: string | null;
  avatarName: string | null;
  status: string | null;
  sourceFileName: string | null;
}

interface DocumentGenerationPanelProps {
  auditLogger: ClientAuditLogger;
  onStateChange?: (state: DocumentGenerationState) => void;
}

function statusClass(status: string) {
  switch (status) {
    case "READY":
      return "border-neon-green/35 text-neon-green";
    case "PROCESSING":
      return "border-neon-amber/35 text-neon-amber";
    case "FAILED":
      return "border-neon-red/35 text-neon-red";
    default:
      return "border-line text-muted-foreground";
  }
}

export function DocumentGenerationPanel({
  auditLogger,
  onStateChange,
}: DocumentGenerationPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("Probe Subject");
  const [voicePresetId, setVoicePresetId] =
    useState<RunwayVoicePresetId>(DEFAULT_RUNWAY_VOICE);
  const [personality, setPersonality] = useState(DEFAULT_AVATAR_PERSONALITY);
  const [startScript, setStartScript] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<RunwayAvatarState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/runway/status");
        const json = (await res.json()) as { configured?: boolean };
        if (!cancelled) setConfigured(Boolean(json.configured));
      } catch {
        if (!cancelled) setConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const emitState = useCallback(
    (next: Partial<DocumentGenerationState> & { avatar?: RunwayAvatarState | null }) => {
      const a = next.avatar === undefined ? avatar : next.avatar;
      onStateChange?.({
        avatarId: a?.id ?? next.avatarId ?? null,
        avatarName: a?.name ?? next.avatarName ?? null,
        status: a?.status ?? next.status ?? null,
        sourceFileName: file?.name ?? next.sourceFileName ?? null,
      });
    },
    [avatar, file?.name, onStateChange]
  );

  const assignFile = (next: File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setFile(next);
    setError(null);
    if (next) {
      const url = URL.createObjectURL(next);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      auditLogger.log("document_generation_file_selected", {
        fileName: next.name,
        size: next.size,
        type: next.type,
      });
    } else {
      setPreviewUrl(null);
    }
  };

  const onPickFile = (list: FileList | null) => {
    const picked = list?.[0] ?? null;
    if (!picked) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(picked.type)) {
      setError("Use a JPEG, PNG, or WebP document photo.");
      return;
    }
    assignFile(picked);
  };

  const refreshAvatar = useCallback(
    async (id: string, silent = false) => {
      if (!silent) setPolling(true);
      try {
        const res = await fetch(`/api/runway/avatars/${encodeURIComponent(id)}`);
        const json = (await res.json()) as {
          avatar?: RunwayAvatarState;
          error?: string;
        };
        if (!res.ok || !json.avatar) {
          throw new Error(json.error || "Could not refresh avatar status");
        }
        setAvatar(json.avatar);
        emitState({ avatar: json.avatar });
        auditLogger.log("document_generation_avatar_polled", {
          avatarId: json.avatar.id,
          status: json.avatar.status,
        });
        return json.avatar;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Refresh failed";
        if (!silent) {
          setError(message);
          toast.error(message);
        }
        return null;
      } finally {
        if (!silent) setPolling(false);
      }
    },
    [auditLogger, emitState]
  );

  useEffect(() => {
    if (!avatar || avatar.status !== "PROCESSING") return;
    const id = avatar.id;
    const timer = window.setInterval(() => {
      void refreshAvatar(id, true);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [avatar, refreshAvatar]);

  const createAvatar = async () => {
    if (!file) {
      setError("Upload a document photo first.");
      return;
    }
    if (!name.trim()) {
      setError("Avatar name is required.");
      return;
    }

    setBusy(true);
    setError(null);
    auditLogger.log("document_generation_started", {
      fileName: file.name,
      voicePresetId,
      name: name.trim(),
    });

    try {
      const body = new FormData();
      body.set("file", file);
      body.set("name", name.trim());
      body.set("personality", personality.trim() || DEFAULT_AVATAR_PERSONALITY);
      body.set("voicePresetId", voicePresetId);
      body.set("imageProcessing", "optimize");
      if (startScript.trim()) body.set("startScript", startScript.trim());
      if (knowledgeContent.trim()) {
        body.set("knowledgeName", `${name.trim()} document notes`);
        body.set("knowledgeContent", knowledgeContent.trim());
      }

      const res = await fetch("/api/runway/avatars", {
        method: "POST",
        body,
      });
      const json = (await res.json()) as {
        avatar?: RunwayAvatarState;
        error?: string;
      };
      if (!res.ok || !json.avatar) {
        throw new Error(json.error || "Avatar creation failed");
      }

      setAvatar(json.avatar);
      emitState({ avatar: json.avatar });
      auditLogger.log("document_generation_avatar_created", {
        avatarId: json.avatar.id,
        status: json.avatar.status,
        documentIds: json.avatar.documentIds,
      });
      toast.success(
        json.avatar.status === "READY"
          ? "Avatar ready"
          : "Avatar created - processing reference image"
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Avatar creation failed";
      setError(message);
      auditLogger.log("document_generation_failed", { error: message });
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ConsolePanel
        label="DOCUMENT GENERATION"
        headerRight={
          <Badge
            variant="outline"
            className={cn(
              configured === null
                ? "text-muted-foreground"
                : configured
                  ? "border-neon-green/35 text-neon-green"
                  : "border-neon-amber/35 text-neon-amber"
            )}
          >
            {configured === null
              ? "checking runway"
              : configured
                ? "runway armed"
                : "runway offline"}
          </Badge>
        }
      >
        <div className="space-y-4 p-3">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upload an ID or passport photo and create a Runway avatar for
            authorized deepfake / synthetic-identity probes. The face crop
            becomes the avatar reference image.
          </p>

          {configured === false ? (
            <div className="border border-neon-amber/30 bg-neon-amber/5 px-3 py-2 font-mono text-xs text-neon-amber">
              Set <code className="text-foreground">RUNWAYML_API_SECRET</code>{" "}
              in <code className="text-foreground">.env</code>, then restart the
              console.
            </div>
          ) : null}

          <div
            className={cn(
              "relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-line bg-console-rail px-4 py-6 text-center transition-[border-color,background-color] duration-150 hover:border-neon-cyan/40 hover:bg-surface",
              previewUrl && "border-solid"
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              onPickFile(e.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files)}
            />
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Uploaded document preview"
                className="max-h-48 w-auto max-w-full object-contain"
              />
            ) : (
              <>
                <FileUp className="h-6 w-6 text-neon-cyan" />
                <p className="font-mono text-xs text-foreground">
                  Drop document photo or click to upload
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  JPEG · PNG · WebP · max 16MB
                </p>
              </>
            )}
          </div>

          {file ? (
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="truncate text-foreground/90">{file.name}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-xs"
                onClick={() => assignFile(null)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="avatar-name" className="font-mono text-[10px] uppercase tracking-wider">
                Avatar name
              </Label>
              <Input
                id="avatar-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-line bg-console-rail font-mono text-sm"
                placeholder="Probe Subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avatar-voice" className="font-mono text-[10px] uppercase tracking-wider">
                Voice preset
              </Label>
              <select
                id="avatar-voice"
                value={voicePresetId}
                onChange={(e) =>
                  setVoicePresetId(e.target.value as RunwayVoicePresetId)
                }
                className="flex h-9 w-full rounded-sm border border-line bg-console-rail px-3 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-neon-green/40"
              >
                {RUNWAY_VOICE_PRESETS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.hint})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatar-personality" className="font-mono text-[10px] uppercase tracking-wider">
              Personality
            </Label>
            <textarea
              id="avatar-personality"
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={3}
              className="w-full rounded-sm border border-line bg-console-rail px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-neon-green/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatar-start" className="font-mono text-[10px] uppercase tracking-wider">
              Start script (optional)
            </Label>
            <Input
              id="avatar-start"
              value={startScript}
              onChange={(e) => setStartScript(e.target.value)}
              className="border-line bg-console-rail font-mono text-sm"
              placeholder="Hello, I am ready for verification."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatar-knowledge" className="font-mono text-[10px] uppercase tracking-wider">
              Knowledge document (optional)
            </Label>
            <textarea
              id="avatar-knowledge"
              value={knowledgeContent}
              onChange={(e) => setKnowledgeContent(e.target.value)}
              rows={4}
              className="w-full rounded-sm border border-line bg-console-rail px-3 py-2 font-mono text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-neon-green/40"
              placeholder="Paste OCR / biographic notes from the uploaded ID to attach as Runway knowledge."
            />
          </div>

          {error ? (
            <div className="border border-neon-red/30 bg-neon-red/5 px-3 py-2 font-mono text-xs text-neon-red">
              [!] {error}
            </div>
          ) : null}

          <Button
            type="button"
            variant="console"
            className="w-full gap-2"
            disabled={busy || configured === false || !file}
            onClick={() => void createAvatar()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {busy ? "Creating avatar…" : "Create Runway avatar"}
          </Button>
        </div>
      </ConsolePanel>

      {avatar ? (
        <ConsolePanel
          label="AVATAR RESULT"
          headerRight={
            <Badge variant="outline" className={statusClass(avatar.status)}>
              {avatar.status}
            </Badge>
          }
        >
          <div className="grid gap-3 p-3 sm:grid-cols-[140px_1fr]">
            <div className="flex aspect-square items-center justify-center border border-line bg-console-rail">
              {avatar.processedImageUri || avatar.referenceImageUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    avatar.processedImageUri ||
                    avatar.referenceImageUri ||
                    undefined
                  }
                  alt={`${avatar.name} avatar preview`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2 font-mono text-xs">
              <div>
                <ConsoleLabel>NAME</ConsoleLabel>
                <p className="mt-0.5 text-sm text-foreground">{avatar.name}</p>
              </div>
              <div>
                <ConsoleLabel>AVATAR ID</ConsoleLabel>
                <p className="mt-0.5 break-all text-neon-cyan">{avatar.id}</p>
              </div>
              {avatar.failure ? (
                <p className="text-neon-red">{avatar.failure}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 font-mono text-[10px]"
                  disabled={polling}
                  onClick={() => void refreshAvatar(avatar.id)}
                >
                  {polling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Refresh status
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="font-mono text-[10px]"
                  onClick={async () => {
                    await navigator.clipboard.writeText(avatar.id);
                    toast.success("Avatar id copied");
                  }}
                >
                  Copy id
                </Button>
              </div>
            </div>
          </div>
        </ConsolePanel>
      ) : null}
    </div>
  );
}
