"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Hand, MessageCircle, Minus, Plus, Maximize2, Grid3X3, Magnet } from "lucide-react";
import { useEditor, currentText } from "@/lib/editor/store";
import { fontStack } from "@/lib/editor/defaults";

export function TextEditorOverlay() {
  const text = useEditor(currentText);
  const doc = useEditor((s) => s.doc);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const session = useEditor((s) => s.session);
  const setEditingText = useEditor((s) => s.setEditingText);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (text) {
      setValue(text.text);
      const timer = setTimeout(() => {
        areaRef.current?.focus();
        const length = areaRef.current?.value.length ?? 0;
        areaRef.current?.setSelectionRange(length, length);
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [text?.id]);

  if (!text || !doc) return null;

  const commit = () => {
    if (!value.trim()) {
      session?.deleteElements([text.id]);
    }
    setEditingText(null);
  };

  const style: React.CSSProperties = {
    position: "absolute",
    left: pan.x + text.x * zoom,
    top: pan.y + text.y * zoom,
    width: text.width * zoom,
    minHeight: text.height * zoom,
    transform: `rotate(${text.rotation}deg)`,
    transformOrigin: "center",
    fontFamily: fontStack(text.fontFamily),
    fontSize: text.fontSize * zoom,
    fontWeight: text.fontWeight,
    fontStyle: text.italic ? "italic" : "normal",
    lineHeight: text.lineHeight,
    letterSpacing: text.letterSpacing * zoom,
    color: text.color,
    textAlign: text.align === "justify" ? "justify" : text.align,
    background: text.backgroundColor ?? "rgba(255,255,255,0.06)",
    border: "1.5px solid #FF5A36",
    borderRadius: (text.backgroundRadius ?? 2) * zoom,
    outline: "none",
    resize: "none",
    overflow: "hidden",
    padding: 0,
    margin: 0,
    textDecoration: text.underline ? "underline" : "none",
    zIndex: 30,
    boxSizing: "border-box",
    caretColor: "#FF5A36",
    whiteSpace: "pre-wrap",
  };

  return (
    <textarea
      ref={areaRef}
      aria-label="Edit text"
      value={value}
      style={style}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        e.target.style.height = "auto";
        const pixels = e.target.scrollHeight;
        e.target.style.height = `${Math.max(pixels, text.fontSize * zoom)}px`;
        session?.updateElement(text.id, {
          text: next,
          height: Math.max(text.fontSize * 1.1, pixels / zoom),
        });
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
        e.stopPropagation();
      }}
    />
  );
}

export function CommentPins() {
  const doc = useEditor((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const comments = useMemo(
    () =>
      doc && activePageId
        ? doc.comments.filter((c) => c.pageId === activePageId)
        : [],
    [doc, activePageId],
  );
  const draft = useEditor((s) => s.commentDraft);
  const setDraft = useEditor((s) => s.setCommentDraft);
  const activeId = useEditor((s) => s.activeCommentId);
  const setActive = useEditor((s) => s.setActiveComment);
  const addComment = useEditor((s) => s.addComment);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const [text, setText] = useState("");

  return (
    <>
      {comments
        .filter((c) => !c.resolved)
        .map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActive(c.id);
            }}
            className={`comment-pin ${activeId === c.id ? "comment-pin-active" : ""}`}
            style={{ left: pan.x + c.x * zoom, top: pan.y + c.y * zoom }}
            aria-label={`Comment by ${c.authorName}`}
          >
            <MessageCircle size={15} strokeWidth={2.4} />
            <span>{c.authorName.slice(0, 1)}</span>
          </button>
        ))}

      {draft ? (
        <div
          className="comment-draft"
          style={{
            // keep the 270px popover inside the canvas, away from the right panel
            left: `clamp(14px, ${pan.x + draft.x * zoom}px, calc(100% - 284px))`,
            top: `max(${pan.y + draft.y * zoom}px, 150px)`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            autoFocus
            value={text}
            placeholder="Leave a note for your team…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && text.trim()) {
                addComment(draft.x, draft.y, text.trim());
                setText("");
              }
              if (e.key === "Escape") setDraft(null);
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[var(--muted)]">
              {/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"} + Enter to post
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setDraft(null);
                  setText("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-dark btn-xs"
                disabled={!text.trim()}
                onClick={() => {
                  addComment(draft.x, draft.y, text.trim());
                  setText("");
                }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function RemoteCursors() {
  const peers = useEditor((s) => s.peers);
  const activePageId = useEditor((s) => s.activePageId);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  return (
    <>
      {peers
        .filter((p) => p.pageId === activePageId && p.cursor)
        .map((p) => (
          <div
            key={p.id}
            className="remote-cursor"
            style={{
              left: pan.x + (p.cursor?.x ?? 0) * zoom,
              top: pan.y + (p.cursor?.y ?? 0) * zoom,
              color: p.color,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M4 2 L20 12 L12.5 13.5 L9.5 21 Z" fill={p.color} stroke="#fff" strokeWidth="1.2" />
            </svg>
            <span style={{ background: p.color }}>{p.name}</span>
          </div>
        ))}
    </>
  );
}

export function ZoomControls() {
  const zoom = useEditor((s) => s.zoom);
  const zoomIn = useEditor((s) => s.zoomIn);
  const zoomOut = useEditor((s) => s.zoomOut);
  const fit = useEditor((s) => s.fitToScreen);
  const showGrid = useEditor((s) => s.showGrid);
  const toggleGrid = useEditor((s) => s.toggleGrid);
  const snapping = useEditor((s) => s.snapping);
  const toggleSnapping = useEditor((s) => s.toggleSnapping);
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  return (
    <div className="zoom-controls">
      <button
        type="button"
        onClick={() => setTool(tool === "hand" ? "select" : "hand")}
        className={tool === "hand" ? "is-active" : ""}
        aria-label="Pan tool"
        title="Pan tool (H)"
      >
        <Hand size={15} />
      </button>
      <div className="zoom-divider" />
      <button type="button" onClick={zoomOut} aria-label="Zoom out" title="Zoom out">
        <Minus size={15} />
      </button>
      <span className="zoom-value">{Math.round(zoom * 100)}%</span>
      <button type="button" onClick={zoomIn} aria-label="Zoom in" title="Zoom in">
        <Plus size={15} />
      </button>
      <div className="zoom-divider" />
      <button type="button" onClick={fit} aria-label="Fit to screen" title="Fit to screen">
        <Maximize2 size={15} />
      </button>
      <button
        type="button"
        onClick={toggleGrid}
        className={showGrid ? "is-active" : ""}
        aria-label="Toggle grid"
        title="Toggle grid"
      >
        <Grid3X3 size={15} />
      </button>
      <button
        type="button"
        onClick={toggleSnapping}
        className={snapping ? "is-active" : ""}
        aria-label="Toggle snapping"
        title="Toggle snapping"
      >
        <Magnet size={15} />
      </button>
    </div>
  );
}
