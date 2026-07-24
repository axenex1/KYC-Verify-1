import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import {
  FACE_LANDMARKER_MODEL,
  MEDIAPIPE_WASM_PATH,
} from "@/lib/constants";
import { createBlinkTracker, computeEar } from "./blink-detector";
import {
  computeHeadPose,
  computeStabilityScore,
  isFaceCentered,
} from "./head-pose";
import { computeSmileRatio } from "./mouth-activity";
import type { Landmark } from "./blink-detector";
import type { MotionSignals } from "@/lib/session/types";

export type { Landmark };

let faceLandmarkerInstance: FaceLandmarker | null = null;

export async function initFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarkerInstance) {
    return faceLandmarkerInstance;
  }

  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
  faceLandmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_LANDMARKER_MODEL,
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });

  return faceLandmarkerInstance;
}

function toLandmarks(
  result: FaceLandmarkerResult,
  width: number,
  height: number
): Landmark[] | null {
  const face = result.faceLandmarks?.[0];
  if (!face) return null;

  return face.map((point) => ({
    x: point.x * width,
    y: point.y * height,
    z: point.z,
  }));
}

export interface FaceAnalysisFrame {
  landmarks: Landmark[] | null;
  signals: MotionSignals;
}

export function createFaceAnalyzer() {
  const blinkTracker = createBlinkTracker();
  let previousLandmarks: Landmark[] | null = null;
  let lastFrameTime = performance.now();
  let fps = 0;
  let holdStillStart: number | null = null;

  return {
    resetStep(): void {
      blinkTracker.reset();
      holdStillStart = null;
    },

    analyze(
      landmarker: FaceLandmarker,
      video: HTMLVideoElement,
      timestampMs: number
    ): FaceAnalysisFrame {
      const now = performance.now();
      const delta = now - lastFrameTime;
      if (delta > 0) {
        fps = 1000 / delta;
      }
      lastFrameTime = now;

      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height) {
        return {
          landmarks: null,
          signals: {
            faceDetected: false,
            ear: 1,
            blinkCount: 0,
            yawDeg: 0,
            pitchDeg: 0,
            smileRatio: 0,
            faceCentered: false,
            stabilityScore: 0,
            fps,
          },
        };
      }

      const result = landmarker.detectForVideo(video, timestampMs);
      const landmarks = toLandmarks(result, width, height);

      if (!landmarks) {
        previousLandmarks = null;
        holdStillStart = null;
        return {
          landmarks: null,
          signals: {
            faceDetected: false,
            ear: 1,
            blinkCount: blinkTracker.getCount(),
            yawDeg: 0,
            pitchDeg: 0,
            smileRatio: 0,
            faceCentered: false,
            stabilityScore: 0,
            fps,
          },
        };
      }

      const ear = computeEar(landmarks);
      const blinkState = blinkTracker.update(ear);
      const { yawDeg, pitchDeg } = computeHeadPose(landmarks);
      const smileRatio = computeSmileRatio(landmarks);
      const faceCentered = isFaceCentered(landmarks, width, height);
      const stabilityScore = computeStabilityScore(landmarks, previousLandmarks);

      if (stabilityScore >= 0.85 && faceCentered) {
        if (holdStillStart === null) {
          holdStillStart = now;
        }
      } else {
        holdStillStart = null;
      }

      previousLandmarks = landmarks;

      return {
        landmarks,
        signals: {
          faceDetected: true,
          ear,
          blinkCount: blinkState.blinkCount,
          yawDeg,
          pitchDeg,
          smileRatio,
          faceCentered,
          stabilityScore,
          fps,
          holdStillMs:
            holdStillStart !== null ? now - holdStillStart : 0,
        },
      };
    },
  };
}
