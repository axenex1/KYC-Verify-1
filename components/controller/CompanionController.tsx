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
import { subscribeInjectOutbound } from "@/lib/inject/outbound-bus";

interface CompanionControllerProps {
  sessionId: string;
  /** Prefer this stream for desktop_to_mobile (e.g. Injector loop). */
  preferredOutboundStream?: MediaStream | null;
}

export function CompanionController({
  sessionId,
  preferredOutboundStream = null,
}: CompanionControllerProps) {
  const auditLogger = useMemo(() => new ClientAuditLogger(), []);
  const outboundCanvasRef = useRef<HTMLCanvasElement>(null);
  const outboundStreamRef = useRef<MediaStream | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
  const [busOutbound, setBusOutbound] = useState<MediaStream | null>(null);
  const [outboundSource, setOutboundSource] = useState<"inject" | "document" | "none">(
    "none"
  );

  useEffect(() => subscribeInjectOutbound(setBusOutbound), []);

  const resolvedOutbound = preferredOutboundStream || busOutbound;

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
      if (sync.connectionState !== "paired" || !mobileConnected) return;
      if (!shouldInitiate("desktop_to_mobile")) return;

      const canvas = outboundCanvasRef.current;
          let stream = resolvedOutbound;
          let source: "inject" | "document" | "none" = resolvedOutbound ? "inject" : "none";

          if (!stream && canvas) {
            if (
              !outboundStreamRef.current ||
              outboundStreamRef.current.getVideoTracks().every((t) => t.readyState === "ended")
            ) {
              outboundStreamRef.current = canvas.captureStream(15);
            }
            stream = outboundStreamRef.current;
            source = "document";
          }

          if (!stream) {
            setOutboundSource("none");
            return;
          }

          // Prefer inject stream identity when present.
          if (resolvedOutbound) {
            outboundStreamRef.current = resolvedOutbound;
            stream = resolvedOutbound;
            source = "inject";
          }

          setOutboundSource(source);
          void (async () => {
            await addLocalStream("desktop_to_mobile", stream!);
            await createOffer("desktop_to_mobile", stream!);
            auditLogger.log("desktop_outbound_offered", {
              sessionId,
              source,
              trackCount: stream!.getTracks().length,
            });
          })();
    }, [
      sync.connectionState,
      mobileConnected,
      shouldInitiate,
      createOffer,
      addLocalStream,
      resolvedOutbound,
      auditLogger,
      sessionId,
    ]);

  const updateOutboundCanvas = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (sync.connectionState !== "paired") return;
    const id = window.setInterval(updateOutboundCanvas, 66);
    return () => window.clearInterval(id);
  }, [sync.connectionState, updateOutboundCanvas]);

  const handleCameraFrame = useCallback(
    (canvas: HTMLCanvasElement) => {
      cameraCanvasRef.current = canvas;
    },
    []
  );

  return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 px-4 py-3 font-mono text-[11px] text-zinc-400">
          Outbound source:{" "}
          <span className="text-zinc-200">
            {outboundSource === "inject"
              ? "Injector desktop loop"
              : outboundSource === "document"
                ? "Document / QA canvas fallback"
                : "waiting"}
          </span>
          {resolvedOutbound ? " · inject stream live" : " · no inject stream yet"}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
        <PairingPanel
          sessionId={sessionId}
          token={pairToken}
          wsUrl={wsUrl}
          connectionState={sync.connectionState}
          syncServerAvailable={syncServerAvailable}
          onReconnect={sync.reconnect}
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
