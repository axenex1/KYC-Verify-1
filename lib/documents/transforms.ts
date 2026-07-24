export interface DocumentTransform {
  scale: number;
  rotationDeg: number;
  skewX: number;
  skewY: number;
}

export const DEFAULT_DOCUMENT_TRANSFORM: DocumentTransform = {
  scale: 1,
  rotationDeg: 0,
  skewX: 0,
  skewY: 0,
};

export function drawTransformedDocument(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  transform: DocumentTransform,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const baseWidth = image.naturalWidth || image.width;
  const baseHeight = image.naturalHeight || image.height;
  const fitScale = Math.min(
    (canvasWidth * 0.85) / baseWidth,
    (canvasHeight * 0.85) / baseHeight
  );

  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.rotate((transform.rotationDeg * Math.PI) / 180);
  ctx.transform(1, transform.skewY, transform.skewX, 1, 0, 0);
  ctx.scale(transform.scale * fitScale, transform.scale * fitScale);
  ctx.drawImage(image, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
  ctx.restore();
}

export function transformsEqual(
  a: DocumentTransform,
  b: DocumentTransform
): boolean {
  return (
    a.scale === b.scale &&
    a.rotationDeg === b.rotationDeg &&
    a.skewX === b.skewX &&
    a.skewY === b.skewY
  );
}
