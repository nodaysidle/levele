"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  CornerDownRight,
  MessageCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import type { DesignComment } from "@/lib/editor/types";

const ago = (ts: number) => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
};

function Thread({
  comment,
  pageName,
  active,
  onActivate,
}: {
  comment: DesignComment;
  pageName?: string;
  active: boolean;
  onActivate: () => void;
}) {
  const profile = useEditor((s) => s.profile);
  const replyToComment = useEditor((s) => s.replyToComment);
  const resolveComment = useEditor((s) => s.resolveComment);
  const deleteComment = useEditor((s) => s.deleteComment);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");

  return (
    <div
      className={`comment-thread ${active ? "is-active" : ""} ${comment.resolved ? "is-resolved" : ""}`}
      onClick={onActivate}
    >
      <div className="flex items-start gap-2">
        <span className="comment-avatar" style={{ background: comment.authorColor }}>
          {comment.authorName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] font-semibold truncate">{comment.authorName}</span>
            <span className="text-[9.5px] text-[var(--muted-2)] shrink-0">{ago(comment.createdAt)}</span>
          </div>
          {pageName ? <div className="text-[9px] text-[var(--muted-2)]">{pageName}</div> : null}
        </div>
        <button
          type="button"
          className={`layer-action ${comment.resolved ? "text-[var(--emerald)]" : ""}`}
          title={comment.resolved ? "Reopen" : "Resolve"}
          onClick={(e) => {
            e.stopPropagation();
            resolveComment(comment.id, !comment.resolved);
          }}
        >
          <Check size={13} />
        </button>
        <button
          type="button"
          className="layer-action hover:text-[#b42318]"
          title="Delete thread"
          onClick={(e) => {
            e.stopPropagation();
            deleteComment(comment.id);
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
      <p className="comment-body">{comment.text}</p>
      {comment.replies.map((r) => (
        <div key={r.id} className="comment-reply">
          <div className="flex items-center gap-1.5">
            <span className="comment-avatar" style={{ background: r.authorColor, width: 18, height: 18, fontSize: 8 }}>
              {r.authorName.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-[10.5px] font-semibold">{r.authorName}</span>
            <span className="text-[9px] text-[var(--muted-2)]">{ago(r.createdAt)}</span>
          </div>
          <p className="comment-body text-[11px]">{r.text}</p>
        </div>
      ))}
      {replyOpen ? (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            autoFocus
            className="textarea"
            style={{ minHeight: 54, fontSize: 11.5 }}
            placeholder="Reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && reply.trim() && profile) {
                replyToComment(comment.id, reply.trim());
                setReply("");
                setReplyOpen(false);
              }
            }}
          />
          <div className="flex justify-end gap-1.5 mt-1.5">
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setReplyOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-dark btn-xs"
              disabled={!reply.trim()}
              onClick={() => {
                if (reply.trim()) {
                  replyToComment(comment.id, reply.trim());
                  setReply("");
                  setReplyOpen(false);
                }
              }}
            >
              Reply
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-[9.5px] font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
          onClick={(e) => {
            e.stopPropagation();
            setReplyOpen(true);
          }}
        >
          <CornerDownRight size={10} /> Reply
        </button>
      )}
    </div>
  );
}

export default function CommentsPanel() {
  const doc = useEditor((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const activeCommentId = useEditor((s) => s.activeCommentId);
  const setActiveComment = useEditor((s) => s.setActiveComment);
  const setCommentsOpen = useEditor((s) => s.setCommentsOpen);
  const setShowRight = useEditor((s) => s.setShowRight);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);
  const setTool = useEditor((s) => s.setTool);
  const setActivePage = useEditor((s) => s.setActivePage);
  const mobilePanel = useEditor((s) => s.mobilePanel);
  const [scope, setScope] = useState<"page" | "all">("page");
  const [showResolved, setShowResolved] = useState(false);

  const all = useMemo(() => {
    if (!doc) return [];
    const filtered = doc.comments.filter(
      (c) => (scope === "all" || c.pageId === activePageId) && (showResolved || !c.resolved),
    );
    return filtered.sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
  }, [doc, activePageId, scope, showResolved]);

  const pageName = (id: string) => {
    const idx = doc?.pages.findIndex((p) => p.id === id) ?? -1;
    return idx >= 0 ? `Page ${idx + 1}` : undefined;
  };

  const close = () => {
    setCommentsOpen(false);
    setActiveComment(null);
    setMobilePanel("none");
  };

  return (
    <aside className={`inspector ${mobilePanel === "right" ? "is-open" : ""}`}>
      <div className="panel-head">
        <h2 className="flex items-center gap-2">
          Comments
          <span className="badge">{all.filter((c) => !c.resolved).length}</span>
        </h2>
        <button type="button" className="modal-close" style={{ width: 26, height: 26 }} onClick={close} aria-label="Close comments">
          <X size={14} />
        </button>
      </div>
      <div className="px-4 py-2.5 border-b border-[var(--line)] flex items-center gap-1.5">
        <div className="segmented flex-1">
          <button type="button" className={scope === "page" ? "is-active" : ""} onClick={() => setScope("page")}>
            This page
          </button>
          <button type="button" className={scope === "all" ? "is-active" : ""} onClick={() => setScope("all")}>
            All pages
          </button>
        </div>
        <button
          type="button"
          className={`btn btn-ghost btn-icon shrink-0 ${showResolved ? "bg-[var(--panel-2)]" : ""}`}
          onClick={() => setShowResolved((v) => !v)}
          title={showResolved ? "Hide resolved" : "Show resolved"}
        >
          <Check size={14} />
        </button>
      </div>
      <div className="px-4 pt-3">
        <button
          type="button"
          className="btn btn-dark btn-sm w-full"
          onClick={() => {
            setTool("comment");
            setMobilePanel("none");
          }}
        >
          <Plus size={13} /> Leave a comment
        </button>
        <p className="text-[9.5px] leading-relaxed text-[var(--muted-2)] mt-2">
          Click anywhere on the canvas to drop a pin. Comments persist with the design and sync in live sessions.
        </p>
      </div>
      <div className="panel-scroll" style={{ paddingTop: 10 }}>
        {all.length ? (
          all.map((c) => (
            <Thread
              key={c.id}
              comment={c}
              pageName={scope === "all" ? pageName(c.pageId) : undefined}
              active={activeCommentId === c.id}
              onActivate={() => {
                if (c.pageId !== activePageId) setActivePage(c.pageId);
                setActiveComment(c.id);
              }}
            />
          ))
        ) : (
          <div className="text-center py-10 px-4">
            <span className="w-10 h-10 rounded-full bg-[var(--panel-2)] grid place-items-center mx-auto text-[var(--muted)]">
              <MessageCircle size={18} />
            </span>
            <p className="text-[12px] font-medium mt-2.5">No comments yet</p>
            <p className="text-[10px] text-[var(--muted-2)] mt-1 leading-relaxed">
              Drop a pin to start a conversation about any part of the design.
            </p>
            {showResolved ? null : (
              <button type="button" className="mt-3 text-[10px] font-semibold text-[var(--muted)] inline-flex items-center gap-1" onClick={() => setShowResolved(true)}>
                Show resolved <ChevronDown size={10} />
              </button>
            )}
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-[var(--line)] flex items-center gap-2">
        <button type="button" className="btn btn-ghost btn-xs flex-1" onClick={() => { setShowRight(true); setCommentsOpen(false); }}>
          Back to design
        </button>
      </div>
    </aside>
  );
}
