"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PairingPanel } from "@/components/sync/PairingPanel";
import { LivenessPromptController } from "@/components/liveness/LivenessPromptController";
import { useSyncClient } from "@/lib/sync/use-sync-client";
import { useWebRtcSignaling } from "@/lib/sync/use-webrtc";
import type { SyncMessage } from "@/lib/sync/messages";
import type { CameraFacing } from "@/lib/constants";
import { ClientAuditLogger } from "@/lib/audit/logger";
import { drawTransformedDocument } from "@/lib/documents/transforms";
import {
  DEFAULT_DOCUMENT_TEMPLATE_ID,
  DOCUMENT_TEMPLATES,
} from "@/lib/documents/templates";
import { DEFAULT_DOCUMENT_TRANSFORM } from "@/components/documents/TransformControls";
import {
  createLoopingClipStream,
  getArmedAvatarClip,
  pushCompanionClipBrowser,
  subscribeArmedAvatarClip,
  type HarnessAvatarClip,
  type LoopingClipHandle,
} from "@/lib/harness";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CompanionControllerProps {
  sessionId: string;
}

export function CompanionController({ sessionId }: CompanionControllerProps) {
  const auditLogger = useMemo(() => new ClientAuditLogger(), []);
  const outboundCanvasRef = useRef<HTMLCanvasElement>(null);
  const outboundStreamRef = useRef<MediaStream | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const clipHandleRef = useRef<LoopingClipHandle | null>(null);
  const documentStateRef = useRef({
    templateId: DEFAULT_DOCUMENT_TEMPLATE_ID,
    transform: DEFAULT_DOCUMENT_TRANSFORM,
    image: null as HTMLImageElement | null,
  });
  const syncMessageHandlerRef = useRef<(message: SyncMessage) => void>(() => {});

  const [pairToken, setPairToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState("ws://127.0.0.1:3001/sync");
  const [syncServerAvailable, setSyncServerAvailable] = useState(true);
  const [remoteCameraStream, setRemoteCameraStream] = useState<MediaStream | null>(
    null
  );
  const [companionFacing, setCompanionFacing] = useState<CameraFacing>("user");
  const [mobileConnected, setMobileConnected] = useState(false);
  const [pairedAt, setPairedAt] = useState<string | null>(null);
  const [armedClip, setArmedClip] = useState<HarnessAvatarClip | null>(null);
  const [injectArmedOnPhone, setInjectArmedOnPhone] = useState(false);
  const [outboundMode, setOutboundMode] = useState<"document" | "avatar">(
    "document"
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [lastFinding, setLastFinding] = useState<string | null>(null);

  const onPeerDisconnected = useCallback(() => {
    setMobileConnected(false);
    auditLogger.log("device_disconnected", { sessionId });
  }, [auditLogger, sessionId]);

  const sync = useSyncClient({
    sessionId,
    role: "desktop",
    token: pairToken,
    enabled: Boolean(pairToken),
    onMessage: (message) => syncMessageHandlerRef.current(message),
    onPeerDisconnected,
  });

  const webrtc = useWebRtcSignaling(sessionId, "desktop", sync.send);
  const {
    handleSignalingMessage,
    setHandlers,
    createOffer,
    addLocalStream,
    shouldInitiate,
  } = webrtc;

  useEffect(() => {
    setArmedClip(getArmedAvatarClip());
    return subscribeArmedAvatarClip((clip) => {
      setArmedClip(clip);
      if (clip) setOutboundMode("avatar");
    });
  }, []);

  const lastAutoPushUrlRef = useRef<string | null>(null);

  // Plan D: when a clip becomes armed and we already have a pair token, push once.
  useEffect(() => {
    if (!pairToken || !armedClip?.clipUrl) return;
    if (lastAutoPushUrlRef.current === armedClip.clipUrl) return;
    let cancelled = false;
    (async () => {
      try {
        await pushCompanionClipBrowser({
          sessionId,
          token: pairToken,
          clipUrl: armedClip.clipUrl,
          armed: true,
        });
        if (cancelled) return;
        lastAutoPushUrlRef.current = armedClip.clipUrl;
        sync.send({
          type: "inject_state",
          sessionId,
          armed: true,
          mode: "avatar",
        });
        setInjectArmedOnPhone(true);
        auditLogger.log("companion_clip_auto_pushed", {
          clipUrl: armedClip.clipUrl.slice(0, 96),
        });
        toast.success("Armed clip auto-pushed to companion");
      } catch {
        /* manual Push button remains available */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [armedClip?.clipUrl, pairToken, sessionId, sync, auditLogger]);

  useEffect(() => {
    syncMessageHandlerRef.current = (message: SyncMessage) => {
      void handleSignalingMessage(message);

      if (message.type === "pair_ack" && message.success && message.role === "mobile") {
        setMobileConnected(true);
        setPairedAt(new Date().toISOString());
        auditLogger.log("device_paired", {
          platform: "android",
          transport: "usb-adb",
        });
      }

      if (message.type === "camera_facing") {
        setCompanionFacing(message.facing);
        auditLogger.log("camera_facing_changed", {
          facing: message.facing,
        });
      }

      if (message.type === "inject_state") {
        setInjectArmedOnPhone(message.armed);
      }

      if (message.type === "finding_signal") {
        setLastFinding(message.outcome);
        auditLogger.log("companion_finding", {
          outcome: message.outcome,
          signals: message.signals,
        });
        toast.message(`Companion finding: ${message.outcome}`);
      }
    };
  }, [auditLogger, handleSignalingMessage]);

  useEffect(() => {
    async function initPairing() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/pair`, {
          method: "POST",
        });
        if (!res.ok) {
          setSyncServerAvailable(false);
          return;
        }
        const data = (await res.json()) as {
          token: string;
          wsUrl: string;
        };
        setPairToken(data.token);
        setWsUrl(data.wsUrl);
        setSyncServerAvailable(true);
      } catch {
        setSyncServerAvailable(false);
      }
    }
    initPairing();
  }, [sessionId]);

  useEffect(() => {
    const img = new Image();
    img.src =
      DOCUMENT_TEMPLATES.find((t) => t.id === DEFAULT_DOCUMENT_TEMPLATE_ID)
        ?.path ?? "";
    img.onload = () => {
      documentStateRef.current.image = img;
    };
  }, []);

  useEffect(() => {
    setHandlers({
      onRemoteStream: (stream, streamType) => {
        if (streamType === "mobile_to_desktop") {
          setRemoteCameraStream(stream);
        }
      },
    });
  }, [setHandlers]);

  useEffect(() => {
    let cancelled = false;
    async function armOutboundFromClip() {
      clipHandleRef.current?.stop();
      clipHandleRef.current = null;
      if (outboundMode !== "avatar" || !armedClip?.clipUrl) return;
      try {
        const handle = await createLoopingClipStream(armedClip.clipUrl, {
          fps: 15,
          width: 1280,
          height: 720,
        });
        if (cancelled) {
          handle.stop();
          return;
        }
        clipHandleRef.current = handle;
        outboundStreamRef.current = handle.stream;
        addLocalStream("desktop_to_mobile", handle.stream);
      } catch (err) {
        console.error(err);
        toast.error("Failed to loop armed avatar clip for companion outbound");
      }
    }
    void armOutboundFromClip();
    return () => {
      cancelled = true;
      clipHandleRef.current?.stop();
      clipHandleRef.current = null;
    };
  }, [armedClip?.clipUrl, outboundMode, addLocalStream]);

  useEffect(() => {
    if (sync.connectionState !== "paired" || !mobileConnected) return;

    if (shouldInitiate("desktop_to_mobile")) {
      const canvas = outboundCanvasRef.current;
      if (!outboundStreamRef.current) {
        if (!canvas) return;
        outboundStreamRef.current = canvas.captureStream(15);
        addLocalStream("desktop_to_mobile", outboundStreamRef.current);
      }
      void createOffer("desktop_to_mobile", outboundStreamRef.current);
    }
  }, [
    sync.connectionState,
    mobileConnected,
    shouldInitiate,
    createOffer,
    addLocalStream,
    outboundMode,
    armedClip?.clipUrl,
  ]);

  const updateOutboundCanvas = useCallback(() => {
    if (outboundMode === "avatar" && clipHandleRef.current) return;
    const canvas = outboundCanvasRef.current;
    if (!canvas) return;

    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { image, transform } = documentStateRef.current;
    if (image) {
      drawTransformedDocument(ctx, image, transform, width, height);
    } else if (cameraCanvasRef.current) {
      ctx.drawImage(cameraCanvasRef.current, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#18181b";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "24px sans-serif";
      ctx.fillText("KYC-Verify QA Stream", 40, 60);
    }
  }, [outboundMode]);

  useEffect(() => {
    if (sync.connectionState !== "paired") return;
    const id = window.setInterval(updateOutboundCanvas, 66);
    return () => window.clearInterval(id);
  }, [sync.connectionState, updateOutboundCanvas]);

  const handleCameraFrame = useCallback((canvas: HTMLCanvasElement) => {
    cameraCanvasRef.current = canvas;
  }, []);

  const pushClipToCompanion = useCallback(async () => {
    if (!pairToken || !armedClip?.clipUrl) {
      toast.error("Arm an avatar clip in Document Gen first");
      return;
    }
    setPushBusy(true);
    try {
      const result = await pushCompanionClipBrowser({
        sessionId,
        token: pairToken,
        clipUrl: armedClip.clipUrl,
        armed: true,
      });
      sync.send({
        type: "inject_state",
        sessionId,
        armed: true,
        mode: "avatar",
      });
      setInjectArmedOnPhone(true);
      auditLogger.log("companion_clip_pushed", {
        clipId: result.clipId,
        byteLength: result.byteLength,
      });
      toast.success("Clip pushed to companion — arm inject on phone");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Push failed");
    } finally {
      setPushBusy(false);
    }
  }, [armedClip?.clipUrl, auditLogger, pairToken, sessionId, sync]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px]">
          outbound {outboundMode}
        </Badge>
        {armedClip ? (
          <Badge className="font-mono text-[10px]">avatar clip armed</Badge>
        ) : (
          <Badge variant="secondary" className="font-mono text-[10px]">
            no avatar clip
          </Badge>
        )}
        {injectArmedOnPhone && (
          <Badge className="font-mono text-[10px] text-neon-green">
            phone inject armed
          </Badge>
        )}
        {lastFinding && (
          <Badge variant="outline" className="font-mono text-[10px]">
            finding {lastFinding}
          </Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          className="font-mono text-xs"
          onClick={() =>
            setOutboundMode((m) => (m === "avatar" ? "document" : "avatar"))
          }
          disabled={!armedClip}
        >
          Use {outboundMode === "avatar" ? "document" : "avatar"} outbound
        </Button>
        <Button
          size="sm"
          className="font-mono text-xs"
          onClick={() => void pushClipToCompanion()}
          disabled={!armedClip || !pairToken || pushBusy}
        >
          {pushBusy ? "Pushing…" : "Push clip to companion"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <PairingPanel
          sessionId={sessionId}
          token={pairToken}
          wsUrl={wsUrl}
          connectionState={sync.connectionState}
          syncServerAvailable={syncServerAvailable}
          onReconnect={sync.reconnect}
          injectArmed={injectArmedOnPhone}
        />

        <div className="lg:col-span-2">
          <LivenessPromptController
            sessionId={sessionId}
            cameraSource="remote"
            remoteStream={remoteCameraStream}
            companionFacingMode={companionFacing}
            showLocalCameraSwitcher={false}
            onCameraFrame={handleCameraFrame}
            auditLogger={auditLogger}
            pairedDevice={
              mobileConnected && pairedAt
                ? {
                    platform: "android",
                    connectedAt: pairedAt,
                    transport: "usb-adb",
                  }
                : undefined
            }
            onDocumentTransformProposed={(transform) => {
              sync.sendTransformProposed(transform);
            }}
            onDocumentTransformApplied={(transform) => {
              documentStateRef.current.transform = transform;
              sync.sendTransformApplied(transform);
            }}
            onDocumentTransformRejected={() => {
              sync.sendTransformRejected();
            }}
            onDocumentStateChange={(state) => {
              documentStateRef.current.templateId = state.templateId;
              documentStateRef.current.transform = state.appliedTransform;
              const template = DOCUMENT_TEMPLATES.find(
                (t) => t.id === state.templateId
              );
              if (template) {
                const img = new Image();
                img.src = template.path;
                img.onload = () => {
                  documentStateRef.current.image = img;
                };
              }
            }}
          />
        </div>
      </div>

      <canvas ref={outboundCanvasRef} className="hidden" aria-hidden />
    </div>
  );
}
