"use client";

export interface ProcessedUpload {
  dataUrl: string;
  width: number;
  height: number;
  name: string;
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });

/**
 * Downscales uploads so designs stay portable and don't blow through
 * IndexedDB / share-link limits. Keeps PNG transparency when present.
 */
export async function processImageUpload(file: File, maxSize = 1600): Promise<ProcessedUpload> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.type === "image/svg+xml") {
    const dataUrl = await readAsDataUrl(file);
    return { dataUrl, width: 800, height: 800, name: file.name };
  }
  const raw = await readAsDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image couldn't be decoded."));
    image.src = raw;
  });
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  const wantsPng = file.type === "image/png" || file.type === "image/webp";
  const dataUrl = wantsPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.88);
  return { dataUrl, width, height, name: file.name };
}

export const humanSize = (dataUrl: string) => {
  const bytes = Math.round((dataUrl.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
