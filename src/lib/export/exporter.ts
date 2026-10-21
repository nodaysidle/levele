"use client";

import { jsPDF } from "jspdf";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import type { DesignDoc, DocType } from "@/lib/editor/types";
import { pageDuration } from "@/lib/editor/animation";
import { useEditor } from "@/lib/editor/store";
import { preloadImage } from "@/components/canvas/media";
import { preloadIcon } from "@/components/canvas/icon-image";
import { getExportStage } from "@/components/editor/HiddenStages";

export type Progress = (value: number, label?: string) => void;

const waitPaint = (frames = 2) =>
  new Promise<void>((resolve) => {
    let count = 0;
    const tick = () => {
      count += 1;
      if (count >= frames) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

const sanitize = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "levele-design";

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();

export async function prepareExport(doc: DesignDoc, pageId?: string): Promise<void> {
  const pages = pageId ? doc.pages.filter((p) => p.id === pageId) : doc.pages;
  const pageIds = new Set(pages.map((p) => p.id));
  const images = new Set<string>();
  const icons = new Map<string, { name: string; color: string; sw: number }>();
  pages.forEach((page) => {
    if (page.background.type === "image") images.add(page.background.src);
  });
  doc.elements.forEach((el) => {
    if (!pageIds.has(el.pageId)) return;
    if (el.type === "image") images.add(el.src);
    if (el.type === "icon") icons.set(`${el.icon}|${el.color}|${el.strokeWidth}`, {
      name: el.icon,
      color: el.color,
      sw: el.strokeWidth,
    });
  });
  await Promise.all([
    ...Array.from(images).map((src) => preloadImage(src)),
    ...Array.from(icons.values()).map((i) => preloadIcon(i.name, i.color, i.sw)),
  ]);
  try {
    await document.fonts.ready;
    await document.fonts.load("700 64px Inter");
    await document.fonts.load("400 64px 'Instrument Serif'");
  } catch {
    /* fonts are best effort */
  }
  await waitPaint(3);
}

async function setFrame(pageId: string, time: number | null) {
  useEditor.getState().setExportFrame(pageId, time);
  await waitPaint(2);
}

const getLayerCanvas = (): HTMLCanvasElement | null => {
  const stage = getExportStage();
  if (!stage) return null;
  const layers = stage.getLayers();
  const layer = layers[layers.length - 1];
  const native = layer?.getNativeCanvasElement();
  return native ?? null;
};

const captureDataUrl = (pixelRatio: number, mimeType: "image/png" | "image/jpeg") => {
  const stage = getExportStage();
  if (!stage) throw new Error("Export canvas is not ready. Try again.");
  return stage.toDataURL({
    pixelRatio,
    mimeType,
    quality: mimeType === "image/jpeg" ? 0.92 : undefined,
  });
};

const drawScaled = (
  target: HTMLCanvasElement,
  source: HTMLCanvasElement,
  width: number,
  height: number,
) => {
  const ctx = target.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
};

export async function exportImage(opts: {
  doc: DesignDoc;
  pageId: string;
  format: "png" | "jpg";
  pixelRatio: number;
}): Promise<Blob> {
  const { doc, pageId, format, pixelRatio } = opts;
  await prepareExport(doc, pageId);
  await setFrame(pageId, null);
  const dataUrl = captureDataUrl(pixelRatio, format === "png" ? "image/png" : "image/jpeg");
  return dataUrlToBlob(dataUrl);
}

const PDF_SIZES: Partial<Record<DocType, { width: number; height: number; unit: "mm" }>> = {
  poster: { width: 210, height: 297, unit: "mm" },
  resume: { width: 210, height: 297, unit: "mm" },
  invitation: { width: 152.4, height: 203.2, unit: "mm" },
  "business-card": { width: 88.9, height: 50.8, unit: "mm" },
};

export async function exportPdf(opts: {
  doc: DesignDoc;
  pixelRatio: number;
  onProgress?: Progress;
}): Promise<Blob> {
  const { doc, pixelRatio, onProgress } = opts;
  await prepareExport(doc);
  const print = PDF_SIZES[doc.docType];
  let pdf: jsPDF;
  if (print) {
    const landscape = print.width > print.height;
    pdf = new jsPDF({
      orientation: landscape ? "landscape" : "portrait",
      unit: "mm",
      format: [print.width, print.height],
      compress: true,
    });
  } else {
    pdf = new jsPDF({
      orientation: doc.width > doc.height ? "landscape" : "portrait",
      unit: "px",
      format: [doc.width, doc.height],
      compress: true,
      hotfixes: ["px_scaling"],
    });
  }

  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    onProgress?.(i / doc.pages.length, `Rendering page ${i + 1} of ${doc.pages.length}`);
    await setFrame(page.id, null);
    const image = captureDataUrl(pixelRatio, "image/jpeg");
    if (i > 0) {
      if (print) {
        pdf.addPage(
          [print.width, print.height],
          print.width > print.height ? "landscape" : "portrait",
        );
      } else {
        pdf.addPage([doc.width, doc.height], doc.width > doc.height ? "landscape" : "portrait");
      }
    }
    if (print) {
      pdf.addImage(image, "JPEG", 0, 0, print.width, print.height, undefined, "FAST");
    } else {
      pdf.addImage(image, "JPEG", 0, 0, doc.width, doc.height, undefined, "FAST");
    }
  }
  onProgress?.(1, "Finishing PDF");
  const blob = pdf.output("blob");
  return blob;
}

export async function exportGif(opts: {
  doc: DesignDoc;
  pageId: string;
  width: number;
  fps: number;
  duration?: number;
  onProgress?: Progress;
}): Promise<Blob> {
  const { doc, pageId, width, fps, onProgress } = opts;
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Page not found");
  const elements = doc.elements.filter((el) => el.pageId === pageId);
  const duration = Math.min(opts.duration ?? pageDuration(page.duration, elements), 10);
  await prepareExport(doc, pageId);

  const height = Math.max(1, Math.round((width / doc.width) * doc.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const frameCount = Math.max(2, Math.round(duration * fps));
  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps);

  for (let i = 0; i < frameCount; i++) {
    const time = (i / fps) % duration;
    await setFrame(pageId, time);
    const source = getLayerCanvas();
    if (!source) throw new Error("Could not read the export canvas");
    drawScaled(canvas, source, width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    const { data } = ctx.getImageData(0, 0, width, height);
    const palette = quantize(data, 256, { format: "rgb565" });
    const index = applyPalette(data, palette, "rgb565");
    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: 0,
      first: i === 0,
    });
    onProgress?.((i + 1) / frameCount, `Encoding frame ${i + 1} of ${frameCount}`);
    if (i % 2 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  gif.finish();
  onProgress?.(1, "Finishing GIF");
  const bytes = gif.bytes();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "image/gif" });
}

export function getSupportedVideoType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export async function exportVideo(opts: {
  doc: DesignDoc;
  pageId: string;
  width: number;
  duration?: number;
  onProgress?: Progress;
}): Promise<{ blob: Blob; extension: string; mimeType: string }> {
  const { doc, pageId, width, onProgress } = opts;
  const mimeType = getSupportedVideoType();
  if (!mimeType) throw new Error("This browser doesn't support canvas video recording.");
  const page = doc.pages.find((p) => p.id === pageId);
  if (!page) throw new Error("Page not found");
  const elements = doc.elements.filter((el) => el.pageId === pageId);
  const duration = Math.min(opts.duration ?? pageDuration(page.duration, elements), 15);
  await prepareExport(doc, pageId);

  const height = Math.max(2, Math.round((width / doc.width) * doc.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  await setFrame(pageId, 0);
  const initial = getLayerCanvas();
  if (initial) drawScaled(canvas, initial, width, height);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: width >= 1600 ? 6_000_000 : 4_000_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start(120);

  const started = performance.now();
  await new Promise<void>((resolve) => {
    const frame = async () => {
      const time = (performance.now() - started) / 1000;
      if (time >= duration) {
        resolve();
        return;
      }
      onProgress?.(time / duration, `Recording ${time.toFixed(1)}s of ${duration.toFixed(1)}s`);
      await setFrame(pageId, time);
      const source = getLayerCanvas();
      if (source) drawScaled(canvas, source, width, height);
      requestAnimationFrame(() => void frame());
    };
    requestAnimationFrame(() => void frame());
  });
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  onProgress?.(1, "Finishing video");
  const extension = mimeType.includes("mp4") ? "mp4" : "webm";
  return { blob: new Blob(chunks, { type: mimeType }), extension, mimeType };
}

export const exportFilename = (doc: DesignDoc, suffix: string) =>
  `${sanitize(doc.title)}-${suffix}`;

export const downloadProject = (doc: DesignDoc) => {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${sanitize(doc.title)}.levele.json`);
};

export async function parseProjectFile(file: File): Promise<DesignDoc> {
  const text = await file.text();
  const parsed = JSON.parse(text) as DesignDoc;
  if (!parsed || !Array.isArray(parsed.pages) || !Array.isArray(parsed.elements)) {
    throw new Error("That file doesn't look like a Levele design.");
  }
  parsed.comments ??= [];
  return parsed;
}
