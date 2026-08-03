"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClientAuditLogger } from "@/lib/audit/logger";

type GenerationMode = "selfie_to_au_license" | "au_license_to_avatar";

interface GenerationResult {
  imageUrl: string;
  taskId: string;
  traceId: string;
  durationMs?: number;
}

interface DocumentGenerationWorkspaceProps {
  sessionId: string;
  auditLogger: ClientAuditLogger;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const TRUSTED_RESULT_HOSTS = [
  "runwayml.com",
  "cdn.runwayml.com",
  "runwaycdn.com",
  "storage.googleapis.com",
];

function isTrustedResultUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return false;
    return TRUSTED_RESULT_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

export function DocumentGenerationWorkspace({
  sessionId,
  auditLogger,
}: DocumentGenerationWorkspaceProps) {
  const [mode, setMode] = useState<GenerationMode>("selfie_to_au_license");
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState<string | null>(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const modeLabel = useMemo(() => {
    return mode === "selfie_to_au_license"
      ? "Selfie → AU license"
      : "AU license → avatar";
  }, [mode]);

  const modeDescription = useMemo(() => {
    return mode === "selfie_to_au_license"
      ? "Upload a selfie to generate a synthetic Australian driver license card image."
      : "Upload an Australian license image to generate a portrait avatar.";
  }, [mode]);

  const resultAltText = useMemo(() => {
    return mode === "selfie_to_au_license"
      ? "Generated synthetic Australian driver license card image"
      : "Generated avatar portrait from Australian driver license image";
  }, [mode]);

  useEffect(() => {
    return () => {
      if (sourcePreviewUrl) {
        URL.revokeObjectURL(sourcePreviewUrl);
      }
    };
  }, [sourcePreviewUrl]);

  const handleFileChange = async (file: File | null) => {
    setError(null);
    setResult(null);

    if (sourcePreviewUrl) {
      URL.revokeObjectURL(sourcePreviewUrl);
      setSourcePreviewUrl(null);
    }

    if (!file) {
      setSourceImageDataUrl(null);
      setSourceFileName(null);
      return;
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Unsupported file type. Upload PNG, JPEG, or WEBP.");
      setSourceImageDataUrl(null);
      setSourceFileName(null);
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image exceeds the 8MB limit.");
      setSourceImageDataUrl(null);
      setSourceFileName(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : null;
      if (!value) {
        setError("Unable to read image file.");
        setSourceImageDataUrl(null);
        setSourceFileName(null);
        return;
      }

      setSourceImageDataUrl(value);
      setSourceFileName(file.name);
      setSourcePreviewUrl(URL.createObjectURL(file));
      auditLogger.log("runway_source_uploaded", {
        mode,
        fileName: file.name,
        mimeType: file.type,
        byteSize: file.size,
      });
    };
    reader.onerror = () => {
      setError("Unable to read image file.");
      setSourceImageDataUrl(null);
      setSourceFileName(null);
    };
    reader.readAsDataURL(file);
  };

  const triggerGeneration = async () => {
    if (!sourceImageDataUrl || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    const startedAt = Date.now();

    auditLogger.log("runway_generation_started", { mode });

    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/runway/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode,
            imageDataUrl: sourceImageDataUrl,
          }),
        }
      );

      const payload = (await response.json()) as {
        success?: boolean;
        imageUrl?: string;
        taskId?: string;
        traceId?: string;
        durationMs?: number;
        error?: string;
        code?: string;
      };

      if (!response.ok || !payload.imageUrl || !payload.taskId || !payload.traceId) {
        const message =
          payload.error ?? "Generation failed. Please retry in a few seconds.";
        throw new Error(message);
      }

      if (!isTrustedResultUrl(payload.imageUrl)) {
        throw new Error("Generation returned an untrusted image URL.");
      }

      const generatedResult: GenerationResult = {
        imageUrl: payload.imageUrl,
        taskId: payload.taskId,
        traceId: payload.traceId,
        durationMs: payload.durationMs,
      };
      setResult(generatedResult);
      auditLogger.log("runway_generation_succeeded", {
        mode,
        taskId: payload.taskId,
        traceId: payload.traceId,
        durationMs: payload.durationMs ?? Date.now() - startedAt,
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Generation failed. Please retry in a few seconds.";
      setError(message);
      auditLogger.log("runway_generation_failed", {
        mode,
        message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="space-y-1">
        <p className="text-sm font-semibold">AU Generation Workspace</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{modeDescription}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium">Generation mode</span>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={mode}
            onChange={(event) => {
              const nextMode = event.target.value as GenerationMode;
              setMode(nextMode);
              setError(null);
              setResult(null);
              auditLogger.log("runway_mode_changed", { mode: nextMode });
            }}
          >
            <option value="selfie_to_au_license">Selfie → AU license</option>
            <option value="au_license_to_avatar">AU license → avatar</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium">Source image</span>
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              void handleFileChange(event.target.files?.[0] ?? null);
            }}
          />
        </label>
      </div>

      {sourceImageDataUrl && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Source: {sourceFileName ?? "uploaded image"}
          </p>
          <img
            src={sourcePreviewUrl ?? sourceImageDataUrl}
            alt={`Source preview for ${modeLabel}`}
            className="aspect-video w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
          />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={() => {
            void triggerGeneration();
          }}
          disabled={!sourceImageDataUrl || isGenerating}
          className="min-h-11 flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate {modeLabel}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => {
            if (sourcePreviewUrl) {
              URL.revokeObjectURL(sourcePreviewUrl);
            }
            setSourceImageDataUrl(null);
            setSourcePreviewUrl(null);
            setSourceFileName(null);
            setResult(null);
            setError(null);
            auditLogger.log("runway_workspace_reset", { mode });
          }}
        >
          <ArrowRightLeft className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Generation complete
          </p>
          <img
            src={result.imageUrl}
            alt={resultAltText}
            className="aspect-video w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={result.imageUrl} target="_blank" rel="noopener noreferrer">
                <Upload className="h-4 w-4" />
                Open Result
              </a>
            </Button>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Task {result.taskId} • Trace {result.traceId}
            </p>
          </div>
        </div>
      )}

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Synthetic output only. Do not use generated images as real-world identity
        documents.
      </p>
    </div>
  );
}
