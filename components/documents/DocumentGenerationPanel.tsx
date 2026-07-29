"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Download,
  FileUp,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  UserRound,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { ConsolePanel } from "@/components/ui/console-panel";
import { ConsoleLabel } from "@/components/ui/console-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LiveHeadPreview } from "@/components/documents/LiveHeadPreview";
import { cn } from "@/lib/utils";
import type { ClientAuditLogger } from "@/lib/audit/logger";
import { cropFaceFromDocument } from "@/lib/face/face-crop";
import {
  armAvatarClip,
  clearArmedAvatarClip,
  describeMotion,
  describePersistentMotion,
  downloadBlob,
  downloadUrl,
  getArmedAvatarClip,
  PERSISTENT_LIVENESS_CONTROLS,
  samplePersistentPose,
  subscribeArmedAvatarClip,
  type HarnessAvatarClip,
} from "@/lib/harness";
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
  faceCropped?: boolean;
  motionVideoUrl?: string | null;
  /** When set, clip is armed for Probe deepfake inject / Companion outbound. */
  armedClip?: HarnessAvatarClip | null;
}

interface DocumentGenerationPanelProps {
  auditLogger: ClientAuditLogger;
  onStateChange?: (state: DocumentGenerationState) => void;
}

function statusClass(status: string) {
  switch (status) {
    case "READY":
    case "SUCCEEDED":
      return "border-neon-green/35 text-neon-green";
    case "PROCESSING":
    case "PENDING":
    case "RUNNING":
    case "THROTTLED":
      return "border-neon-amber/35 text-neon-amber";
    case "FAILED":
      return "border-neon-red/35 text-neon-red";
    default:
      return "border-line text-muted-foreground";
  }
}

function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }
  return "video/webm";
}

export function DocumentGenerationPanel({
  auditLogger,
  onStateChange,
}: DocumentGenerationPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const docPreviewRef = useRef<string | null>(null);
  const cropPreviewRef = useRef<string | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [cropBlob, setCropBlob] = useState<Blob | null>(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);

  const [name, setName] = useState("Probe Subject");
  const [voicePresetId, setVoicePresetId] =
    useState<RunwayVoicePresetId>(DEFAULT_RUNWAY_VOICE);
  const [personality, setPersonality] = useState(DEFAULT_AVATAR_PERSONALITY);

  const [yawDeg, setYawDeg] = useState(0);
  const [pitchDeg, setPitchDeg] = useState(0);
  const [expression, setExpression] = useState(
    PERSISTENT_LIVENESS_CONTROLS.expression
  );
  const [durationSec, setDurationSec] = useState(
    PERSISTENT_LIVENESS_CONTROLS.durationSec
  );
  const [customPoseMode, setCustomPoseMode] = useState(false);
  const [scrubLabel, setScrubLabel] = useState("center");

  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyMotion, setBusyMotion] = useState(false);
  const [recording, setRecording] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<RunwayAvatarState | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [motionVideoUrl, setMotionVideoUrl] = useState<string | null>(null);
  const [armedClip, setArmedClip] = useState<HarnessAvatarClip | null>(() =>
    typeof window !== "undefined" ? getArmedAvatarClip() : null
  );

  useEffect(() => {
    setArmedClip(getArmedAvatarClip());
    return subscribeArmedAvatarClip(setArmedClip);
  }, []);

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
      if (docPreviewRef.current) URL.revokeObjectURL(docPreviewRef.current);
      if (cropPreviewRef.current) URL.revokeObjectURL(cropPreviewRef.current);
      recorderRef.current?.stop();
    };
  }, []);

  // Live preview scrubs the persistent L/R/U/D + soft end turns timeline.
  useEffect(() => {
    if (!cropPreviewUrl || recording || customPoseMode) return;
    let raf = 0;
    const started = performance.now();
    const periodMs = Math.max(2000, durationSec * 1000);
    const tick = () => {
      const elapsed = (performance.now() - started) % periodMs;
      const pose = samplePersistentPose(elapsed / periodMs);
      setYawDeg(pose.yawDeg);
      setPitchDeg(pose.pitchDeg);
      setScrubLabel(pose.label);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cropPreviewUrl, recording, customPoseMode, durationSec]);

  const emitState = useCallback(
    (patch?: Partial<DocumentGenerationState>) => {
      onStateChange?.({
        avatarId: patch?.avatarId ?? avatar?.id ?? null,
        avatarName: patch?.avatarName ?? avatar?.name ?? null,
        status: patch?.status ?? avatar?.status ?? taskStatus ?? null,
        sourceFileName: patch?.sourceFileName ?? docFile?.name ?? null,
        faceCropped: patch?.faceCropped ?? Boolean(cropBlob),
        motionVideoUrl: patch?.motionVideoUrl ?? motionVideoUrl,
        armedClip:
          patch && "armedClip" in patch ? patch.armedClip : armedClip,
      });
    },
    [
      armedClip,
      avatar,
      cropBlob,
      docFile?.name,
      motionVideoUrl,
      onStateChange,
      taskStatus,
    ]
  );

  useEffect(() => {
    emitState({ armedClip });
    // Sync parent when store-driven armedClip changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid emit loops on emitState identity
  }, [armedClip]);

  const handleArmForEngagement = useCallback(
    (clipUrlOverride?: string | null) => {
      const url = clipUrlOverride ?? motionVideoUrl;
      if (!url) return;
      const pose = customPoseMode
        ? { yawDeg, pitchDeg, expression, durationSec }
        : {
            ...PERSISTENT_LIVENESS_CONTROLS,
            expression,
            durationSec,
          };
      const clip = armAvatarClip({
        clipUrl: url,
        avatarId: avatar?.id ?? null,
        avatarName: avatar?.name ?? null,
        sourceFileName: docFile?.name ?? null,
        pose,
      });
      setArmedClip(clip);
      emitState({ armedClip: clip, motionVideoUrl: url });
      auditLogger.log("document_generation_clip_armed", {
        clipUrl: clip.clipUrl,
        avatarId: clip.avatarId ?? undefined,
        armedAt: clip.armedAt,
      });
      toast.success("Avatar clip armed for Android camera feed");
      return clip;
    },
    [
      auditLogger,
      avatar?.id,
      avatar?.name,
      customPoseMode,
      docFile?.name,
      durationSec,
      emitState,
      expression,
      motionVideoUrl,
      pitchDeg,
      yawDeg,
    ]
  );

  const handleDisarm = useCallback(() => {
    clearArmedAvatarClip();
    setArmedClip(null);
    emitState({ armedClip: null });
    auditLogger.log("document_generation_clip_disarmed", {});
    toast.message("Avatar clip disarmed");
  }, [auditLogger, emitState]);

  const clearCrop = () => {
    if (cropPreviewRef.current) {
      URL.revokeObjectURL(cropPreviewRef.current);
      cropPreviewRef.current = null;
    }
    setCropBlob(null);
    setCropPreviewUrl(null);
  };

  const clearDocument = () => {
    if (docPreviewRef.current) {
      URL.revokeObjectURL(docPreviewRef.current);
      docPreviewRef.current = null;
    }
    setDocFile(null);
    setDocPreviewUrl(null);
    clearCrop();
    setError(null);
  };

  const runFaceCrop = async (file: File) => {
    setCropping(true);
    setError(null);
    try {
      const result = await cropFaceFromDocument(file);
      if (cropPreviewRef.current) URL.revokeObjectURL(cropPreviewRef.current);
      cropPreviewRef.current = result.objectUrl;
      setCropBlob(result.blob);
      setCropPreviewUrl(result.objectUrl);
      auditLogger.log("document_generation_face_cropped", {
        fileName: file.name,
        box: result.box,
        width: result.width,
        height: result.height,
      });
      toast.success("Face cropped from document");
      emitState({ faceCropped: true, sourceFileName: file.name });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Face crop failed on this document";
      setError(message);
      clearCrop();
      auditLogger.log("document_generation_face_crop_failed", { error: message });
      toast.error(message);
    } finally {
      setCropping(false);
    }
  };

  const onPickFile = (list: FileList | null) => {
    const picked = list?.[0] ?? null;
    if (!picked) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(picked.type)) {
      setError("Use a JPEG, PNG, or WebP license scan.");
      return;
    }
    if (docPreviewRef.current) URL.revokeObjectURL(docPreviewRef.current);
    const url = URL.createObjectURL(picked);
    docPreviewRef.current = url;
    setDocFile(picked);
    setDocPreviewUrl(url);
    setAvatar(null);
    setTaskId(null);
    setTaskStatus(null);
    setMotionVideoUrl(null);
    auditLogger.log("document_generation_file_selected", {
      fileName: picked.name,
      size: picked.size,
      type: picked.type,
    });
    void runFaceCrop(picked);
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
        emitState({
          avatarId: json.avatar.id,
          avatarName: json.avatar.name,
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
    [emitState]
  );

  useEffect(() => {
    if (!avatar || avatar.status !== "PROCESSING") return;
    const id = avatar.id;
    const timer = window.setInterval(() => {
      void refreshAvatar(id, true);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [avatar, refreshAvatar]);

  const pollMotionTask = useCallback(
    async (id: string) => {
      setBusyMotion(true);
      setTaskId(id);
      try {
        for (let i = 0; i < 90; i++) {
          const res = await fetch(`/api/runway/tasks/${encodeURIComponent(id)}`);
          const json = (await res.json()) as {
            task?: {
              id: string;
              status: string;
              output: string[];
              failure: string | null;
            };
            error?: string;
          };
          if (!res.ok || !json.task) {
            throw new Error(json.error || "Task poll failed");
          }
          setTaskStatus(json.task.status);
          if (json.task.status === "SUCCEEDED") {
            const url = json.task.output[0] ?? null;
            setMotionVideoUrl(url);
            emitState({ motionVideoUrl: url, status: "SUCCEEDED" });
            auditLogger.log("document_generation_motion_ready", {
              taskId: id,
              output: url,
            });
            if (url) {
              const clip = armAvatarClip({
                clipUrl: url,
                avatarId: avatar?.id ?? null,
                avatarName: avatar?.name ?? null,
                sourceFileName: docFile?.name ?? null,
                pose: {
                  ...PERSISTENT_LIVENESS_CONTROLS,
                  expression,
                  durationSec,
                },
              });
              setArmedClip(clip);
              emitState({
                armedClip: clip,
                motionVideoUrl: url,
                status: "SUCCEEDED",
              });
              auditLogger.log("document_generation_clip_armed", {
                clipUrl: clip.clipUrl,
                auto: true,
                armedAt: clip.armedAt,
              });
              toast.success(
                "Motion ready — armed for Android camera feed"
              );
            } else {
              toast.success("Motion video ready");
            }
            return;
          }
          if (json.task.status === "FAILED") {
            throw new Error(json.task.failure || "Motion generation failed");
          }
          await new Promise((r) => setTimeout(r, 4000));
        }
        throw new Error("Motion generation timed out");
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Motion generation failed";
        setError(message);
        auditLogger.log("document_generation_motion_failed", { error: message });
        toast.error(message);
      } finally {
        setBusyMotion(false);
      }
    },
    [auditLogger, avatar?.id, avatar?.name, docFile?.name, durationSec, emitState, expression]
  );

  const createAvatar = async () => {
    if (!cropBlob) {
      setError("Crop the license photo first.");
      return;
    }
    if (!name.trim()) {
      setError("Avatar name is required.");
      return;
    }

    setBusyAvatar(true);
    setError(null);
    auditLogger.log("document_generation_started", {
      fileName: docFile?.name,
      voicePresetId,
      name: name.trim(),
      fromFaceCrop: true,
    });

    try {
      const body = new FormData();
      body.set(
        "file",
        new File([cropBlob], "face-crop.jpg", { type: "image/jpeg" })
      );
      body.set("name", name.trim());
      body.set("personality", personality.trim() || DEFAULT_AVATAR_PERSONALITY);
      body.set("voicePresetId", voicePresetId);
      body.set("imageProcessing", "optimize");

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
      emitState({
        avatarId: json.avatar.id,
        avatarName: json.avatar.name,
        status: json.avatar.status,
        faceCropped: true,
      });
      auditLogger.log("document_generation_avatar_created", {
        avatarId: json.avatar.id,
        status: json.avatar.status,
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
      setBusyAvatar(false);
    }
  };

  const generateMotionVideo = async (mode: "persistent" | "pose" = "persistent") => {
    if (!cropBlob) {
      setError("Crop the license photo first.");
      return;
    }
    setError(null);
    setMotionVideoUrl(null);
    setBusyMotion(true);
    const controls =
      mode === "persistent"
        ? {
            ...PERSISTENT_LIVENESS_CONTROLS,
            expression,
            durationSec,
          }
        : { yawDeg, pitchDeg, expression, durationSec };
    auditLogger.log("document_generation_motion_started", {
      mode,
      ...controls,
    });

    try {
      const body = new FormData();
      body.set(
        "file",
        new File([cropBlob], "face-crop.jpg", { type: "image/jpeg" })
      );
      body.set("yawDeg", String(controls.yawDeg));
      body.set("pitchDeg", String(controls.pitchDeg));
      body.set("expression", String(controls.expression));
      body.set("durationSec", String(controls.durationSec));
      body.set("mode", mode);

      const res = await fetch("/api/runway/motion", { method: "POST", body });
      const json = (await res.json()) as {
        taskId?: string;
        error?: string;
      };
      if (!res.ok || !json.taskId) {
        throw new Error(json.error || "Could not start motion generation");
      }
      setTaskId(json.taskId);
      setTaskStatus("PENDING");
      void pollMotionTask(json.taskId);
    } catch (e) {
      setBusyMotion(false);
      const message =
        e instanceof Error ? e.message : "Motion generation failed";
      setError(message);
      toast.error(message);
    }
  };

  const recordLivePreview = async () => {
    const canvas = liveCanvasRef.current;
    if (!canvas || !cropPreviewUrl) {
      setError("Face crop required before recording.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder is not available in this browser.");
      return;
    }

    const durationMs = Math.max(2000, durationSec * 1000);
    const mimeType = pickRecorderMime();
    const stream = canvas.captureStream(30);
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      setRecording(false);
      const blob = new Blob(chunks, { type: mimeType });
      downloadBlob(blob, `live-head-preview-${Date.now()}.webm`);
      auditLogger.log("document_generation_live_recording_saved", {
        bytes: blob.size,
        mimeType,
      });
      toast.success("Live preview video saved");
      stream.getTracks().forEach((t) => t.stop());
    };

    setRecording(true);
    const originYaw = yawDeg;
    const originPitch = pitchDeg;
    const startYaw = customPoseMode ? 0 : 0;
    const endYaw = customPoseMode ? yawDeg : 0;
    const startPitch = customPoseMode ? 0 : 0;
    const endPitch = customPoseMode ? pitchDeg : 0;
    recorder.start(200);
    const started = performance.now();

    const tick = () => {
      const t = Math.min(1, (performance.now() - started) / durationMs);
      if (customPoseMode) {
        const eased = 1 - Math.pow(1 - t, 3);
        setYawDeg(startYaw + (endYaw - startYaw) * eased);
        setPitchDeg(startPitch + (endPitch - startPitch) * eased);
      } else {
        const pose = samplePersistentPose(t);
        setYawDeg(pose.yawDeg);
        setPitchDeg(pose.pitchDeg);
        setScrubLabel(pose.label);
      }
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setYawDeg(originYaw);
        setPitchDeg(originPitch);
        recorder.stop();
      }
    };
    requestAnimationFrame(tick);
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
            Upload a license or ID scan. The console crops the selfie, creates a
            Runway avatar, then generates a persistent head-motion clip (left ·
            right · up · down · soft L/R finish) and arms it for the Android
            companion camera feed.
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
              "relative flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-line bg-console-rail px-4 py-6 text-center transition-[border-color,background-color] duration-150 hover:border-neon-cyan/40 hover:bg-surface",
              docPreviewUrl && "border-solid"
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
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
            {docPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={docPreviewUrl}
                alt="Uploaded license document"
                className="max-h-44 w-auto max-w-full object-contain"
              />
            ) : (
              <>
                <FileUp className="h-6 w-6 text-neon-cyan" />
                <p className="font-mono text-xs text-foreground">
                  Drop license / ID scan or click to upload
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  JPEG · PNG · WebP · face is auto-cropped
                </p>
              </>
            )}
          </div>

          {docFile ? (
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="truncate text-foreground/90">{docFile.name}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs"
                  disabled={cropping}
                  onClick={() => void runFaceCrop(docFile)}
                >
                  {cropping ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Recrop face
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-xs"
                  onClick={clearDocument}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <ConsoleLabel>FACE CROP</ConsoleLabel>
              <div className="flex aspect-square items-center justify-center border border-line bg-console-rail">
                {cropping ? (
                  <Loader2 className="h-5 w-5 animate-spin text-neon-cyan" />
                ) : cropPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cropPreviewUrl}
                    alt="Cropped ID portrait"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <ConsoleLabel>LIVE HEAD VIEW · {scrubLabel}</ConsoleLabel>
              <LiveHeadPreview
                imageUrl={cropPreviewUrl}
                yawDeg={yawDeg}
                pitchDeg={pitchDeg}
                canvasRef={liveCanvasRef}
              />
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {customPoseMode
                  ? describeMotion({ yawDeg, pitchDeg, expression, durationSec })
                  : describePersistentMotion()}
              </p>
            </div>
          </div>

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
              rows={2}
              className="w-full rounded-sm border border-line bg-console-rail px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-neon-green/40"
            />
          </div>

          <div className="border border-line bg-console-rail/60 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <ConsoleLabel>
                {customPoseMode ? "CUSTOM POSE" : "PERSISTENT LIVENESS"}
              </ConsoleLabel>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {customPoseMode
                    ? describeMotion({
                        yawDeg,
                        pitchDeg,
                        expression,
                        durationSec,
                      })
                    : describePersistentMotion()}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 font-mono text-[10px]"
                  onClick={() => setCustomPoseMode((v) => !v)}
                >
                  {customPoseMode ? "Use persistent" : "Custom pose"}
                </Button>
              </div>
            </div>
            {customPoseMode ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Yaw {Math.round(yawDeg)}&deg;
                  <input
                    type="range"
                    min={-35}
                    max={35}
                    value={yawDeg}
                    onChange={(e) => setYawDeg(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--neon-green))]"
                  />
                </label>
                <label className="space-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Pitch {Math.round(pitchDeg)}&deg;
                  <input
                    type="range"
                    min={-25}
                    max={25}
                    value={pitchDeg}
                    onChange={(e) => setPitchDeg(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--neon-cyan))]"
                  />
                </label>
                <label className="space-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Expression {expression}
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={expression}
                    onChange={(e) => setExpression(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--neon-amber))]"
                  />
                </label>
                <label className="space-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Duration {durationSec}s
                  <input
                    type="range"
                    min={2}
                    max={8}
                    value={durationSec}
                    onChange={(e) => setDurationSec(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--neon-green))]"
                  />
                </label>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <p className="sm:col-span-2 font-mono text-[11px] text-muted-foreground">
                  Every generation uses the same character motion: left → right →
                  up → down, then a very slight left/right finish before settling
                  center.
                </p>
                <label className="space-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Expression {expression}
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={expression}
                    onChange={(e) => setExpression(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--neon-amber))]"
                  />
                </label>
                <label className="space-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Duration {durationSec}s
                  <input
                    type="range"
                    min={2}
                    max={8}
                    value={durationSec}
                    onChange={(e) => setDurationSec(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--neon-green))]"
                  />
                </label>
              </div>
            )}
          </div>

          {error ? (
            <div className="border border-neon-red/30 bg-neon-red/5 px-3 py-2 font-mono text-xs text-neon-red">
              [!] {error}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="console"
              className="gap-2"
              disabled={busyAvatar || configured === false || !cropBlob}
              onClick={() => void createAvatar()}
            >
              {busyAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Create avatar
            </Button>
            <Button
              type="button"
              variant="console"
              className="gap-2 font-mono text-xs"
              disabled={busyMotion || configured === false || !cropBlob}
              onClick={() =>
                void generateMotionVideo(
                  customPoseMode ? "pose" : "persistent"
                )
              }
            >
              {busyMotion ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Video className="h-4 w-4" />
              )}
              {customPoseMode
                ? "Generate pose video"
                : "Build camera feed (auto-arm)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 font-mono text-xs"
              disabled={recording || !cropBlob}
              onClick={() => void recordLivePreview()}
            >
              {recording ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Save live clip
            </Button>
          </div>
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
              {avatar.processedImageUri ||
              avatar.referenceImageUri ||
              cropPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    avatar.processedImageUri ||
                    avatar.referenceImageUri ||
                    cropPreviewUrl ||
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
            </div>
          </div>
        </ConsolePanel>
      ) : null}

      {(motionVideoUrl || taskStatus || busyMotion) && (
        <ConsolePanel
          label="MOTION VIDEO"
          headerRight={
            taskStatus ? (
              <Badge variant="outline" className={statusClass(taskStatus)}>
                {taskStatus}
              </Badge>
            ) : null
          }
        >
          <div className="space-y-3 p-3">
            {motionVideoUrl ? (
              <>
                <video
                  src={motionVideoUrl}
                  controls
                  playsInline
                  className="aspect-square w-full max-w-md border border-line bg-black object-contain"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="console"
                    className="gap-1.5 text-[10px]"
                    onClick={() => void handleArmForEngagement()}
                  >
                    <Crosshair className="h-3 w-3" />
                    Arm for Probe / Companion
                  </Button>
                  {armedClip?.clipUrl === motionVideoUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5 font-mono text-[10px]"
                      onClick={handleDisarm}
                    >
                      Disarm
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 font-mono text-[10px]"
                    onClick={() =>
                      void downloadUrl(
                        motionVideoUrl,
                        `runway-head-motion-${Date.now()}.mp4`
                      ).catch((e) =>
                        toast.error(
                          e instanceof Error ? e.message : "Download failed"
                        )
                      )
                    }
                  >
                    <Download className="h-3 w-3" />
                    Download Runway video
                  </Button>
                  {taskId ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      task {taskId}
                    </span>
                  ) : null}
                </div>
                {armedClip?.clipUrl === motionVideoUrl ? (
                  <p className="font-mono text-[10px] text-neon-green">
                    Armed {new Date(armedClip.armedAt).toLocaleString()} — loops
                    as the Android companion camera feed (`desktop_to_mobile`).
                  </p>
                ) : null}
              </>
            ) : (
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-neon-amber" />
                Generating head-motion clip from face crop…
              </div>
            )}
          </div>
        </ConsolePanel>
      )}
    </div>
  );
}
