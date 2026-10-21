"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Pause,
  Play,
  X,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { pageDuration } from "@/lib/editor/animation";
import PageContent from "@/components/canvas/PageContent";

export default function PresentMode() {
  const open = useEditor((s) => s.presentationOpen);
  const index = useEditor((s) => s.presentationIndex);
  const autoplay = useEditor((s) => s.presentationAutoplay);
  const doc = useEditor((s) => s.doc);
  const close = useEditor((s) => s.closePresentation);
  const setIndex = useEditor((s) => s.setPresentationIndex);
  const setAutoplay = useEditor((s) => s.setPresentationAutoplay);
  const setActivePage = useEditor((s) => s.setActivePage);

  const [size, setSize] = useState({ width: 1280, height: 800 });
  const [time, setTime] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userExitedFullscreen = useRef(false);

  const page = doc?.pages[index] ?? doc?.pages[0];
  const elements = useMemo(
    () => (doc && page ? doc.elements.filter((el) => el.pageId === page.id) : []),
    [doc, page],
  );
  const duration = page ? Math.min(pageDuration(page.duration, elements), 30) : 4;

  useEffect(() => {
    if (!open) return;
    const measure = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActivePage(page?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page?.id]);

  useEffect(() => {
    if (!open || !page) return;
    setTime(0);
    const started = performance.now();
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - started) / 1000;
      setTime(t);
      if (t < duration + 1.5) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, index, page?.id, duration]);

  useEffect(() => {
    if (!open || !autoplay || !doc) return;
    const timer = setTimeout(() => {
      if (index >= doc.pages.length - 1) {
        setAutoplay(false);
      } else {
        setIndex(index + 1);
      }
    }, (duration + 0.35) * 1000);
    return () => clearTimeout(timer);
  }, [open, autoplay, index, duration, doc, setAutoplay, setIndex]);

  useEffect(() => {
    if (!open) return;
    void document.documentElement.requestFullscreen?.().then(
      () => setFullscreen(true),
      () => setFullscreen(false),
    );
    // Browsers swallow Escape while fullscreen, so leaving fullscreen also ends the show.
    let entered = false;
    const onFullscreen = () => {
      setFullscreen(!!document.fullscreenElement);
      if (document.fullscreenElement) entered = true;
      else if (entered && !userExitedFullscreen.current) close();
      userExitedFullscreen.current = false;
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    overlayRef.current?.focus();
    return () => opener?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        // Keep focus on the overlay so Tab never reaches the editor underneath.
        e.preventDefault();
        const items = Array.from(overlayRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
      } else if ((e.key === " " || e.key === "Enter") && e.target instanceof HTMLButtonElement) {
        return; // let the focused overlay button activate
      } else if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        if (doc && index < doc.pages.length - 1) setIndex(index + 1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        if (index > 0) setIndex(index - 1);
      } else if (e.key === "Escape") {
        close();
      } else if (e.key.toLowerCase() === "f") {
        void toggleFullscreen();
      } else if (e.key.toLowerCase() === "p") {
        setAutoplay(!autoplay);
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End" && doc) {
        setIndex(doc.pages.length - 1);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, index, doc, autoplay, close, setIndex, setAutoplay, fullscreen]);

  useEffect(() => {
    if (!open) return;
    const show = () => {
      setControlsVisible(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setControlsVisible(false), 2800);
    };
    show();
    window.addEventListener("pointermove", show);
    window.addEventListener("pointerdown", show);
    return () => {
      window.removeEventListener("pointermove", show);
      window.removeEventListener("pointerdown", show);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [open]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        userExitedFullscreen.current = true; // the F key / button keeps the show running
        await document.exitFullscreen();
        setFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      }
    } catch {
      setFullscreen(false);
    }
  };

  if (!open || !doc || !page) return null;

  const scale = Math.min(
    (size.width - 56) / doc.width,
    (size.height - 108) / doc.height,
  );
  const width = Math.max(200, Math.round(doc.width * scale));
  const height = Math.max(120, Math.round(doc.height * scale));
  const last = index >= doc.pages.length - 1;

  return (
    <div ref={overlayRef} tabIndex={-1} className="present-overlay" onDoubleClick={() => void toggleFullscreen()}>
      <div
        key={page.id}
        className={`present-stage-wrap page-transition-${page.transition}`}
        style={{ width, height }}
      >
        <Stage width={width} height={height} scaleX={scale} scaleY={scale} listening={false}>
          <Layer listening={false}>
            <PageContent
              page={page}
              elements={elements}
              width={doc.width}
              height={doc.height}
              time={time}
            />
          </Layer>
        </Stage>
      </div>

      <button
        type="button"
        className="absolute left-0 top-0 bottom-0 w-[18%] z-[2] cursor-w-resize"
        style={{ background: "transparent" }}
        onClick={() => index > 0 && setIndex(index - 1)}
        aria-label="Previous slide"
      />
      <button
        type="button"
        className="absolute right-0 top-0 bottom-0 w-[18%] z-[2] cursor-e-resize"
        style={{ background: "transparent" }}
        onClick={() => !last && setIndex(index + 1)}
        aria-label="Next slide"
      />

      <div
        className="present-controls"
        style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? "auto" : "none" }}
      >
        <button type="button" onClick={() => index > 0 && setIndex(index - 1)} disabled={index === 0} aria-label="Previous">
          <ChevronLeft size={17} />
        </button>
        <span className="page-count">
          {index + 1} / {doc.pages.length}
        </span>
        <button type="button" onClick={() => !last && setIndex(index + 1)} disabled={last} aria-label="Next">
          <ChevronRight size={17} />
        </button>
        <span className="w-px h-5 bg-white/15 mx-1" />
        <button type="button" onClick={() => setAutoplay(!autoplay)} aria-label={autoplay ? "Pause autoplay" : "Start autoplay"} title="Autoplay (P)">
          {autoplay ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button type="button" onClick={() => void toggleFullscreen()} aria-label="Toggle fullscreen" title="Fullscreen (F)">
          {fullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
        <button type="button" onClick={close} aria-label="Exit presentation" title="Exit (Esc)">
          <X size={17} />
        </button>
      </div>

      <div className="fixed left-5 bottom-5 z-[3] text-white/40 text-[10px] font-medium tracking-wide">
        {doc.title} · {page.name}
      </div>
      <div className="present-progress">
        <div style={{ width: `${Math.min(100, (time / duration) * 100)}%` }} />
      </div>
    </div>
  );
}
