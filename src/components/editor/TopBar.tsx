"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  CircleHelp,
  Download,
  LayoutPanelLeft,
  MessageCircle,
  Play,
  Redo2,
  Share2,
  SlidersHorizontal,
  Undo2,
  UserRound,
  Users,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { Spinner } from "@/components/ui/Modal";

export default function TopBar({
  onOpenExport,
  onOpenShare,
  onOpenAccount,
  onOpenShortcuts,
}: {
  onOpenExport: () => void;
  onOpenShare: () => void;
  onOpenAccount: () => void;
  onOpenShortcuts: () => void;
}) {
  const doc = useEditor((s) => s.doc);
  const session = useEditor((s) => s.session);
  const saveState = useEditor((s) => s.saveState);
  const canUndo = useEditor((s) => s.canUndo);
  const canRedo = useEditor((s) => s.canRedo);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const setTitle = useEditor((s) => s.setTitle);
  const profile = useEditor((s) => s.profile);
  const peers = useEditor((s) => s.peers);
  const openPresentation = useEditor((s) => s.openPresentation);
  const commentsOpen = useEditor((s) => s.commentsOpen);
  const setCommentsOpen = useEditor((s) => s.setCommentsOpen);
  const setShowRight = useEditor((s) => s.setShowRight);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);
  const showLeft = useEditor((s) => s.showLeft);
  const setShowLeft = useEditor((s) => s.setShowLeft);
  const openComments = useEditor(
    (s) => s.doc?.comments.filter((c) => !c.resolved).length ?? 0,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleDraft, setTitleDraft] = useState(doc?.title ?? "");
  const menuRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleDraft(doc?.title ?? "");
  }, [doc?.id]);

  useEffect(() => {
    if (document.activeElement !== titleRef.current) {
      setTitleDraft(doc?.title ?? "");
    }
  }, [doc?.title]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onClick);
    return () => window.removeEventListener("pointerdown", onClick);
  }, [menuOpen]);

  const commitTitle = () => {
    const next = titleDraft.trim() || "Untitled design";
    if (doc && next !== doc.title) setTitle(next);
    setTitleDraft(next);
  };

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next) {
      setShowRight(true);
      setMobilePanel("right");
    }
  };

  return (
    <header className="editor-topbar">
      <Link href="/" className="brand shrink-0" title="Back to designs">
        <span className="brand-mark" aria-hidden>
          <svg width="17" height="17" viewBox="0 0 64 64" fill="none">
            <path d="M18 16h9v23h19v9H18z" fill="#F6EFE4" />
            <circle cx="46" cy="18" r="6" fill="#FF5A36" />
          </svg>
        </span>
        <span className="hide-mobile">Levele</span>
      </Link>

      <button
        type="button"
        className="btn btn-ghost btn-icon hide-mobile"
        onClick={() => setShowLeft(!showLeft)}
        aria-label="Toggle design panel"
        title="Toggle design panel"
      >
        <LayoutPanelLeft size={16} />
      </button>

      <div className="w-px h-5 bg-[var(--line)] mx-0.5 hide-mobile" />

      <div className="flex items-center gap-2 min-w-0">
        <input
          ref={titleRef}
          className="doc-title-input"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
            e.stopPropagation();
          }}
          aria-label="Design title"
        />
        <span className={`save-pill ${saveState}`} title="Designs autosave to this browser">
          {saveState === "saving" ? <Spinner size={10} /> : <span className="dot" />}
          <span className="hide-mobile">
            {saveState === "saving" ? "Saving" : saveState === "error" ? "Save failed" : "Saved"}
          </span>
        </span>
      </div>

      {peers.length ? (
        <div className="hide-mobile flex items-center -space-x-1.5 ml-1" title={`${peers.length} collaborator${peers.length > 1 ? "s" : ""}`}>
          {peers.slice(0, 3).map((p) => (
            <span
              key={p.id}
              className="w-6 h-6 rounded-full border-2 border-white text-[8.5px] font-bold text-white grid place-items-center"
              style={{ background: p.color }}
            >
              {p.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#0E7C66]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E7C66]" /> Live
          </span>
        </div>
      ) : null}

      <div className="flex-1" />

      <div className="hide-mobile flex items-center gap-0.5">
        <button type="button" className="btn btn-ghost btn-icon" disabled={!canUndo} onClick={undo} title="Undo (⌘Z)" aria-label="Undo">
          <Undo2 size={16} />
        </button>
        <button type="button" className="btn btn-ghost btn-icon" disabled={!canRedo} onClick={redo} title="Redo (⇧⌘Z)" aria-label="Redo">
          <Redo2 size={16} />
        </button>
      </div>

      <button
        type="button"
        className={`btn btn-ghost btn-icon hide-mobile relative ${commentsOpen ? "bg-[var(--panel-2)]" : ""}`}
        onClick={toggleComments}
        aria-label="Comments"
        title="Comments"
      >
        <MessageCircle size={16} />
        {openComments ? (
          <span className="absolute -mt-4 ml-4 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[var(--accent)] text-white text-[8px] font-bold grid place-items-center">
            {openComments}
          </span>
        ) : null}
      </button>

      <button type="button" className="btn btn-ghost btn-icon hide-mobile" onClick={onOpenShortcuts} aria-label="Keyboard shortcuts" title="Keyboard shortcuts">
        <CircleHelp size={16} />
      </button>

      <button
        type="button"
        className="btn btn-ghost btn-icon lg:hidden"
        onClick={() => {
          setShowRight(true);
          setMobilePanel("right");
          setCommentsOpen(false);
        }}
        aria-label="Open inspector"
      >
        <SlidersHorizontal size={16} />
      </button>

      <button type="button" className="btn btn-outline btn-sm" onClick={() => openPresentation()} title="Present (play animations)">
        <Play size={14} />
        <span className="hide-mobile">Present</span>
      </button>

      <button type="button" className="btn btn-outline btn-sm" onClick={onOpenShare}>
        {peers.length ? <Users size={14} /> : <Share2 size={14} />}
        <span className="hide-mobile">Share</span>
      </button>

      <button type="button" className="btn btn-accent btn-sm" onClick={onOpenExport}>
        <Download size={14} />
        <span className="hide-mobile">Export</span>
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="w-8 h-8 rounded-full border border-[var(--line-strong)] bg-white grid place-items-center ml-1 hover:border-[var(--ink)] transition-colors overflow-hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Account menu"
          title={profile?.name ?? "Account"}
        >
          {profile ? (
            <span
              className="w-full h-full grid place-items-center text-[11px] font-bold text-white"
              style={{ background: profile.color }}
            >
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          ) : (
            <UserRound size={15} />
          )}
        </button>
        {menuOpen ? (
          <div className="dropdown right-0 top-10 w-[210px]">
            <div className="px-2.5 py-2 border-b border-[var(--line)] mb-1">
              <div className="text-[11.5px] font-semibold truncate">{profile?.name}</div>
              <div className="text-[10px] text-[var(--muted)] truncate">
                {profile?.guest ? "Guest · local-first" : profile?.email}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onOpenAccount();
              }}
            >
              <UserRound size={13} /> {profile?.guest ? "Create an account" : "Account settings"}
            </button>
            {session ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenShare();
                }}
              >
                <Share2 size={13} /> Invite collaborators
              </button>
            ) : null}
            <hr />
            <Link href="/"><ChevronLeft size={13} /> All designs</Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
