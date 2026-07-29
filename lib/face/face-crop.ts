import {
  FaceLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  FACE_LANDMARKER_MODEL,
  MEDIAPIPE_WASM_PATH,
} from "@/lib/constants";

/** MediaPipe face mesh indices used for ID-photo bounding box. */
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;
const FOREHEAD = 10;
const CHIN = 152;
const LEFT_TEMPLE = 127;
const RIGHT_TEMPLE = 356;

let imageLandmarker: FaceLandmarker | null = null;

export interface FaceCropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceCropResult {
  box: FaceCropBox;
  /** JPEG blob of the cropped face, suitable for Runway referenceImage. */
  blob: Blob;
  /** Object URL for UI preview (caller should revoke). */
  objectUrl: string;
  width: number;
  height: number;
}

export async function initImageFaceLandmarker(): Promise<FaceLandmarker> {
  if (imageLandmarker) return imageLandmarker;

  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
  imageLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_LANDMARKER_MODEL,
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });

  return imageLandmarker;
}

function landmarksToBox(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number,
  padRatio = 0.38
): FaceCropBox {
  const indices = [
    LEFT_CHEEK,
    RIGHT_CHEEK,
    FOREHEAD,
    CHIN,
    LEFT_TEMPLE,
    RIGHT_TEMPLE,
  ];
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const index of indices) {
    const point = landmarks[index];
    if (!point) continue;
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  // Prefer a near-square portrait crop centered on the face.
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const faceW = Math.max(0.08, maxX - minX);
  const faceH = Math.max(0.08, maxY - minY);
  const side = Math.max(faceW, faceH) * (1 + padRatio);

  const x = Math.max(0, cx - side / 2);
  const y = Math.max(0, cy - side / 2 - side * 0.05);
  const width = Math.min(1 - x, side);
  const height = Math.min(1 - y, side);

  return {
    x: Math.round(x * imageWidth),
    y: Math.round(y * imageHeight),
    width: Math.round(width * imageWidth),
    height: Math.round(height * imageHeight),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode document image"));
    img.src = src;
  });
}

async function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode face crop"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Detect the portrait face on an uploaded ID/license image and return a
 * padded square JPEG crop for Runway avatar referenceImage.
 */
export async function cropFaceFromDocument(
  source: File | Blob | string
): Promise<FaceCropResult> {
  const objectUrl =
    typeof source === "string" ? source : URL.createObjectURL(source);
  const shouldRevokeSource = typeof source !== "string";

  try {
    const img = await loadImage(objectUrl);
    const landmarker = await initImageFaceLandmarker();
    const detection = landmarker.detect(img);
    const face = detection.faceLandmarks?.[0];

    if (!face?.length) {
      throw new Error(
        "No face found on the document. Use a clearer license photo or crop manually."
      );
    }

    const box = landmarksToBox(face, img.naturalWidth, img.naturalHeight);
    if (box.width < 48 || box.height < 48) {
      throw new Error("Detected face crop is too small. Try a higher-res scan.");
    }

    const outputSize = Math.min(1024, Math.max(512, Math.max(box.width, box.height)));
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable for face crop");

    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.drawImage(
      img,
      box.x,
      box.y,
      box.width,
      box.height,
      0,
      0,
      outputSize,
      outputSize
    );

    const blob = await canvasToJpegBlob(canvas);
    const cropUrl = URL.createObjectURL(blob);

    return {
      box,
      blob,
      objectUrl: cropUrl,
      width: outputSize,
      height: outputSize,
    };
  } finally {
    if (shouldRevokeSource) URL.revokeObjectURL(objectUrl);
  }
}
