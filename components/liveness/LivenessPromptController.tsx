"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraCapture, type CameraSource } from "@/components/camera/CameraCapture";
import type { CameraFacing } from "@/lib/constants";
import { BackgroundPicker } from "@/components/background/BackgroundPicker";
import { DistortionPicker } from "@/components/camera/DistortionPicker";
import { DocumentQAPanel, type DocumentQAState } from "@/components/documents/DocumentQAPanel";
import { VerifyTabs, type VerifyTab } from "@/components/verify/VerifyTabs";
import { PromptCard } from "./PromptCard";
import { LivenessProgress } from "./LivenessProgress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/lib/session/store";
import {
  LIVENESS_PROMPTS,
  STANDARD_PROMPT_SET,
} from "@/lib/session/prompts";
import { ClientAuditLogger } from "@/lib/audit/logger";
import type { BackgroundMode } from "@/lib/constants";
import { BACKGROUND_PRESETS } from "@/lib/constants";
import type { MotionSignals, LivenessPrompt } from "@/lib/session/types";
import type { PromptResult, SessionExport } from "@/types/session";
import { Download, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import type { ProviderEvaluateFn } from "@/lib/session/providers";
import { evaluatePrompt } from "@/lib/session/prompts";
import type { LivenessPromptId } from "@/lib/session/types";
import type { DistortionSettings } from "@/lib/distortion/types";

import type { DocumentTransform } from "@/lib/documents/transforms";

interface PairedDeviceInfo {
  platform: "android";
  connectedAt: string;
  disconnectedAt?: string;
  transport: "usb-adb";
}

interface LivenessPromptControllerProps {
  sessionId: string;
  prompts?: LivenessPrompt[];
  evaluator?: ProviderEvaluateFn;
  promptSetLabel?: string;
  providerId?: string;
  customPromptSetId?: string;
  cameraSource?: CameraSource;
  remoteStream?: MediaStream | null;
  companionFacingMode?: CameraFacing;
  showLocalCameraSwitcher?: boolean;
  onCameraFrame?: (canvas: HTMLCanvasElement) => void;
  auditLogger?: ClientAuditLogger;
  pairedDevice?: PairedDeviceInfo;
  onDocumentTransformProposed?: (transform: DocumentTransform) => void;
  onDocumentTransformApplied?: (transform: DocumentTransform) => void;
  onDocumentTransformRejected?: () => void;
  onDocumentStateChange?: (state: DocumentQAState) => void;
}

const DEFAULT_EVALUATOR: ProviderEvaluateFn = (promptId, signals) =>
  evaluatePrompt(promptId as LivenessPromptId, signals);

export function LivenessPromptController({
  sessionId,
  prompts = LIVENESS_PROMPTS,
  evaluator = DEFAULT_EVALUATOR,
  promptSetLabel = STANDARD_PROMPT_SET,
  providerId,
  customPromptSetId,
  cameraSource = "local",
  remoteStream = null,
  companionFacingMode,
  showLocalCameraSwitcher = true,
  onCameraFrame,
  auditLogger: externalAuditLogger,
  pairedDevice,
  onDocumentTransformProposed,
  onDocumentTransformApplied,
  onDocumentTransformRejected,
  onDocumentStateChange,
}: LivenessPromptControllerProps) {
  const {
    currentStepIndex,
    promptResults,
    status,
    setStatus,
    setCurrentStepIndex,
    addPromptResult,
    setMotionSignals,
    updateMetrics,
    hydrate,
  } = useSessionStore();

  const defaultAuditLogger = useMemo(() => new ClientAuditLogger(), []);
  const auditLogger = externalAuditLogger ?? defaultAuditLogger;
  const stepStartRef = useRef<number>(0);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const blinkIntervalsRef = useRef<number[]>([]);
  const maxYawRef = useRef(0);
  const fpsSamplesRef = useRef<number[]>([]);
  const lastBlinkCountRef = useRef(0);
  const lastBlinkTimeRef = useRef<number | null>(null);
  const stepCompletingRef = useRef(false);
  const distortionSettingsRef = useRef<DistortionSettings>({ mode: "none", intensity: 0.5 });

  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("none");
  const [presetId, setPresetId] = useState<string>(BACKGROUND_PRESETS[0].id);
  const [presetImage, setPresetImage] = useState<HTMLImageElement | null>(null);
  const [distortionSettings, setDistortionSettings] = useState<DistortionSettings>({
    mode: "none",
    intensity: 0.5,
  });
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacing>("user");
  const activeFacingMode = companionFacingMode ?? facingMode;
  const [activeTab, setActiveTab] = useState<VerifyTab>("liveness");
  const [documentQAState, setDocumentQAState] = useState<DocumentQAState | null>(
    null
  );
  const [exportData, setExportData] = useState<SessionExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const currentPrompt = prompts[currentStepIndex];
  const isCompleted = status === "completed";

  useEffect(() => {
    hydrate(sessionId);
    if (!externalAuditLogger) {
      auditLogger.log("session_started", { sessionId });
    }
  }, [sessionId, hydrate, externalAuditLogger, auditLogger]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const handleFacingModeChange = useCallback((mode: CameraFacing) => {
    setFacingMode(mode);
    setCameraReady(false);
    auditLogger.log("camera_switched", { facingMode: mode });
  }, [auditLogger]);

  const loadPresetImage = useCallback((id: string) => {
    const preset = BACKGROUND_PRESETS.find((p) => p.id === id);
    if (!preset) return;

    const img = new Image();
    img.src = preset.path;
    img.onload = () => setPresetImage(img);
  }, []);

  const handleModeChange = useCallback(
    (mode: BackgroundMode) => {
      setBackgroundMode(mode);
      if (mode === "preset") {
        loadPresetImage(presetId);
      } else {
        setPresetImage(null);
      }
    },
    [loadPresetImage, presetId]
  );

  const handlePresetChange = useCallback(
    (id: string) => {
      setPresetId(id);
      if (backgroundMode === "preset") {
        loadPresetImage(id);
      }
    },
    [backgroundMode, loadPresetImage]
  );

  const handleDistortionChange = useCallback(
    (settings: DistortionSettings) => {
      setDistortionSettings(settings);
      distortionSettingsRef.current = settings;
      auditLogger.log("distortion_changed", {
        mode: settings.mode,
        intensity: settings.intensity,
      });
    },
    [auditLogger]
  );

  const completeStep = useCallback(
    async (passed: boolean, confidence: number) => {
      if (!currentPrompt || stepCompletingRef.current) return;
      stepCompletingRef.current = true;

      const durationMs = Date.now() - stepStartRef.current;
      const result: PromptResult = {
        prompt: currentPrompt.id,
        passed,
        confidence,
        durationMs,
        attempts: currentAttempt,
      };

      addPromptResult(result);
      auditLogger.log(passed ? "prompt_passed" : "prompt_failed", {
        prompt: currentPrompt.id,
        confidence,
        attempts: currentAttempt,
      });

      if (!passed && currentAttempt < currentPrompt.maxAttempts) {
        setCurrentAttempt((prev) => prev + 1);
        stepStartRef.current = Date.now();
        stepCompletingRef.current = false;
        auditLogger.log("prompt_retry", {
          prompt: currentPrompt.id,
          attempt: currentAttempt + 1,
        });
        return;
      }

      const nextIndex = currentStepIndex + 1;
      if (nextIndex >= prompts.length) {
        const avgFps =
          fpsSamplesRef.current.length > 0
            ? fpsSamplesRef.current.reduce((a, b) => a + b, 0) /
              fpsSamplesRef.current.length
            : undefined;

        const metrics = {
          avgBlinkIntervalMs:
            blinkIntervalsRef.current.length > 0
              ? blinkIntervalsRef.current.reduce((a, b) => a + b, 0) /
                blinkIntervalsRef.current.length
              : undefined,
          headRotationMaxDeg: maxYawRef.current,
          avgFps,
        };

        updateMetrics(metrics);
        setStatus("completed");

        const activeDistortionMode = distortionSettingsRef.current.mode;

        const exportPayload: SessionExport = {
          sessionId,
          environment: "application",
          promptSet: promptSetLabel,
          providerId,
          customPromptSetId,
          distortionMode:
            activeDistortionMode !== "none" ? activeDistortionMode : undefined,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          promptResults: [...promptResults, result],
          metrics,
          events: auditLogger.getEvents(),
          device: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          },
          cameraFacing: companionFacingMode ?? facingMode,
          documentQA: documentQAState
            ? {
                templateId: documentQAState.templateId,
                appliedTransform: documentQAState.appliedTransform,
              }
            : undefined,
          pairedDevice,
        };

        auditLogger.log("session_completed", { sessionId });
        setExportData(exportPayload);

        await fetch(`/api/sessions/${sessionId}/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(exportPayload),
        });
      } else {
        setCurrentStepIndex(nextIndex);
        setCurrentAttempt(1);
        stepStartRef.current = Date.now();
        stepCompletingRef.current = false;
        auditLogger.log("prompt_shown", {
          prompt: prompts[nextIndex].id,
        });
      }
    },
    [
      currentPrompt,
      currentStepIndex,
      currentAttempt,
      addPromptResult,
      promptResults,
      prompts,
      promptSetLabel,
      providerId,
      customPromptSetId,
      sessionId,
      setCurrentStepIndex,
      setStatus,
      updateMetrics,
      facingMode,
      documentQAState,
      pairedDevice,
      companionFacingMode,
      auditLogger,
    ]
  );

  const handleMotionUpdate = useCallback(
    (signals: MotionSignals) => {
      setMotionSignals(signals);

      if (signals.fps > 0) {
        fpsSamplesRef.current.push(signals.fps);
        if (fpsSamplesRef.current.length > 60) {
          fpsSamplesRef.current.shift();
        }
      }

      maxYawRef.current = Math.max(maxYawRef.current, Math.abs(signals.yawDeg));

      if (signals.blinkCount > lastBlinkCountRef.current) {
        const now = Date.now();
        if (lastBlinkTimeRef.current !== null) {
          blinkIntervalsRef.current.push(now - lastBlinkTimeRef.current);
        }
        lastBlinkTimeRef.current = now;
        lastBlinkCountRef.current = signals.blinkCount;
        auditLogger.log("motion_detected", {
          type: "blink",
          count: signals.blinkCount,
        });
      }

      if (!currentPrompt || !cameraReady || isCompleted) return;

      const elapsed = Date.now() - stepStartRef.current;
      if (elapsed > currentPrompt.timeoutMs) {
        const evaluation = evaluator(currentPrompt.id, {
          faceDetected: signals.faceDetected,
          blinkCount: signals.blinkCount,
          yawDeg: signals.yawDeg,
          smileRatio: signals.smileRatio,
          faceCentered: signals.faceCentered,
          stabilityScore: signals.stabilityScore,
          holdStillMs: signals.holdStillMs ?? 0,
        });
        completeStep(evaluation.passed, evaluation.confidence);
        return;
      }

      const evaluation = evaluator(currentPrompt.id, {
        faceDetected: signals.faceDetected,
        blinkCount: signals.blinkCount,
        yawDeg: signals.yawDeg,
        smileRatio: signals.smileRatio,
        faceCentered: signals.faceCentered,
        stabilityScore: signals.stabilityScore,
        holdStillMs: signals.holdStillMs ?? 0,
      });

      if (evaluation.passed) {
        completeStep(true, evaluation.confidence);
      }
    },
    [
      cameraReady,
      completeStep,
      currentPrompt,
      isCompleted,
      setMotionSignals,
      evaluator,
      auditLogger,
    ]
  );

  useEffect(() => {
    if (!currentPrompt || isCompleted) return;
    stepCompletingRef.current = false;
    auditLogger.log("prompt_shown", { prompt: currentPrompt.id });
    stepStartRef.current = Date.now();
    lastBlinkCountRef.current = 0;
    lastBlinkTimeRef.current = null;
  }, [currentPrompt, isCompleted, currentStepIndex, auditLogger]);

  const handleDownload = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kyc-session-${sessionId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isCompleted && exportData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Verification capture session completed. Export includes prompts,
              metrics, and timeline events for workflow review.
            </p>
            <div className="space-y-2">
              {exportData.promptResults.map((result) => (
                <div
                  key={result.prompt}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                >
                  <span className="text-sm font-medium">{result.prompt}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.passed ? "success" : "destructive"}>
                      {result.passed ? "Pass" : "Fail"}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {Math.round(result.confidence * 100)}%
                    </span>
                    {result.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleDownload} className="w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Download Audit JSON
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-[env(safe-area-inset-bottom)]">
      <VerifyTabs active={activeTab} onChange={setActiveTab} />

      {isMobileViewport && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Mobile mode — continue the verification flow on your phone browser.
            Use rear camera toggle for document-style capture flows.
          </p>
        </div>
      )}

      {activeTab === "liveness" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <CameraCapture
              source={cameraSource}
              remoteStream={remoteStream}
              backgroundMode={backgroundMode}
              presetImage={presetImage}
              distortionSettings={distortionSettings}
              stepKey={currentPrompt?.id}
              facingMode={activeFacingMode}
              onFacingModeChange={
                showLocalCameraSwitcher ? handleFacingModeChange : undefined
              }
              showLocalSwitcher={showLocalCameraSwitcher}
              onFrame={onCameraFrame}
              onMotionUpdate={handleMotionUpdate}
              onReady={() => {
                setCameraReady(true);
                setStatus("active");
              }}
              onError={(message) => {
                setError(message);
                setStatus("error");
              }}
              enabled={!isCompleted}
            />
            <BackgroundPicker
              mode={backgroundMode}
              presetId={presetId}
              onModeChange={handleModeChange}
              onPresetChange={handlePresetChange}
            />
            <DistortionPicker
              settings={distortionSettings}
              onChange={handleDistortionChange}
            />
          </div>

          <div className="space-y-4">
            <LivenessProgress
              currentStepIndex={currentStepIndex}
              prompts={prompts}
            />
            {currentPrompt && (
              <PromptCard
                prompt={currentPrompt}
                attempt={currentAttempt}
                status="active"
              />
            )}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                {error}
              </p>
            )}
          </div>
        </div>
      ) : (
        <DocumentQAPanel
          sessionId={sessionId}
          auditLogger={auditLogger}
          onStateChange={(state) => {
            setDocumentQAState(state);
            onDocumentStateChange?.(state);
          }}
          onTransformProposed={onDocumentTransformProposed}
          onTransformApplied={onDocumentTransformApplied}
          onTransformRejected={onDocumentTransformRejected}
        />
      )}
    </div>
  );
}
