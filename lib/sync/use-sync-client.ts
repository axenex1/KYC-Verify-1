"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraFacing } from "@/lib/constants";
import {
  getSyncWsUrl,
  type PairStatus,
  type SyncMessage,
  type SyncRole,
} from "@/lib/sync/messages";

export type SyncConnectionState =
  | "idle"
  | "connecting"
  | "paired"
  | "disconnected"
  | "error";

export interface UseSyncClientOptions {
  sessionId: string;
  role: SyncRole;
  token: string | null;
  enabled?: boolean;
  onMessage?: (message: SyncMessage) => void;
  onPeerDisconnected?: () => void;
}

export function useSyncClient({
  sessionId,
  role,
  token,
  enabled = true,
  onMessage,
  onPeerDisconnected,
}: UseSyncClientOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] =
    useState<SyncConnectionState>("idle");
  const [pairStatus, setPairStatus] = useState<PairStatus>("waiting");

  const send = useCallback((message: SyncMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    setConnectionState("connecting");
    const ws = new WebSocket(getSyncWsUrl("localhost"));
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "pair_request",
          sessionId,
          role,
          token,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as SyncMessage;
        onMessage?.(message);

        if (message.type === "pair_ack") {
          if (message.success) {
            setConnectionState("paired");
            setPairStatus("connected");
          } else if (message.error === "peer_disconnected") {
            setConnectionState("disconnected");
            setPairStatus("disconnected");
            onPeerDisconnected?.();
          } else {
            setConnectionState("error");
          }
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
      setPairStatus("disconnected");
    };

    ws.onerror = () => {
      setConnectionState("error");
    };
  }, [token, enabled, sessionId, role, onMessage, onPeerDisconnected]);

  useEffect(() => {
    queueMicrotask(() => {
      connect();
    });
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendCameraFacing = useCallback(
    (facing: CameraFacing) => {
      send({ type: "camera_facing", sessionId, facing });
    },
    [send, sessionId]
  );

  const sendTransformApplied = useCallback(
    (transform: {
      scale: number;
      rotationDeg: number;
      skewX: number;
      skewY: number;
    }) => {
      send({ type: "transform_applied", sessionId, transform });
    },
    [send, sessionId]
  );

  const sendTransformProposed = useCallback(
    (transform: {
      scale: number;
      rotationDeg: number;
      skewX: number;
      skewY: number;
    }) => {
      send({ type: "transform_proposed", sessionId, transform });
    },
    [send, sessionId]
  );

  const sendTransformRejected = useCallback(() => {
    send({ type: "transform_rejected", sessionId });
  }, [send, sessionId]);

  return {
    connectionState,
    pairStatus,
    send,
    sendCameraFacing,
    sendTransformApplied,
    sendTransformProposed,
    sendTransformRejected,
    reconnect: connect,
  };
}
