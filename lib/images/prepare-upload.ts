const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode_failed")); };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function prepareImageForUpload(file: File, targetBytes = 900_000) {
  if (!supportedTypes.has(file.type)) throw new Error("unsupported_image");
  if (file.size <= targetBytes && file.type === "image/jpeg") return file;

  let image: HTMLImageElement;
  try {
    image = await loadImage(file);
  } catch {
    if (file.size <= targetBytes) return file;
    throw new Error("image_too_large");
  }

  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("image_processing_failed");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let blob: Blob | null = null;
  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
    blob = await canvasBlob(canvas, quality);
    if (blob && blob.size <= targetBytes) break;
  }
  if (!blob || blob.size > targetBytes) throw new Error("image_too_large");
  const baseName = file.name.replace(/\.[^.]+$/, "") || "device";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
