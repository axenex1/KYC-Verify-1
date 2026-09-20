"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { cropFaceFromDocument } from "@/lib/face/face-crop";
import { saveMediaAsset } from "@/lib/media/library";
import { extractVideoStills } from "@/lib/media/stills";
import { attachAsset } from "@/lib/forge/pack";
import { buildIdentityKnowledge } from "@/lib/runway/identity-knowledge";
import type { ForgeIdentity } from "@/lib/documents/au-templates";

type Stage =
  | "idle"
  | "cropping"
  | "avatar"
  | "motion"
  | "polling"
  | "saving"
  | "done"
  | "blocked";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AvatarStudio({
  packId,
  ensurePack,
  selfieFile: sharedFile,
  selfieUrl: sharedUrl,
  identity,
  onContinuePack,
}: {
  packId?: string | null;
  ensurePack?: () => Promise<string>;
  selfieFile?: File | null;
  selfieUrl?: string | null;
  identity?: ForgeIdentity;
  onContinuePack?: () => void;
} = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(sharedUrl ?? null);
  const [selfieFile, setSelfieFile] = useState<File | null>(sharedFile ?? null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [status, setStatus] = useState("Drop a selfie to start");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/runway/status")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => {
        if (cancelled) return;
        setConfigured(Boolean(data.configured));
        if (!data.configured) {
          setStage("blocked");
          setStatus("Runway is not configured. Set RUNWAYML_API_SECRET, then restart the app.");
        }
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sharedFile) setSelfieFile(sharedFile);
    if (sharedUrl) {
      setSelfieUrl(sharedUrl);
      setStatus("Selfie from pack. Generate avatar video.");
    }
  }, [sharedFile, sharedUrl]);

  const handleSelfie = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Use a simple selfie image");
      return;
    }
    setSelfieFile(file);
    setSelfieUrl(URL.createObjectURL(file));
    setCropUrl(null);
    setVideoUrl(null);
    setSavedCount(0);
    setStage("idle");
    setStatus("Selfie ready. Generate avatar video.");
  }, []);

  const generate = useCallback(async () => {
    if (!selfieFile || !selfieUrl) {
      toast.error("Add a selfie first");
      return;
    }
    if (configured === false) {
      setStage("blocked");
      setStatus("Runway is not configured. Set RUNWAYML_API_SECRET.");
      return;
    }

    const groupId = ensurePack ? await ensurePack() : packId || undefined;
    setStage("cropping");
    setStatus("Reading selfie");

    try {
      await saveMediaAsset({
        kind: "selfie",
        label: "Selfie",
        blob: selfieFile,
        groupId,
        mimeType: selfieFile.type,
      }).then(async (saved) => {
        if (groupId) await attachAsset(groupId, { selfieAssetId: saved.id, identity, status: "avatar" });
      });

      let uploadFile = selfieFile;
      try {
        const crop = await cropFaceFromDocument(selfieFile);
        setCropUrl(crop.objectUrl);
        uploadFile = new File([crop.blob], "selfie-crop.jpg", { type: crop.blob.type || "image/jpeg" });
        await saveMediaAsset({
          kind: "still",
          label: "Face crop",
          blob: crop.blob,
          groupId,
          mimeType: crop.blob.type || "image/jpeg",
        });
      } catch {
        setStatus("No crop needed. Using the full selfie.");
      }

      setStage("avatar");
      setStatus("Creating Runway avatar from selfie");
      const avatarForm = new FormData();
      avatarForm.set("file", uploadFile);
      avatarForm.set("name", identity?.surname ? `${identity.surname}-${Date.now().toString(36)}` : `selfie-${Date.now().toString(36)}`);
      if (identity) {
        const knowledge = buildIdentityKnowledge(identity);
        avatarForm.set("knowledgeName", knowledge.knowledgeName);
        avatarForm.set("knowledgeContent", knowledge.knowledgeContent);
      }
      const avatarRes = await fetch("/api/runway/avatars", { method: "POST", body: avatarForm });
      const avatarJson = (await avatarRes.json()) as { error?: string; avatar?: { id: string; status: string } };
      if (!avatarRes.ok) {
        throw new Error(avatarJson.error || "Avatar create failed");
      }

      if (avatarJson.avatar?.id) {
        for (let i = 0; i < 20; i += 1) {
          const poll = await fetch(`/api/runway/avatars/${avatarJson.avatar.id}`);
          const body = (await poll.json()) as { avatar?: { status: string; failure?: string | null } };
          const avatarStatus = body.avatar?.status;
          if (avatarStatus === "READY" || avatarStatus === "SUCCEEDED") break;
          if (avatarStatus === "FAILED") {
            throw new Error(body.avatar?.failure || "Avatar failed");
          }
          setStatus(`Avatar ${avatarStatus || "processing"}`);
          await sleep(2000);
        }
      }

      setStage("motion");
      setStatus("Starting liveness motion video");
      const motionForm = new FormData();
      motionForm.set("file", uploadFile);
      motionForm.set("mode", "persistent");
      motionForm.set("durationSec", "8");
      motionForm.set("expression", "3");
      const motionRes = await fetch("/api/runway/motion", { method: "POST", body: motionForm });
      const motionJson = (await motionRes.json()) as { error?: string; taskId?: string };
      if (!motionRes.ok || !motionJson.taskId) {
        throw new Error(motionJson.error || "Motion start failed");
      }

      setStage("polling");
      let outputUrl: string | null = null;
      for (let i = 0; i < 90; i += 1) {
        const poll = await fetch(`/api/runway/tasks/${motionJson.taskId}`);
        const body = (await poll.json()) as {
          error?: string;
          task?: { status: string; output?: string[]; failure?: string | null; progress?: number | null };
        };
        if (!poll.ok) throw new Error(body.error || "Task poll failed");
        const task = body.task;
        if (task?.status === "SUCCEEDED") {
          outputUrl = task.output?.[0] ?? null;
          break;
        }
        if (task?.status === "FAILED") {
          throw new Error(task.failure || "Motion task failed");
        }
        const pct = task?.progress != null ? ` ${Math.round(task.progress * 100)}%` : "";
        setStatus(`Rendering video${pct}`);
        await sleep(2500);
      }

      if (!outputUrl) throw new Error("Timed out waiting for Runway video");

      setStage("saving");
      setStatus("Saving video and required stills");
      const fetchRes = await fetch("/api/runway/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: outputUrl }),
      });
      if (!fetchRes.ok) {
        const err = (await fetchRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Could not download video");
      }
      const videoBlob = await fetchRes.blob();
      const localVideo = URL.createObjectURL(videoBlob);
      setVideoUrl(localVideo);

      const videoAsset = await saveMediaAsset({
        kind: "video",
        label: "Liveness video",
        blob: videoBlob,
        groupId,
        mimeType: videoBlob.type || "video/mp4",
        runwayAvatarId: avatarJson.avatar?.id,
        runwayTaskId: motionJson.taskId,
      });
      if (groupId) {
        await attachAsset(groupId, {
          videoAssetId: videoAsset.id,
          runwayAvatarId: avatarJson.avatar?.id,
          runwayTaskId: motionJson.taskId,
          identity,
          status: "ready",
        });
      }

      const stills = await extractVideoStills(localVideo);
      for (const still of stills) {
        const stillAsset = await saveMediaAsset({
          kind: "still",
          label: still.label,
          blob: still.blob,
          groupId,
          mimeType: still.blob.type || "image/jpeg",
        });
        if (groupId) await attachAsset(groupId, { stillAssetId: stillAsset.id });
      }

      setSavedCount(2 + stills.length);
      setStage("done");
      setStatus(`Saved selfie, ${stills.length} stills, and video to Library`);
      toast.success("Avatar pack saved to Library");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      setStage("idle");
      setStatus(message);
      toast.error(message);
    }
  }, [configured, ensurePack, identity, packId, selfieFile, selfieUrl]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="mb-2 font-mono text-[10px] tracking-widest text-zinc-500">SELFIE</div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) handleSelfie(file);
          }}
          className="group flex min-h-[240px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-zinc-950/60 px-6 py-8 text-center hover:border-white/30"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleSelfie(file);
            }}
          />
          {selfieUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selfieUrl} alt="Selfie" className="max-h-56 w-full rounded-xl object-contain" />
          ) : (
            <>
              <User className="h-8 w-8 text-zinc-500 group-hover:text-white" />
              <div className="mt-4 text-sm text-zinc-300">Drop a simple selfie</div>
              <div className="mt-1 text-xs text-zinc-500">Front-facing photo is enough</div>
            </>
          )}
        </button>
        {cropUrl ? (
          <div className="mt-4">
            <div className="mb-2 font-mono text-[10px] tracking-widest text-zinc-500">FACE CROP</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cropUrl} alt="Crop" className="h-28 w-28 rounded-xl object-cover" />
          </div>
        ) : null}
      </div>

      <div className="lg:col-span-7">
        <div className="mb-2 font-mono text-[10px] tracking-widest text-zinc-500">RUNWAY OUTPUT</div>
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black">
          {videoUrl ? (
            <video src={videoUrl} controls playsInline className="h-full w-full object-contain" />
          ) : (
            <div className="px-8 text-center text-sm text-zinc-500">{status}</div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={!selfieFile || stage === "cropping" || stage === "avatar" || stage === "motion" || stage === "polling" || stage === "saving" || configured === false}
            className="btn-critical flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium disabled:opacity-40"
          >
            {["cropping", "avatar", "motion", "polling", "saving"].includes(stage) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {stage === "idle" || stage === "done" || stage === "blocked" ? "Generate from selfie" : status}
          </button>
          {savedCount > 0 ? (
            <button type="button" onClick={onContinuePack} className="text-sm text-red-400 hover:text-white">
              Open pack ({savedCount} items)
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-zinc-500">{status}</p>
      </div>
    </div>
  );
}
