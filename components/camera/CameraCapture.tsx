"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { ImageSegmenter } from "@mediapipe/tasks-vision";
import { PermissionGate } from "./PermissionGate";
import { RemoteCameraSource } from "./RemoteCameraSource";
import { CameraPreview } from "./CameraPreview";
import { CameraSwitcher } from "./CameraSwitcher";
import type { CameraFacing } from "@/lib/constants";
import { initFaceLandmarker, createFaceAnalyzer } from "@/lib/face/face-landmarker";
import { initImageSegmenter, compositeFrame } from "@/lib/background/segmentation";
import type { BackgroundMode } from "@/lib/constants";
import type { MotionSignals } from "@/lib/session/types";
import type { DistortionSettings } from "@/lib/distortion/types";
import { applyDistortionToCanvas } from "@/lib/distortion/pipeline";

export type CameraSource = "local" | "remote";

interface CameraCaptureProps {
  source?: CameraSource;
  remoteStream?: MediaStream | null;
  backgroundMode: BackgroundMode;
  presetImage: HTMLImageElement | null;
  distortionSettings?: DistortionSettings;
  stepKey?: string;
  facingMode: CameraFacing;
  onFacingModeChange?: (mode: CameraFacing) => void;
  showLocalSwitcher?: boolean;
  onMotionUpdate: (signals: MotionSignals) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onFrame?: (canvas: HTMLCanvasElement) => void;
  enabled: boolean;
}

export function CameraCapture({
  source = "local",
  remoteStream = null,
  backgroundMode,
  presetImage,
  distortionSettings,
  stepKey,
  facingMode,
  onFacingModeChange,
  showLocalSwitcher = true,
  onMotionUpdate,
  onReady,
  onError,
  onFrame,
  enabled,
}: CameraCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const segmenterRef = useRef<ImageSegmenter | null>(null);
  const analyzerRef = useRef(createFaceAnalyzer());
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const modelsReadyRef = useRef(false);

  // throttling / batching refs
  const lastProcessedRef = useRef<number>(0);
  const lastMotionUpdateRef = useRef<number>(0);
  const prevFaceDetectedRef = useRef<boolean | null>(null);
  const prevLowFpsRef = useRef<boolean | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [lowFps, setLowFps] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [streamReady, setStreamReady] = useState(false);

  const handleStreamReady = useCallback(
    (_stream: MediaStream, video: HTMLVideoElement) => {
      videoRef.current = video;
      startTimeRef.current = performance.now();
      setStreamReady(true);
      setIsLoading(!modelsReadyRef.current);
    },
    []
  );

  const handleSwitchCamera = useCallback(() => {
    if (!onFacingModeChange) return;
    const next: CameraFacing = facingMode === "user" ? "environment" : "user";
    setStreamReady(false);
    setIsLoading(true);
    modelsReadyRef.current = false;
    onFacingModeChange(next);
  }, [facingMode, onFacingModeChange]);

  useEffect(() => {
    if (stepKey) {
      analyzerRef.current.resetStep();
    }
  }, [stepKey]);

  const remoteStreamKey =
    remoteStream?.id ?? remoteStream?.getTracks().map((t) => t.id).join("-") ?? "none";

  useEffect(() => {
    if (!streamReady || !enabled) return;

    let cancelled = false;

    async function init() {
      try {
        const [landmarker, segmenter] = await Promise.all([
          initFaceLandmarker(),
          initImageSegmenter(),
        ]);

        if (cancelled) return;

        landmarkerRef.current = landmarker;
        segmenterRef.current = segmenter;
        modelsReadyRef.current = true;
        setIsLoading(false);
        onReady();
      } catch {
        onError("Failed to load MediaPipe vision models. Please refresh and try again.");
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [streamReady, enabled, onReady, onError]);

  useEffect(() => {
    if (!enabled || isLoading || !streamReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    const segmenter = segmenterRef.current;

    if (!video || !canvas || !landmarker || !segmenter) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const TARGET_FPS = 15;
    const MIN_FRAME_MS = 1000 / TARGET_FPS;
    const MOTION_UPDATE_MS = 250;

    const loop = () => {
      const now = performance.now();
      const timestampMs = now - startTimeRef.current;

      try {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width && height) {
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          const shouldProcess = now - lastProcessedRef.current >= MIN_FRAME_MS;

          if (shouldProcess) {
            lastProcessedRef.current = now;

            if (backgroundMode === "none") {
              ctx.drawImage(video, 0, 0, width, height);
            } else {
              compositeFrame(ctx, video, segmenter, timestampMs, {
                mode: backgroundMode,
                presetImage,
                solidColor: "#e5e7eb",
                blurRadius: 20,
              });
            }

            // Apply spatial distortion to the composited frame (visual only —
            // motion analysis still runs on the raw video element).
            if (distortionSettings && distortionSettings.mode !== "none") {
              applyDistortionToCanvas(ctx, width, height, distortionSettings);
            }

            const frame = analyzerRef.current.analyze(landmarker, video, timestampMs);

            if (prevFaceDetectedRef.current !== frame.signals.faceDetected) {
              prevFaceDetectedRef.current = frame.signals.faceDetected;
              setFaceDetected(frame.signals.faceDetected);
            }

            const lowFpsSignal = frame.signals.fps > 0 && frame.signals.fps < 15;
            if (prevLowFpsRef.current !== lowFpsSignal) {
              prevLowFpsRef.current = lowFpsSignal;
              setLowFps(lowFpsSignal);
            }

            if (now - lastMotionUpdateRef.current >= MOTION_UPDATE_MS) {
              lastMotionUpdateRef.current = now;
              onMotionUpdate(frame.signals);
            }

            onFrame?.(canvas);
          } else {
            if (backgroundMode === "none") {
              ctx.drawImage(video, 0, 0, width, height);
            }
          }
        }
      } catch (err) {
        console.error("Camera loop error:", err);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [
    enabled,
    isLoading,
    streamReady,
    backgroundMode,
    presetImage,
    distortionSettings,
    onMotionUpdate,
    onFrame,
  ]);

  const preview = (
    <CameraPreview
      canvasRef={canvasRef}
      isLoading={isLoading}
      lowFps={lowFps}
      faceDetected={faceDetected}
    />
  );

  return (
    <div className="space-y-3">
      {source === "remote" ? (
        <RemoteCameraSource
          key={remoteStreamKey}
          stream={remoteStream}
          onStreamReady={handleStreamReady}
        >
          {preview}
        </RemoteCameraSource>
      ) : (
        <PermissionGate
          facingMode={facingMode}
          onStreamReady={handleStreamReady}
          onError={() => onError("Camera error")}
        >
          {preview}
        </PermissionGate>
      )}
      {streamReady && showLocalSwitcher && onFacingModeChange && source === "local" && (
        <CameraSwitcher
          facingMode={facingMode}
          onSwitch={handleSwitchCamera}
          disabled={isLoading}
        />
      )}
    </div>
  );
}
