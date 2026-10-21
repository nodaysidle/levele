"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Download,
  FileImage,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useEditor } from "@/lib/editor/store";
import {
  downloadBlob,
  exportFilename,
  exportGif,
  exportImage,
  exportPdf,
  exportVideo,
  getSupportedVideoType,
} from "@/lib/export/exporter";
import { pageDuration } from "@/lib/editor/animation";

type Format = "png" | "jpg" | "pdf" | "gif" | "video";

const OPTIONS: {
  value: Format;
  title: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "png",
    title: "PNG image",
    desc: "Lossless, current page. Perfect for social and print.",
    icon: <ImageIcon size={17} />,
  },
  {
    value: "jpg",
    title: "JPG image",
    desc: "Smaller file, current page.",
    icon: <FileImage size={17} />,
  },
  {
    value: "pdf",
    title: "PDF",
    desc: "Every page, print-ready for posters and resumes.",
    icon: <FileText size={17} />,
  },
  {
    value: "gif",
    title: "Animated GIF",
    desc: "Current page animation, loops forever.",
    icon: <Sparkles size={17} />,
  },
  {
    value: "video",
    title: "Short video",
    desc: "Current page animation as WebM / MP4.",
    icon: <Film size={17} />,
  },
];

export default function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditor((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const toast = useEditor((s) => s.toast);
  const [format, setFormat] = useState<Format>("png");
  const [scale, setScale] = useState(2);
  const [gifWidth, setGifWidth] = useState(720);
  const [fps, setFps] = useState(12);
  const [videoWidth, setVideoWidth] = useState(1280);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const page = doc?.pages.find((p) => p.id === activePageId) ?? doc?.pages[0];
  const elements = useMemo(
    () => (doc && page ? doc.elements.filter((el) => el.pageId === page.id) : []),
    [doc, page],
  );
  const duration = page ? Math.min(pageDuration(page.duration, elements), 15) : 4;
  const videoSupported = getSupportedVideoType();

  const run = async () => {
    if (!doc || !page || !activePageId) return;
    setBusy(true);
    setError("");
    setDone(false);
    setProgress(0);
    setProgressLabel("Preparing…");
    const pageSuffix =
      activePageId === doc.pages[0]?.id
        ? ""
        : `page-${doc.pages.findIndex((p) => p.id === page.id) + 1}`;
    const base = exportFilename(doc, pageSuffix).replace(/-$/, "");
    try {
      if (format === "png" || format === "jpg") {
        const blob = await exportImage({
          doc,
          pageId: page.id,
          format,
          pixelRatio: scale,
        });
        downloadBlob(blob, `${base}-${scale}x.${format}`);
        toast(`Downloaded ${format.toUpperCase()}`, "success");
      } else if (format === "pdf") {
        const blob = await exportPdf({
          doc,
          pixelRatio: scale,
          onProgress: (p, label) => {
            setProgress(p);
            setProgressLabel(label ?? "");
          },
        });
        downloadBlob(blob, `${base}.pdf`);
        toast("PDF downloaded", "success");
      } else if (format === "gif") {
        const blob = await exportGif({
          doc,
          pageId: page.id,
          width: gifWidth,
          fps,
          onProgress: (p, label) => {
            setProgress(p);
            setProgressLabel(label ?? "");
          },
        });
        downloadBlob(blob, `${base}.gif`);
        toast(`GIF downloaded · ${Math.round(duration * fps)} frames`, "success");
      } else {
        const result = await exportVideo({
          doc,
          pageId: page.id,
          width: videoWidth,
          onProgress: (p, label) => {
            setProgress(p);
            setProgressLabel(label ?? "");
          },
        });
        downloadBlob(result.blob, `${base}.${result.extension}`);
        toast(`Video downloaded as ${result.extension.toUpperCase()}`, "success");
      }
      setProgress(1);
      setProgressLabel("Download ready");
      setDone(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!doc || !page) return null;
  const animWidth = format === "gif" ? gifWidth : videoWidth;

  const cleanBase = exportFilename(doc, "design");
  const pretty = cleanBase.replace(/-design$/, "");

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Export design"
      subtitle="Images, print-ready PDFs, animated GIFs and short videos."
      width={620}
      closeOnBackdrop={!busy}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-[10px] text-[var(--muted-2)]">
            {format === "pdf"
              ? `${doc.pages.length} page${doc.pages.length > 1 ? "s" : ""} · ${doc.width * scale}×${doc.height * scale}`
              : format === "gif" || format === "video"
                ? `${animWidth}×${Math.round((animWidth * doc.height) / doc.width)} · ${duration.toFixed(1)}s animation`
                : `${doc.width * scale}×${doc.height * scale} · current page`}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={busy}>
              {done ? "Done" : "Cancel"}
            </button>
            <button type="button" className="btn btn-accent btn-sm" disabled={busy || (format === "video" && !videoSupported)} onClick={() => void run()}>
              {busy ? <Loader2 size={14} className="spin" /> : done ? <Check size={14} /> : <Download size={14} />}
              {busy ? "Exporting…" : done ? "Download again" : "Download"}
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`export-option ${format === o.value ? "is-active" : ""}`}
            onClick={() => {
              setFormat(o.value);
              setDone(false);
              setError("");
              setProgress(0);
              if (o.value === "pdf" || o.value === "png" || o.value === "jpg") setScale(2);
            }}
            disabled={busy}
          >
            <span className="export-icon">{o.icon}</span>
            <span className="min-w-0">
              <strong>{o.title}</strong>
              <span>{o.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5">
        {format === "png" || format === "jpg" || format === "pdf" ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11.5px] font-semibold">Resolution</div>
              <p className="text-[10px] text-[var(--muted)] m-0 mt-0.5">
                {doc.width * scale} × {doc.height * scale}px
              </p>
            </div>
            <div className="segmented w-[170px]">
              {[1, 2, 3].map((s) => (
                <button key={s} type="button" className={scale === s ? "is-active" : ""} onClick={() => setScale(s)} disabled={busy}>
                  {s}×
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {format === "gif" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11.5px] font-semibold">Width</div>
              <div className="segmented w-[210px]">
                {[540, 720, 960].map((w) => (
                  <button key={w} type="button" className={gifWidth === w ? "is-active" : ""} onClick={() => setGifWidth(w)} disabled={busy}>
                    {w}px
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11.5px] font-semibold">Frame rate</div>
              <div className="segmented w-[170px]">
                {[8, 12, 15].map((f) => (
                  <button key={f} type="button" className={fps === f ? "is-active" : ""} onClick={() => setFps(f)} disabled={busy}>
                    {f} fps
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-[var(--muted)] leading-relaxed m-0">
              About {Math.round(duration * fps)} frames at {Math.round((gifWidth / doc.width) * doc.height)}px height. GIF
              quantization works best on flat, graphic designs.
            </p>
          </div>
        ) : null}
        {format === "video" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11.5px] font-semibold">Width</div>
              <div className="segmented w-[210px]">
                {[720, 1080, 1280].map((w) => (
                  <button key={w} type="button" className={videoWidth === w ? "is-active" : ""} onClick={() => setVideoWidth(w)} disabled={busy}>
                    {w}px
                  </button>
                ))}
              </div>
            </div>
            {!videoSupported ? (
              <p className="text-[10.5px] text-[#b42318] leading-relaxed m-0">
                This browser doesn&apos;t expose MediaRecorder video capture. Chrome, Edge and Safari 16+
                are supported.
              </p>
            ) : (
              <p className="text-[10px] text-[var(--muted)] leading-relaxed m-0">
                Records {duration.toFixed(1)}s in real time as {videoSupported.includes("mp4") ? "MP4" : "WebM"}.
                Keep this tab foregrounded while recording. Audio is not included.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {busy || progress > 0 ? (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] text-[var(--muted)]">{progressLabel || "Working…"}</span>
            <span className="text-[10.5px] font-semibold tabular-nums">{Math.round(progress * 100)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${Math.max(2, progress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-[11px] text-[#b42318] m-0">{error}</p> : null}
      <p className="mt-3 text-[10px] text-[var(--muted-2)] leading-relaxed m-0">
        Exporting “{pretty}”. Animations and loops are included in GIF and video; PDF includes every
        page. Uploaded images are embedded at their stored resolution.
      </p>
    </Modal>
  );
}
