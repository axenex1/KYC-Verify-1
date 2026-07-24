import type { Landmark } from "./blink-detector";

const NOSE_TIP = 1;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;
const FOREHEAD = 10;
const CHIN = 152;

export interface HeadPose {
  yawDeg: number;
  pitchDeg: number;
}

export function computeHeadPose(landmarks: Landmark[]): HeadPose {
  const nose = landmarks[NOSE_TIP];
  const leftCheek = landmarks[LEFT_CHEEK];
  const rightCheek = landmarks[RIGHT_CHEEK];
  const forehead = landmarks[FOREHEAD];
  const chin = landmarks[CHIN];

  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x) || 1;
  const yawRatio = (nose.x - faceCenterX) / (faceWidth / 2);
  const yawDeg = yawRatio * 45;

  const faceCenterY = (forehead.y + chin.y) / 2;
  const faceHeight = Math.abs(chin.y - forehead.y) || 1;
  const pitchRatio = (nose.y - faceCenterY) / (faceHeight / 2);
  const pitchDeg = pitchRatio * 30;

  return { yawDeg, pitchDeg };
}

export function isFaceCentered(
  landmarks: Landmark[],
  frameWidth: number,
  frameHeight: number
): boolean {
  const nose = landmarks[NOSE_TIP];
  const centerX = frameWidth / 2;
  const centerY = frameHeight / 2;
  const toleranceX = frameWidth * 0.15;
  const toleranceY = frameHeight * 0.15;

  return (
    Math.abs(nose.x - centerX) < toleranceX &&
    Math.abs(nose.y - centerY) < toleranceY
  );
}

export function computeStabilityScore(
  current: Landmark[],
  previous: Landmark[] | null
): number {
  if (!previous || previous.length !== current.length) {
    return 0;
  }

  let totalMovement = 0;
  const sampleIndices = [1, 33, 263, 152, 10];

  for (const index of sampleIndices) {
    totalMovement += Math.hypot(
      current[index].x - previous[index].x,
      current[index].y - previous[index].y
    );
  }

  const avgMovement = totalMovement / sampleIndices.length;
  return Math.max(0, 1 - avgMovement / 15);
}
