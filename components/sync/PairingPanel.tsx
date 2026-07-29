"use client";

import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectionStatus } from "./ConnectionStatus";
import type { SyncConnectionState } from "@/lib/sync/use-sync-client";

interface PairingPanelProps {
  sessionId: string;
  token: string | null;
  wsUrl: string;
  connectionState: SyncConnectionState;
  syncServerAvailable: boolean;
  onReconnect?: () => void;
  injectArmed?: boolean;
}

export function PairingPanel({
  sessionId,
  token,
  wsUrl,
  connectionState,
  syncServerAvailable,
  onReconnect,
  injectArmed = false,
}: PairingPanelProps) {
  const pairPayload = JSON.stringify({
    sessionId,
    token,
    wsUrl,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mobile Companion Pairing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ConnectionStatus
          connectionState={connectionState}
          syncServerAvailable={syncServerAvailable}
          onReconnect={onReconnect}
        />

        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            1. Run <code className="text-xs">npm run dev:all</code>
          </p>
          <p className="text-muted-foreground">
            2. Connect Android via USB and run{" "}
            <code className="text-xs">npm run adb:reverse</code>
          </p>
          <p className="text-muted-foreground">
            3. Open the KYC Companion app and scan the QR (or enter session ID)
          </p>
          <p className="text-muted-foreground">
            4. Push an armed Document Gen clip, then Arm inject on the phone
          </p>
        </div>

        {token && (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-4">
            <QRCodeSVG value={pairPayload} size={160} />
            <code className="break-all text-xs text-muted-foreground">
              {sessionId}
            </code>
          </div>
        )}

        {injectArmed && (
          <p className="text-xs text-neon-green font-mono">
            Phone reports virtual-cam inject ARMED
          </p>
        )}

        <p className="text-xs text-amber-700 dark:text-amber-300">
          Stealth pass against third-party KYC apps requires the Magisk virtcam
          hook on a rooted lab device. See android/README.md.
        </p>
      </CardContent>
    </Card>
  );
}
