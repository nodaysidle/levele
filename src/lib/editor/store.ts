"use client";

import { create } from "zustand";
import type {
  Background,
  DesignDoc,
  DesignElement,
  DesignPage,
  ImageElement,
  Profile,
  RemotePeer,
  ShapeKind,
  TextElement,
} from "./types";
import type { EditorSession, SaveState } from "./session";
import {
  createIcon,
  createImage,
  createShape,
  createSticker,
  createText,
  uid,
} from "./defaults";
import { clamp } from "./geometry";
import { pageDuration } from "./animation";

export type LeftTab =
  | "templates"
  | "text"
  | "elements"
  | "photos"
  | "uploads"
  | "backgrounds"
  | "layers";
export type Tool = "select" | "hand" | "text" | "comment";
export type DialogName = "export" | "share" | "account" | "shortcuts" | "comments" | null;

export interface Toast {
  id: string;
  message: string;
  kind: "info" | "success" | "error";
}

interface EditorState {
  session: EditorSession | null;
  doc: DesignDoc | null;
  ready: boolean;
  profile: Profile | null;
  selection: string[];
  activePageId: string | null;
  editingTextId: string | null;
  tool: Tool;
  leftTab: LeftTab;
  zoom: number;
  pan: { x: number; y: number };
  viewport: { width: number; height: number };
  fitVersion: number;
  showGrid: boolean;
  showGuides: boolean;
  snapping: boolean;
  showLeft: boolean;
  showRight: boolean;
  dialog: DialogName;
  commentDraft: { x: number; y: number } | null;
  activeCommentId: string | null;
  commentsOpen: boolean;
  saveState: SaveState;
  peers: RemotePeer[];
  toasts: Toast[];
  canUndo: boolean;
  canRedo: boolean;
  previewPlaying: boolean;
  previewTime: number | null;
  exporting: boolean;
  exportPageId: string | null;
  exportTime: number | null;
  presentationOpen: boolean;
  presentationIndex: number;
  presentationAutoplay: boolean;
  mobilePanel: "none" | "left" | "right";
}

interface EditorActions {
  attach: (session: EditorSession, profile: Profile) => void;
  detach: () => void;
  setDoc: (doc: DesignDoc) => void;
  setProfile: (profile: Profile) => void;
  setTitle: (title: string) => void;
  setActivePage: (id: string) => void;
  setSelection: (ids: string[]) => void;
  toggleSelection: (id: string, additive?: boolean) => void;
  selectWithGroup: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  setEditingText: (id: string | null) => void;
  setTool: (tool: Tool) => void;
  setLeftTab: (tab: LeftTab) => void;
  setZoom: (zoom: number, center?: { x: number; y: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
  setPan: (pan: { x: number; y: number }) => void;
  setViewport: (w: number, h: number) => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  toggleSnapping: () => void;
  setShowLeft: (v: boolean) => void;
  setShowRight: (v: boolean) => void;
  setDialog: (d: DialogName) => void;
  setCommentDraft: (p: { x: number; y: number } | null) => void;
  setActiveComment: (id: string | null) => void;
  setCommentsOpen: (v: boolean) => void;
  setSaveState: (s: SaveState) => void;
  setPeers: (p: RemotePeer[]) => void;
  toast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;
  setHistory: (canUndo: boolean, canRedo: boolean) => void;
  playPreview: () => void;
  stopPreview: () => void;
  setExporting: (v: boolean) => void;
  setExportFrame: (pageId: string | null, time: number | null) => void;
  openPresentation: (index?: number) => void;
  closePresentation: () => void;
  setPresentationIndex: (i: number) => void;
  setPresentationAutoplay: (v: boolean) => void;
  setMobilePanel: (v: EditorState["mobilePanel"]) => void;

  addTextAt: (x: number, y: number, text?: string) => string | null;
  addShape: (shape: ShapeKind) => string | null;
  addIcon: (name: string) => string | null;
  addSticker: (emoji: string) => string | null;
  addImage: (src: string, name?: string, natural?: { w: number; h: number }) => Promise<string | null>;
  addElement: (el: DesignElement) => void;
  updateSelected: (patch: Partial<DesignElement>) => void;
  updateElement: (id: string, patch: Partial<DesignElement>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  reorderSelected: (direction: "front" | "back" | "forward" | "backward") => void;
  alignSelected: (mode: "left" | "center" | "right" | "top" | "middle" | "bottom", usePage?: boolean) => void;
  distributeSelected: (axis: "h" | "v") => void;
  nudgeSelected: (dx: number, dy: number) => void;
  toggleLock: (id: string) => void;
  toggleHidden: (id: string) => void;
  renameElement: (id: string, name: string) => void;
  undo: () => void;
  redo: () => void;
  addPage: () => void;
  duplicatePage: (id?: string) => void;
  deletePage: (id?: string) => void;
  movePage: (id: string, dir: -1 | 1) => void;
  updatePage: (id: string, patch: Partial<DesignPage>) => void;
  setPageBackground: (bg: Background) => void;
  addComment: (x: number, y: number, text: string) => void;
  replyToComment: (id: string, text: string) => void;
  resolveComment: (id: string, resolved: boolean) => void;
  deleteComment: (id: string) => void;
}

const initial: EditorState = {
  session: null,
  doc: null,
  ready: false,
  profile: null,
  selection: [],
  activePageId: null,
  editingTextId: null,
  tool: "select",
  leftTab: "templates",
  zoom: 0.6,
  pan: { x: 0, y: 0 },
  viewport: { width: 1000, height: 700 },
  fitVersion: 0,
  showGrid: false,
  showGuides: true,
  snapping: true,
  showLeft: true,
  showRight: true,
  dialog: null,
  commentDraft: null,
  activeCommentId: null,
  commentsOpen: false,
  saveState: "saved",
  peers: [],
  toasts: [],
  canUndo: false,
  canRedo: false,
  previewPlaying: false,
  previewTime: null,
  exporting: false,
  exportPageId: null,
  exportTime: null,
  presentationOpen: false,
  presentationIndex: 0,
  presentationAutoplay: false,
  mobilePanel: "none",
};

let unsubscribe: (() => void) | null = null;
let previewFrame: number | null = null;
let toastCounter = 0;

const maxOrder = (doc: DesignDoc, pageId: string) =>
  Math.max(-1, ...doc.elements.filter((e) => e.pageId === pageId).map((e) => e.order)) + 1;

const cascade = (doc: DesignDoc, pageId: string) => {
  const count = doc.elements.filter((e) => e.pageId === pageId).length;
  return (count % 6) * 22;
};

export const useEditor = create<EditorState & EditorActions>((set, get) => ({
  ...initial,

  attach: (session, profile) => {
    unsubscribe?.();
    if (previewFrame) cancelAnimationFrame(previewFrame);
    const doc = session.snapshot;
    set({
      ...initial,
      session,
      profile,
      doc,
      ready: true,
      activePageId: doc.pages[0]?.id ?? null,
      saveState: "saved",
    });
    unsubscribe = session.subscribe((next) => {
      const state = get();
      const pageIds = new Set(next.pages.map((p) => p.id));
      const elementIds = new Set(next.elements.map((e) => e.id));
      set({
        doc: next,
        selection: state.selection.filter((id) => elementIds.has(id)),
        activePageId:
          state.activePageId && pageIds.has(state.activePageId)
            ? state.activePageId
            : (next.pages[0]?.id ?? null),
        editingTextId:
          state.editingTextId && elementIds.has(state.editingTextId)
            ? state.editingTextId
            : null,
        canUndo: session.canUndo,
        canRedo: session.canRedo,
      });
    });
    set({ canUndo: session.canUndo, canRedo: session.canRedo });
  },

  detach: () => {
    unsubscribe?.();
    unsubscribe = null;
    if (previewFrame) cancelAnimationFrame(previewFrame);
    previewFrame = null;
    set({ ...initial });
  },

  setDoc: (doc) => set((s) => ({ doc, activePageId: s.activePageId ?? doc.pages[0]?.id ?? null })),
  setProfile: (profile) => {
    set({ profile });
    get().session?.setOwnerId(profile.id);
    get().session?.setProfile(profile);
  },
  setTitle: (title) => get().session?.setTitle(title),

  setActivePage: (id) =>
    set({ activePageId: id, selection: [], editingTextId: null, commentDraft: null }),
  setSelection: (ids) => set({ selection: ids, editingTextId: null }),
  toggleSelection: (id, additive = false) => {
    const { selection } = get();
    if (!additive) {
      set({ selection: [id], editingTextId: null });
      return;
    }
    set({
      selection: selection.includes(id)
        ? selection.filter((x) => x !== id)
        : [...selection, id],
      editingTextId: null,
    });
  },
  selectWithGroup: (id, additive = false) => {
    const { doc } = get();
    if (!doc) return;
    const el = doc.elements.find((e) => e.id === id);
    if (!el) return;
    const ids = el.groupId
      ? doc.elements.filter((e) => e.groupId === el.groupId).map((e) => e.id)
      : [id];
    if (additive) {
      const union = new Set([...get().selection, ...ids]);
      set({ selection: [...union], editingTextId: null });
    } else {
      set({ selection: ids, editingTextId: null });
    }
  },
  clearSelection: () => set({ selection: [], editingTextId: null, commentDraft: null }),
  setEditingText: (id) => set({ editingTextId: id, selection: id ? [id] : get().selection }),

  setTool: (tool) =>
    set({
      tool,
      commentDraft: tool === "comment" ? get().commentDraft : null,
      editingTextId: null,
    }),
  setLeftTab: (tab) => set({ leftTab: tab, showLeft: true, mobilePanel: "left" }),
  setZoom: (zoom, center) => {
    const state = get();
    const next = clamp(zoom, 0.05, 4);
    if (center) {
      const world = {
        x: (center.x - state.pan.x) / state.zoom,
        y: (center.y - state.pan.y) / state.zoom,
      };
      set({
        zoom: next,
        pan: { x: center.x - world.x * next, y: center.y - world.y * next },
      });
    } else {
      set({ zoom: next });
    }
  },
  zoomIn: () => get().setZoom(get().zoom * 1.2),
  zoomOut: () => get().setZoom(get().zoom / 1.2),
  fitToScreen: () => set((s) => ({ fitVersion: s.fitVersion + 1 })),
  setPan: (pan) => set({ pan }),
  setViewport: (width, height) => set({ viewport: { width, height } }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  toggleSnapping: () => set((s) => ({ snapping: !s.snapping })),
  setShowLeft: (v) => set({ showLeft: v }),
  setShowRight: (v) => set({ showRight: v }),
  setDialog: (dialog) => set({ dialog }),
  setCommentDraft: (commentDraft) => set({ commentDraft }),
  setActiveComment: (id) => set({ activeCommentId: id, commentsOpen: id ? true : get().commentsOpen }),
  setCommentsOpen: (commentsOpen) => set({ commentsOpen }),
  setSaveState: (saveState) => set({ saveState }),
  setPeers: (peers) => set({ peers }),
  toast: (message, kind = "info") => {
    const id = `t${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => get().dismissToast(id), 3800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setHistory: (canUndo, canRedo) => set({ canUndo, canRedo }),

  playPreview: () => {
    const { doc, activePageId, previewPlaying } = get();
    if (!doc || !activePageId || previewPlaying) return;
    const page = doc.pages.find((p) => p.id === activePageId);
    if (!page) return;
    const elements = doc.elements.filter((e) => e.pageId === activePageId);
    const total = pageDuration(page.duration, elements);
    if (previewFrame) cancelAnimationFrame(previewFrame);
    const started = performance.now();
    set({ previewPlaying: true, previewTime: 0 });
    const tick = () => {
      const t = (performance.now() - started) / 1000;
      if (t >= total) {
        set({ previewPlaying: false, previewTime: null });
        previewFrame = null;
        return;
      }
      set({ previewTime: t });
      previewFrame = requestAnimationFrame(tick);
    };
    previewFrame = requestAnimationFrame(tick);
  },
  stopPreview: () => {
    if (previewFrame) cancelAnimationFrame(previewFrame);
    previewFrame = null;
    set({ previewPlaying: false, previewTime: null });
  },
  setExporting: (exporting) => set({ exporting }),
  setExportFrame: (exportPageId, exportTime) => set({ exportPageId, exportTime }),
  openPresentation: (index) =>
    set((s) => ({
      presentationOpen: true,
      presentationIndex: index ?? Math.max(0, s.doc?.pages.findIndex((p) => p.id === s.activePageId) ?? 0),
      presentationAutoplay: false,
    })),
  closePresentation: () => set({ presentationOpen: false }),
  setPresentationIndex: (presentationIndex) => set({ presentationIndex }),
  setPresentationAutoplay: (presentationAutoplay) => set({ presentationAutoplay }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),

  addTextAt: (x, y, text = "Your text here") => {
    const { doc, session, activePageId } = get();
    if (!doc || !session || !activePageId) return null;
    const el = createText(activePageId, maxOrder(doc, activePageId), {
      x,
      y,
      text,
      width: text.length > 28 ? 620 : undefined,
      height: 90,
      fontSize: 72,
      fontWeight: 700,
    });
    session.addElement(el);
    set({ selection: [el.id], tool: "select", editingTextId: null });
    return el.id;
  },

  addShape: (shape) => {
    const { doc, session, activePageId } = get();
    if (!doc || !session || !activePageId) return null;
    const isLine = shape === "line" || shape === "arrow";
    const w = shape === "line" ? 360 : shape === "arrow" ? 280 : 260;
    const h = isLine ? 12 : 260;
    const fill = shape === "line" || shape === "arrow" ? "#17161A" : "#FF5A36";
    const nudge = cascade(doc, activePageId);
    const el = createShape(activePageId, maxOrder(doc, activePageId), shape, {
      x: doc.width / 2 - w / 2 + nudge,
      y: doc.height / 2 - h / 2 + nudge,
      width: w,
      height: h,
      fill,
      cornerRadius: shape === "roundRect" ? 36 : 0,
      strokeWidth: isLine ? 6 : 0,
      stroke: isLine ? fill : "transparent",
      dash: shape === "line" ? undefined : undefined,
    });
    session.addElement(el);
    set({ selection: [el.id], tool: "select" });
    return el.id;
  },

  addIcon: (name) => {
    const { doc, session, activePageId } = get();
    if (!doc || !session || !activePageId) return null;
    const size = 150;
    const nudge = cascade(doc, activePageId);
    const el = createIcon(activePageId, maxOrder(doc, activePageId), name, {
      x: doc.width / 2 - size / 2 + nudge,
      y: doc.height / 2 - size / 2 + nudge,
      width: size,
      height: size,
      color: "#17161A",
      strokeWidth: 1.6,
    });
    session.addElement(el);
    set({ selection: [el.id], tool: "select" });
    return el.id;
  },

  addSticker: (emoji) => {
    const { doc, session, activePageId } = get();
    if (!doc || !session || !activePageId) return null;
    const size = 180;
    const nudge = cascade(doc, activePageId);
    const el = createSticker(activePageId, maxOrder(doc, activePageId), emoji, {
      x: doc.width / 2 - size / 2 + nudge,
      y: doc.height / 2 - size / 2 + nudge,
      width: size,
      height: size,
    });
    session.addElement(el);
    set({ selection: [el.id], tool: "select" });
    return el.id;
  },

  addImage: async (src, name = "Photo", natural) => {
    const { doc, session, activePageId } = get();
    if (!doc || !session || !activePageId) return null;
    let ratio = 0.75;
    if (natural) ratio = natural.h / natural.w;
    else {
      ratio = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalHeight / img.naturalWidth || 0.75);
        img.onerror = () => resolve(0.75);
        img.src = src;
      });
    }
    const width = Math.min(doc.width * 0.62, 640);
    const height = Math.min(doc.height * 0.62, width * ratio);
    const nudge = cascade(doc, activePageId);
    const el = createImage(activePageId, maxOrder(doc, activePageId), src, {
      x: doc.width / 2 - width / 2 + nudge,
      y: doc.height / 2 - height / 2 + nudge,
      width,
      height,
      name,
      cornerRadius: 0,
    });
    session.addElement(el);
    set({ selection: [el.id], tool: "select" });
    return el.id;
  },

  addElement: (el) => {
    const { session } = get();
    session?.addElement(el);
    set({ selection: [el.id] });
  },

  updateSelected: (patch) => {
    const { session, selection } = get();
    if (!session || !selection.length) return;
    session.updateSelected(selection, patch);
  },

  updateElement: (id, patch) => get().session?.updateElement(id, patch),

  deleteSelected: () => {
    const { session, selection } = get();
    if (!session || !selection.length) return;
    session.deleteElements(selection);
    set({ selection: [], editingTextId: null });
  },

  duplicateSelected: () => {
    const { session, selection } = get();
    if (!session || !selection.length) return;
    const ids = session.duplicateElements(selection);
    if (ids.length) set({ selection: ids });
  },

  copySelected: () => {
    const { session, selection, toast } = get();
    if (!session || !selection.length) return;
    session.copyToClipboard(selection);
    toast(`Copied ${selection.length} layer${selection.length > 1 ? "s" : ""}`);
  },

  pasteClipboard: () => {
    const { session, activePageId } = get();
    if (!session || !activePageId) return;
    const ids = session.pasteClipboard(activePageId);
    if (ids.length) set({ selection: ids });
  },

  groupSelected: () => {
    const { session, selection, toast } = get();
    if (!session || selection.length < 2) return;
    session.group(selection);
    toast("Grouped", "success");
  },

  ungroupSelected: () => {
    const { session, selection, toast } = get();
    if (!session || !selection.length) return;
    session.ungroup(selection);
    toast("Ungrouped", "success");
  },

  reorderSelected: (direction) => {
    const { session, selection } = get();
    if (!session || !selection.length) return;
    session.reorder(selection, direction);
  },

  alignSelected: (mode, usePage = false) => {
    const { session, selection } = get();
    if (!session || !selection.length) return;
    session.align(selection, mode, usePage || selection.length === 1);
  },

  distributeSelected: (axis) => {
    const { session, selection } = get();
    if (!session || selection.length < 3) return;
    session.distribute(selection, axis);
  },

  nudgeSelected: (dx, dy) => {
    const { doc, selection, session } = get();
    if (!doc || !session) return;
    session.updateElements(
      selection
        .map((id) => {
          const el = doc.elements.find((e) => e.id === id);
          return el && !el.locked ? { id, patch: { x: el.x + dx, y: el.y + dy } } : null;
        })
        .filter(Boolean) as { id: string; patch: Partial<DesignElement> }[],
    );
  },

  toggleLock: (id) => {
    const el = get().doc?.elements.find((e) => e.id === id);
    if (!el) return;
    get().session?.updateElement(id, { locked: !el.locked });
  },
  toggleHidden: (id) => {
    const el = get().doc?.elements.find((e) => e.id === id);
    if (!el) return;
    get().session?.updateElement(id, { hidden: !el.hidden });
  },
  renameElement: (id, name) => get().session?.updateElement(id, { name }),

  undo: () => {
    get().session?.undo();
    set({ editingTextId: null });
  },
  redo: () => {
    get().session?.redo();
    set({ editingTextId: null });
  },

  addPage: () => {
    const { session, activePageId, doc } = get();
    if (!session) return;
    const bg = doc?.pages.find((p) => p.id === activePageId)?.background;
    const id = session.addPage(
      bg
        ? (JSON.parse(JSON.stringify(bg)) as Background)
        : { type: "solid", color: "#FFFFFF" },
    );
    set({ activePageId: id, selection: [] });
  },

  duplicatePage: (id) => {
    const { session, activePageId } = get();
    const pageId = id ?? activePageId;
    if (!session || !pageId) return;
    const newId = session.duplicatePage(pageId);
    if (newId) set({ activePageId: newId, selection: [] });
  },

  deletePage: (id) => {
    const { session, doc, activePageId } = get();
    if (!session || !doc) return;
    const pageId = id ?? activePageId;
    if (!pageId || doc.pages.length <= 1) return;
    const idx = doc.pages.findIndex((p) => p.id === pageId);
    session.deletePage(pageId);
    const next = doc.pages[Math.max(0, idx - 1)];
    set({ activePageId: next?.id ?? null, selection: [], editingTextId: null });
  },

  movePage: (id, dir) => get().session?.movePage(id, dir),

  updatePage: (id, patch) => get().session?.updatePage(id, patch),

  setPageBackground: (bg) => {
    const { session, activePageId } = get();
    if (!session || !activePageId) return;
    session.updatePage(activePageId, { background: bg });
  },

  addComment: (x, y, text) => {
    const { session, activePageId, profile, doc } = get();
    if (!session || !activePageId || !profile || !doc) return;
    const id = session.addComment({
      pageId: activePageId,
      x,
      y,
      text,
      resolved: false,
      replies: [],
      authorId: profile.id,
      authorName: profile.name,
      authorColor: profile.color,
    });
    set({ activeCommentId: id, commentDraft: null, tool: "select", commentsOpen: true });
  },

  replyToComment: (id, text) => {
    const { session, profile } = get();
    if (!session || !profile) return;
    session.replyToComment(id, {
      text,
      authorId: profile.id,
      authorName: profile.name,
      authorColor: profile.color,
    });
  },

  resolveComment: (id, resolved) => get().session?.setCommentResolved(id, resolved),
  deleteComment: (id) => {
    get().session?.deleteComment(id);
    set({ activeCommentId: null });
  },
}));

export const selectedElements = (s: EditorState): DesignElement[] =>
  s.doc && s.selection.length
    ? s.selection
        .map((id) => s.doc?.elements.find((e) => e.id === id))
        .filter(Boolean) as DesignElement[]
    : [];

export const activePage = (s: EditorState): DesignPage | null =>
  s.doc?.pages.find((p) => p.id === s.activePageId) ?? null;

export const activeElements = (s: EditorState): DesignElement[] =>
  s.doc && s.activePageId
    ? s.doc.elements
        .filter((e) => e.pageId === s.activePageId)
        .sort((a, b) => a.order - b.order)
    : [];

export const activeComments = (s: EditorState) =>
  s.doc && s.activePageId ? s.doc.comments.filter((c) => c.pageId === s.activePageId) : [];

export const currentText = (s: EditorState): TextElement | null => {
  const el = s.doc?.elements.find((e) => e.id === s.editingTextId);
  return el?.type === "text" ? (el as TextElement) : null;
};

export const currentImage = (s: EditorState): ImageElement | null => {
  const el = s.doc?.elements.find((e) => e.id === s.selection[0]);
  return el?.type === "image" ? (el as ImageElement) : null;
};
