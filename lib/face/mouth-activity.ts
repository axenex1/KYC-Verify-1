import type { Landmark } from "./blink-detector";

const UPPER_LIP = 13;
const LOWER_LIP = 14;
const LEFT_MOUTH = 61;
const RIGHT_MOUTH = 291;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;

export function computeSmileRatio(landmarks: Landmark[]): number {
  const upperLip = landmarks[UPPER_LIP];
  const lowerLip = landmarks[LOWER_LIP];
  const leftMouth = landmarks[LEFT_MOUTH];
  const rightMouth = landmarks[RIGHT_MOUTH];
  const leftCheek = landmarks[LEFT_CHEEK];
  const rightCheek = landmarks[RIGHT_CHEEK];

  const mouthOpen = Math.abs(lowerLip.y - upperLip.y);
  const mouthWidth = Math.abs(rightMouth.x - leftMouth.x);
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x) || 1;

  const widthRatio = mouthWidth / faceWidth;
  const openRatio = mouthOpen / faceWidth;

  return widthRatio * 0.7 + openRatio * 0.3;
}

export function computeMouthOpenness(landmarks: Landmark[]): number {
  const upperLip = landmarks[UPPER_LIP];
  const lowerLip = landmarks[LOWER_LIP];
  return Math.abs(lowerLip.y - upperLip.y);
}
