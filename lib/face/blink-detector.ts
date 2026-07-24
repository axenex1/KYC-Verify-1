export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

const LEFT_EYE = [33, 160, 158, 133, 153, 144] as const;
const RIGHT_EYE = [362, 385, 387, 263, 373, 380] as const;

function distance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eyeAspectRatio(landmarks: Landmark[], indices: readonly number[]): number {
  const p1 = landmarks[indices[0]];
  const p2 = landmarks[indices[1]];
  const p3 = landmarks[indices[2]];
  const p4 = landmarks[indices[3]];
  const p5 = landmarks[indices[4]];
  const p6 = landmarks[indices[5]];

  const vertical1 = distance(p2, p6);
  const vertical2 = distance(p3, p5);
  const horizontal = distance(p1, p4);

  if (horizontal === 0) return 1;
  return (vertical1 + vertical2) / (2 * horizontal);
}

export function computeEar(landmarks: Landmark[]): number {
  const left = eyeAspectRatio(landmarks, LEFT_EYE);
  const right = eyeAspectRatio(landmarks, RIGHT_EYE);
  return (left + right) / 2;
}

export interface BlinkState {
  blinkCount: number;
  isBlinking: boolean;
}

export function createBlinkTracker(earThreshold = 0.21) {
  let blinkCount = 0;
  let wasBlinking = false;
  let closedFrames = 0;

  return {
    update(ear: number): BlinkState {
      const isBlinking = ear < earThreshold;

      if (isBlinking) {
        closedFrames += 1;
      } else if (wasBlinking && closedFrames >= 1) {
        blinkCount += 1;
        closedFrames = 0;
      } else {
        closedFrames = 0;
      }

      wasBlinking = isBlinking;
      return { blinkCount, isBlinking };
    },
    reset(): void {
      blinkCount = 0;
      wasBlinking = false;
      closedFrames = 0;
    },
    getCount(): number {
      return blinkCount;
    },
  };
}
