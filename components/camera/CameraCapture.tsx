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

export type CameraSource = "local" | "remote";

interface CameraCaptureProps {
  source?: CameraSource;
  remoteStream?: MediaStream | null;
  backgroundMode: BackgroundMode;
  presetImage: HTMLImageElement | null;
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

    // target processing fps for heavy work (composite + analyze)
    const TARGET_FPS = 15;
    const MIN_FRAME_MS = 1000 / TARGET_FPS;

    const MOTION_UPDATE_MS = 250; // limit onMotionUpdate calls to every 250ms

    const loop = () => {
      const now = performance.now();
      const timestampMs = now - startTimeRef.current;

      // Always draw a lightweight preview frame for responsiveness.
      // Heavy processing (segmentation + analysis) is throttled to TARGET_FPS.
      try {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width && height) {
          // update canvas size only when different to avoid layout thrash
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          // If we are not ready to run heavy processing this frame, draw a simple video frame
          const shouldProcess = now - lastProcessedRef.current >= MIN_FRAME_MS;

          if (shouldProcess) {
            lastProcessedRef.current = now;

            if (backgroundMode === "none") {
              ctx.drawImage(video, 0, 0, width, height);
            } else {
              // compositeFrame is heavy (segmentation). It's now run at a capped rate.
              compositeFrame(ctx, video, segmenter, timestampMs, {
                mode: backgroundMode,
                presetImage,
                solidColor: "#e5e7eb",
                blurRadius: 20,
              });
            }

            // Run analyzer (face detection / motion) at the same throttled rate
            const frame = analyzerRef.current.analyze(landmarker, video, timestampMs);

            // Only update React state when values actually change to avoid re-render storms
            if (prevFaceDetectedRef.current !== frame.signals.faceDetected) {
              prevFaceDetectedRef.current = frame.signals.faceDetected;
              setFaceDetected(frame.signals.faceDetected);
            }

            const lowFpsSignal = frame.signals.fps > 0 && frame.signals.fps < 15;
            if (prevLowFpsRef.current !== lowFpsSignal) {
              prevLowFpsRef.current = lowFpsSignal;
              setLowFps(lowFpsSignal);
            }

            // Throttle onMotionUpdate to a lower frequency to reduce work for consumers
            if (now - lastMotionUpdateRef.current >= MOTION_UPDATE_MS) {
              lastMotionUpdateRef.current = now;
              // Provide motion signals to parent at a throttled rate
              onMotionUpdate(frame.signals);
            }

            // Call onFrame at throttled rate as well
            onFrame?.(canvas);
          } else {
            // lightweight draw when skipping heavy processing keeps UI responsive
            if (backgroundMode === "none") {
              ctx.drawImage(video, 0, 0, width, height);
            }
          }
        }
      } catch (err) {
        // Guard against unexpected errors in the loop so we don't break the RAF chain
        // Keep errors non-fatal and surface them via onError if available
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
