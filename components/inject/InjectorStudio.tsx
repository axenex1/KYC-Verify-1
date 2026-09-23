"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Radio, Square, Unplug } from "lucide-react";
import { toast } from "sonner";
import { getMediaAsset, type MediaAsset } from "@/lib/media/library";
import {
  clearArmedLibraryItem,
  getArmedLibraryItem,
  getArmedPackId,
} from "@/lib/media/selection";
import { startMediaLoop, type LoopHandle } from "@/lib/inject/loop";
import {
  buildPipelineStages,
  type InjectStage,
  type InjectStageStatus,
} from "@/lib/inject/pipeline";
import { setInjectOutboundStream } from "@/lib/inject/outbound-bus";
import { CompanionController } from "@/components/controller/CompanionController";

function statusClass(status: InjectStageStatus): string {
  switch (status) {
    case "active":
      return "border-red-400/40 bg-red-500/10 text-red-200";
    case "ready":
      return "border-white/25 bg-white/5 text-white";
    case "optional":
      return "border-white/10 text-zinc-400";
    case "blocked":
      return "border-white/5 text-zinc-600";
    default:
      return "border-white/10 text-zinc-500";
  }
}

export function InjectorStudio() {
  const hostRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<LoopHandle | null>(null);
  const [asset, setAsset] = useState<(MediaAsset & { url: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [loopRunning, setLoopRunning] = useState(false);
  const [companionSessionId, setCompanionSessionId] = useState<string | null>(null);
  const [armingSession, setArmingSession] = useState(false);
  const [serverArmed, setServerArmed] = useState<string | null>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);

  const stages: InjectStage[] = useMemo(
    () =>
      buildPipelineStages({
        armed: Boolean(asset),
        loopRunning,
        companionSessionId,
      }),
    [asset, companionSessionId, loopRunning]
  );

  const stopLoop = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    if (hostRef.current) hostRef.current.innerHTML = "";
    setLoopRunning(false);
    setLiveStream(null);
    setInjectOutboundStream(null);
  }, []);

  const loadArmed = useCallback(async () => {
    setLoading(true);
    stopLoop();
    try {
      const id = getArmedLibraryItem();
      if (!id) {
        setAsset(null);
        return;
      }
      const row = await getMediaAsset(id);
      if (!row) {
        setAsset(null);
        toast.error("Armed id not in Library");
        return;
      }
      const url = URL.createObjectURL(row.blob);
      setAsset((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return { ...row, url };
      });
      const packId = getArmedPackId();
      await fetch("/api/inject/arm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: row.id,
          packId,
          kind: row.kind,
          label: row.label,
          mimeType: row.mimeType,
          source: "library",
        }),
      })
        .then((res) => res.json())
        .then((body: { armed?: { assetId?: string } }) => {
          setServerArmed(body.armed?.assetId ?? row.id);
        })
        .catch(() => setServerArmed(row.id));
    } finally {
      setLoading(false);
    }
  }, [stopLoop]);

  useEffect(() => {
    void loadArmed();
    return () => {
      stopLoop();
      setAsset((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
      });
    };
  }, [loadArmed, stopLoop]);

  const startLoop = useCallback(async () => {
    if (!asset) {
      toast.error("Arm a pack video or document first");
      return;
    }
    stopLoop();
    try {
      const handle = await startMediaLoop(asset.blob, asset.mimeType, 15);
      loopRef.current = handle;
      if (hostRef.current) {
        hostRef.current.innerHTML = "";
        handle.canvas.className = "h-full w-full object-contain";
        hostRef.current.appendChild(handle.canvas);
      }
      setLiveStream(handle.stream);
      setInjectOutboundStream(handle.stream);
      setLoopRunning(true);
      toast.success("Desktop loop live — published for companion desktop_to_mobile");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Loop failed");
    }
  }, [asset, stopLoop]);

  const clearArm = useCallback(async () => {
    stopLoop();
    clearArmedLibraryItem();
    await fetch("/api/inject/arm", { method: "DELETE" }).catch(() => null);
    setServerArmed(null);
    setAsset((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
    toast.message("Disarmed");
  }, [stopLoop]);

  const startCompanionSession = useCallback(async () => {
    setArmingSession(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "qa", promptSet: "standard-v1" }),
      });
      if (!res.ok) throw new Error("Could not create companion session");
      const data = (await res.json()) as { sessionId?: string };
      if (!data.sessionId) throw new Error("No session id");
      setCompanionSessionId(data.sessionId);
      toast.success("Companion session armed — open pair surface");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Companion arm failed");
    } finally {
      setArmingSession(false);
    }
  }, []);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-4">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-zinc-500">PIPELINE</div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Arm → desktop loop → companion (optional) → Zygisk (optional lab phone). Zygisk is not the
            injector.
          </p>
        </div>

        <ol className="space-y-2">
          {stages.map((stage, index) => (
            <li
              key={stage.id}
              className={`rounded-2xl border px-4 py-3 ${statusClass(stage.status)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[10px] uppercase tracking-wider">
                  {index + 1}. {stage.label}
                </div>
                <div className="font-mono text-[10px] uppercase opacity-70">{stage.status}</div>
              </div>
              <p className="mt-1 text-xs leading-5 opacity-80">{stage.hint}</p>
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-white/10 px-4 py-3 text-xs leading-5 text-zinc-500">
          Lab sandboxes you control only. This surface loops armed Library media and can open a companion
          pair session. It does not claim production KYC bypass.
        </div>
      </div>

      <div className="lg:col-span-8">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="font-mono text-[10px] tracking-widest text-zinc-500">ARMED MEDIA</div>
          <button type="button" onClick={() => void loadArmed()} className="text-xs text-zinc-500 hover:text-white">
            Reload arm
          </button>
        </div>

        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          ) : loopRunning ? (
            <div ref={hostRef} className="h-full w-full" />
          ) : asset ? (
            asset.kind === "video" ? (
              <video src={asset.url} controls playsInline className="h-full w-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={asset.label} className="h-full w-full object-contain" />
            )
          ) : (
            <div className="px-8 text-center text-sm text-zinc-500">
              Nothing armed. Open{" "}
              <Link href="/library" className="text-red-400 hover:text-white">
                Library
              </Link>{" "}
              and arm a pack.
            </div>
          )}
        </div>

        {asset ? (
          <div className="mt-3 font-mono text-[11px] text-zinc-500">
            {asset.label} · {asset.kind} · {asset.id}
            {serverArmed ? ` · api ${serverArmed.slice(0, 12)}` : ""}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!asset || loopRunning}
            onClick={() => void startLoop()}
            className="btn-critical flex h-12 min-w-[160px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium disabled:opacity-40"
          >
            <Radio className="h-4 w-4" />
            Start desktop loop
          </button>
          <button
            type="button"
            disabled={!loopRunning}
            onClick={stopLoop}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-40"
          >
            <Square className="h-4 w-4" />
            Stop loop
          </button>
          <button
            type="button"
            disabled={!asset || armingSession}
            onClick={() => void startCompanionSession()}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-40"
          >
            {armingSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
            Arm companion session
          </button>
          <button
            type="button"
            onClick={() => void clearArm()}
            className="flex h-12 items-center justify-center rounded-2xl px-4 text-sm text-zinc-500 hover:text-white"
          >
            Disarm
          </button>
        </div>

        {companionSessionId ? (
          <div className="mt-8 space-y-4">
            <div className="font-mono text-[10px] tracking-widest text-zinc-500">COMPANION</div>
            <p className="text-xs leading-5 text-zinc-500">
              Same session as controller pair. When the phone pairs, outbound uses the Injector loop
              stream if running; otherwise the document canvas fallback.
            </p>
            <CompanionController
              sessionId={companionSessionId}
              preferredOutboundStream={liveStream}
            />
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-4 text-xs leading-5 text-zinc-500">
          <div className="font-mono text-[10px] tracking-widest text-zinc-500">ZYGISK</div>
          <p className="mt-2">
            Optional Magisk Zygisk module on a rooted lab device replaces Camera2 / MediaNDK planes from
            the companion frame ring when inject is armed on-device. Ship and enable that module only in
            owned lab hardware — it is stage 4, not stage 1.
          </p>
        </div>
      </div>
    </div>
  );
}
