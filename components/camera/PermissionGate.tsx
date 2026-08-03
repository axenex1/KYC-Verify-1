"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCameraConstraints,
  getCameraFallbackConstraints,
  type CameraFacing,
} from "@/lib/constants";

export type CameraError =
  | "permission_denied"
  | "not_found"
  | "not_supported"
  | "unknown";

interface PermissionGateProps {
  facingMode?: CameraFacing;
  onStreamReady: (stream: MediaStream, video: HTMLVideoElement) => void;
  onError: (error: CameraError, message: string) => void;
  children?: React.ReactNode;
}

export function PermissionGate({
  facingMode = "user",
  onStreamReady,
  onError,
  children,
}: PermissionGateProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "ready" | "error">("requesting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const requestCamera = useCallback(async () => {
    setStatus("requesting");
    setErrorMessage(null);
    stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      const message = "Camera access is not supported in this browser.";
      setStatus("error");
      setErrorMessage(message);
      onError("not_supported", message);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(
          getCameraConstraints(facingMode)
        );
      } catch {
        stream = await navigator.mediaDevices.getUserMedia(
          getCameraFallbackConstraints(facingMode)
        );
      }

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      video.srcObject = stream;
      streamRef.current = stream;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Video failed to load"));
      });

      await video.play();
      setStatus("ready");
      onStreamReady(stream, video);
    } catch (err) {
      const error = err as DOMException;
      let cameraError: CameraError = "unknown";
      let message = "Failed to access camera.";

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        cameraError = "permission_denied";
        message = "Camera permission was denied. Please allow camera access and try again.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        cameraError = "not_found";
        message =
          facingMode === "environment"
            ? "No rear camera was found. Try switching to front camera."
            : "No camera device was found on this system.";
      }

      setStatus("error");
      setErrorMessage(message);
      onError(cameraError, message);
    }
  }, [facingMode, onStreamReady, onError, stopStream]);

  useEffect(() => {
    queueMicrotask(() => {
      void requestCamera();
    });
  }, [facingMode, requestCamera]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  if (status === "ready") {
    return (
      <>
        <video ref={videoRef} className="hidden" playsInline muted autoPlay />
        {children}
      </>
    );
  }

  if (status === "requesting") {
    return (
      <>
        <video ref={videoRef} className="hidden" playsInline muted autoPlay />
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-900 dark:border-zinc-800">
          <p className="text-sm text-zinc-300">Switching camera...</p>
        </div>
      </>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Camera Access Required
        </CardTitle>
        <CardDescription>
          This verification workflow needs your webcam for capture and session
          processing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "error" && errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
            <CameraOff className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}
        <Button onClick={requestCamera} className="w-full min-h-11">
          Enable Camera
        </Button>
        <video ref={videoRef} className="hidden" playsInline muted autoPlay />
      </CardContent>
    </Card>
  );
}

export function useVideoElement() {
  return useRef<HTMLVideoElement | null>(null);
}
