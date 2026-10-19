"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Home, Loader2, Play, Square } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { EditorSession } from "@/lib/editor/session";
import { decodeSnapshot } from "@/lib/share";
import { getCurrentProfile } from "@/lib/storage/auth";
import { getDocRecord } from "@/lib/storage/db";
import { createDoc, uid } from "@/lib/editor/defaults";
import type { DesignDoc, StoredDoc } from "@/lib/editor/types";
import TopBar from "./TopBar";
import LeftPanel, { LeftRail } from "./LeftPanel";
import PageStrip from "./PageStrip";
import Inspector from "./Inspector";
import CommentsPanel from "./CommentsPanel";
import ExportDialog from "./ExportDialog";
import ShareDialog from "./ShareDialog";
import AccountDialog from "./AccountDialog";
import ShortcutsDialog from "./ShortcutsDialog";
import { Toasts, Spinner } from "@/components/ui/Modal";

const CanvasStage = dynamic(() => import("./CanvasStage"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-[var(--muted)]">
      <Loader2 size={22} className="spin" />
    </div>
  ),
});

const PresentMode = dynamic(() => import("./PresentMode"), { ssr: false });

const isEditable = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

function LoadingScreen() {
  return (
    <div className="editor-shell">
      <div className="flex-1 grid place-items-center">
        <div className="text-center">
          <div className="brand justify-center text-[26px] mb-5">
            <span className="brand-mark" style={{ width: 38, height: 38, borderRadius: 11 }}>
              <svg width="22" height="22" viewBox="0 0 64 64" fill="none">
                <path d="M18 16h9v23h19v9H18z" fill="#F6EFE4" />
                <circle cx="46" cy="18" r="6" fill="#FF5A36" />
              </svg>
            </span>
            Levele
          </div>
          <Spinner size={20} className="mx-auto text-[var(--accent)]" />
          <p className="text-[11px] text-[var(--muted)] mt-3">Opening your studio…</p>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="editor-shell">
      <div className="editor-topbar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            <svg width="17" height="17" viewBox="0 0 64 64" fill="none">
              <path d="M18 16h9v23h19v9H18z" fill="#F6EFE4" />
              <circle cx="46" cy="18" r="6" fill="#FF5A36" />
            </svg>
          </span>
          Levele
        </Link>
      </div>
      <div className="flex-1 grid place-items-center p-6">
        <div className="max-w-[420px] text-center">
          <div className="w-14 h-14 rounded-2xl bg-white border border-[var(--line)] grid place-items-center mx-auto shadow-sm">
            <Home size={24} className="text-[var(--muted)]" />
          </div>
          <h1 className="font-[var(--font-display)] text-[25px] tracking-[-0.03em] font-semibold mt-4">
            This design isn&apos;t here
          </h1>
          <p className="text-[12.5px] text-[var(--muted)] mt-2 leading-relaxed">
            It may have been made in another browser, or the share link is incomplete. Designs are
            local-first by default.
          </p>
          <div className="flex gap-2 justify-center mt-5">
            <Link href="/" className="btn btn-dark btn-sm">
              <ArrowLeft size={13} /> Back to designs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditorShell({ docId }: { docId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bootQuery = useMemo(
    () => ({
      room: searchParams.get("room") ?? undefined,
      snapshot: searchParams.get("snapshot") ?? undefined,
      copy: searchParams.get("copy") === "1",
    }),
    [searchParams],
  );
  const [booting, setBooting] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const sessionRef = useRef<EditorSession | null>(null);

  const doc = useEditor((s) => s.doc);
  const ready = useEditor((s) => s.ready);
  const profile = useEditor((s) => s.profile);
  const dialog = useEditor((s) => s.dialog);
  const setDialog = useEditor((s) => s.setDialog);
  const commentsOpen = useEditor((s) => s.commentsOpen);
  const setCommentsOpen = useEditor((s) => s.setCommentsOpen);
  const toasts = useEditor((s) => s.toasts);
  const dismissToast = useEditor((s) => s.dismissToast);
  const previewPlaying = useEditor((s) => s.previewPlaying);
  const stopPreview = useEditor((s) => s.stopPreview);
  const toast = useEditor((s) => s.toast);
  const setProfile = useEditor((s) => s.setProfile);
  const showRight = useEditor((s) => s.showRight);
  const mobilePanel = useEditor((s) => s.mobilePanel);

  useEffect(() => {
    let alive = true;
    let created: EditorSession | null = null;

    const boot = async () => {
      try {
        const profileNow = await getCurrentProfile();
        if (!alive) return;
        setProfile(profileNow);

        let local: StoredDoc | undefined;
        try {
          local = await getDocRecord(docId);
        } catch {
          /* private mode */
        }
        if (!alive) return;

        let initial: DesignDoc | null = null;
        if (bootQuery.copy && bootQuery.snapshot) {
          const snap = decodeSnapshot(bootQuery.snapshot);
          if (snap) {
            initial = {
              ...snap,
              id: uid("doc_"),
              title: snap.title,
              createdAt: Date.now(),
            };
          }
        }
        if (!initial && local?.doc) initial = local.doc;
        if (!initial && bootQuery.snapshot) {
          initial = decodeSnapshot(bootQuery.snapshot);
        }
        if (!initial) {
          setNotFound(true);
          setBooting(false);
          return;
        }

        const session = new EditorSession(initial, {
          ownerId: profileNow.id,
          profile: profileNow,
          onSaveState: (state) => useEditor.getState().setSaveState(state),
          onPeers: (peers) => useEditor.getState().setPeers(peers),
          onHistory: () => {
            const s = sessionRef.current;
            if (s) useEditor.getState().setHistory(s.canUndo, s.canRedo);
          },
        });
        if (!alive) {
          session.destroy();
          return;
        }
        created = session;
        sessionRef.current = session;
        useEditor.getState().attach(session, profileNow);
        if (process.env.NODE_ENV === "development") {
          (window as unknown as { __levele?: unknown }).__levele = { session, store: useEditor };
        }

        if (bootQuery.room) {
          void session.connect(bootQuery.room, profileNow).catch(() => {
            useEditor.getState().toast("Live sync couldn't connect — editing offline.", "error");
          });
        }
        if (bootQuery.copy) {
          window.history.replaceState({}, "", `/editor/${initial.id}`);
        }
        if (alive) setBooting(false);
      } catch (err) {
        console.error(err);
        if (alive) {
          setNotFound(true);
          setBooting(false);
        }
      }
    };
    void boot();

    return () => {
      alive = false;
      if (created) {
        created.destroy();
        useEditor.getState().detach();
        sessionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  useEffect(() => {
    if (doc?.title) document.title = `${doc.title} · Levele`;
  }, [doc?.title]);

  // Global editor shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target) || useEditor.getState().presentationOpen) return;
      const state = useEditor.getState();
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (state.dialog) return;

      if (meta && key === "s") {
        e.preventDefault();
        void state.session?.saveNow().then(() => state.toast("Saved to this browser", "success"));
        return;
      }
      if (meta && key === "z") {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (meta && key === "y") {
        e.preventDefault();
        state.redo();
        return;
      }
      if (meta && key === "d") {
        e.preventDefault();
        state.duplicateSelected();
        return;
      }
      if (meta && key === "c") {
        e.preventDefault();
        state.copySelected();
        return;
      }
      if (meta && key === "x") {
        e.preventDefault();
        state.copySelected();
        state.deleteSelected();
        return;
      }
      if (meta && key === "v") {
        e.preventDefault();
        state.pasteClipboard();
        return;
      }
      if (meta && key === "a") {
        e.preventDefault();
        if (!state.doc || !state.activePageId) return;
        state.setSelection(
          state.doc.elements
            .filter((el) => el.pageId === state.activePageId && !el.hidden && !el.locked)
            .map((el) => el.id),
        );
        return;
      }
      if (meta && key === "g") {
        e.preventDefault();
        if (e.shiftKey) state.ungroupSelected();
        else state.groupSelected();
        return;
      }
      if (meta && (key === "]" || key === "[")) {
        e.preventDefault();
        state.reorderSelected(key === "]" ? "front" : "back");
        return;
      }
      if (meta && (key === "=" || key === "+")) {
        e.preventDefault();
        state.zoomIn();
        return;
      }
      if (meta && key === "-") {
        e.preventDefault();
        state.zoomOut();
        return;
      }
      if (meta && key === "0") {
        e.preventDefault();
        state.fitToScreen();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selection.length) {
          e.preventDefault();
          state.deleteSelected();
        }
        return;
      }
      if (e.key === "Escape") {
        if (state.commentDraft) state.setCommentDraft(null);
        else if (previewPlaying) state.stopPreview();
        else state.clearSelection();
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        state.setDialog("shortcuts");
        return;
      }
      if (e.key === "Enter") {
        const selected = state.doc?.elements.find((el) => el.id === state.selection[0]);
        if (selected?.type === "text") {
          e.preventDefault();
          state.setEditingText(selected.id);
        }
        return;
      }
      if (e.key === "]") {
        state.reorderSelected("forward");
        return;
      }
      if (e.key === "[") {
        state.reorderSelected("backward");
        return;
      }
      if (e.key.startsWith("Arrow")) {
        if (!state.selection.length) return;
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft") state.nudgeSelected(-amount, 0);
        if (e.key === "ArrowRight") state.nudgeSelected(amount, 0);
        if (e.key === "ArrowUp") state.nudgeSelected(0, -amount);
        if (e.key === "ArrowDown") state.nudgeSelected(0, amount);
        return;
      }
      if (!meta && !e.altKey) {
        if (key === "v") state.setTool("select");
        if (key === "t") state.setTool("text");
        if (key === "h") state.setTool("hand");
        if (key === "c") state.setTool("comment");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPlaying]);

  if (notFound) return <NotFound />;
  if (booting || !ready) return <LoadingScreen />;
  if (!doc || !profile) return <LoadingScreen />;

  return (
    <div className="editor-shell">
      <TopBar
        onOpenExport={() => setDialog("export")}
        onOpenShare={() => setDialog("share")}
        onOpenAccount={() => setDialog("account")}
        onOpenShortcuts={() => setDialog("shortcuts")}
      />
      <div className={`editor-main mobile-panel-${mobilePanel}`}>
        <LeftRail />
        <LeftPanel />
        <div className="editor-center">
          <div className="canvas-stage-wrap">
            <CanvasStage />
            {previewPlaying ? (
              <button
                type="button"
                onClick={stopPreview}
                className="absolute left-4 bottom-4 z-20 flex items-center gap-2 rounded-full bg-[var(--ink)] text-white text-[11px] font-semibold px-3.5 py-2 shadow-lg"
              >
                <Square size={11} fill="currentColor" /> Stop animation preview
              </button>
            ) : null}
          </div>
          <PageStrip />
        </div>
        {commentsOpen ? <CommentsPanel /> : showRight ? <Inspector /> : null}
      </div>
      <ExportDialog open={dialog === "export"} onClose={() => setDialog(null)} />
      <ShareDialog open={dialog === "share"} onClose={() => setDialog(null)} />
      <AccountDialog
        open={dialog === "account"}
        onClose={() => setDialog(null)}
        profile={profile}
        onProfile={(p) => useEditor.getState().setProfile(p)}
        toast={toast}
      />
      <ShortcutsDialog open={dialog === "shortcuts"} onClose={() => setDialog(null)} />
      <PresentMode />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      {dialog === null ? null : null}
    </div>
  );
}
