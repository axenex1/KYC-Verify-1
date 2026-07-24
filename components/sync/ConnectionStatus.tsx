"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SyncConnectionState } from "@/lib/sync/use-sync-client";

interface ConnectionStatusProps {
  connectionState: SyncConnectionState;
  syncServerAvailable: boolean;
  onReconnect?: () => void;
}

function stateVariant(
  state: SyncConnectionState
): "success" | "warning" | "destructive" | "secondary" {
  switch (state) {
    case "paired":
      return "success";
    case "connecting":
      return "warning";
    case "error":
      return "destructive";
    case "disconnected":
    case "idle":
      return "secondary";
    default: {
      const _exhaustive: never = state;
      void _exhaustive;
      return "secondary";
    }
  }
}

function stateLabel(state: SyncConnectionState): string {
  switch (state) {
    case "paired":
      return "Companion connected";
    case "connecting":
      return "Connecting…";
    case "disconnected":
      return "Disconnected";
    case "error":
      return "Connection error";
    case "idle":
      return "Waiting for companion";
    default: {
      const _exhaustive: never = state;
      void _exhaustive;
      return "Waiting for companion";
    }
  }
}

export function ConnectionStatus({
  connectionState,
  syncServerAvailable,
  onReconnect,
}: ConnectionStatusProps) {
  const prev = useRef<SyncConnectionState | null>(null);

  useEffect(() => {
    if (prev.current && prev.current !== connectionState) {
      if (connectionState === "paired") {
        toast.success("Companion connected");
      } else if (connectionState === "error") {
        toast.error("Companion connection error");
      } else if (
        connectionState === "disconnected" &&
        prev.current === "paired"
      ) {
        toast.warning("Companion disconnected");
      }
    }
    prev.current = connectionState;
  }, [connectionState]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={stateVariant(connectionState)}>
        {stateLabel(connectionState)}
      </Badge>
      {!syncServerAvailable ? (
        <Badge variant="destructive">Sync server offline</Badge>
      ) : null}
      {(connectionState === "error" || connectionState === "disconnected") &&
      onReconnect ? (
        <Button size="sm" variant="outline" onClick={onReconnect}>
          Reconnect
        </Button>
      ) : null}
    </div>
  );
}
