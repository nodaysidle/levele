import * as Y from "yjs";
import type {
  Background,
  DesignComment,
  DesignDoc,
  DesignElement,
  DesignPage,
  Profile,
  RemotePeer,
  ShapeKind,
} from "./types";
import {
  addComment as yAddComment,
  addElement as yAddElement,
  addElements as yAddElements,
  addPage as yAddPage,
  applyDocument,
  collections,
  deleteComment as yDeleteComment,
  deleteElements as yDeleteElements,
  deletePage as yDeletePage,
  movePage as yMovePage,
  normalizeElementOrder,
  readSnapshot,
  setMeta,
  transactLocal,
  updateComment as yUpdateComment,
  updateElement,
  updateElements as yUpdateElements,
  updatePage as yUpdatePage,
  LOCAL_ORIGIN,
} from "./ydoc";
import { cloneElement, createPage, uid } from "./defaults";
import { unionBounds } from "./geometry";
import { saveDocRecord } from "@/lib/storage/db";
import { buildTemplate, type TemplateDefinition } from "./templates";
import type { MqttProvider } from "./mqtt-provider";

export type SaveState = "saved" | "saving" | "error" | "offline";
export type AlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

interface SessionOptions {
  ownerId: string;
  profile: Profile;
  roomId?: string;
  onSaveState?: (state: SaveState) => void;
  onPeers?: (peers: RemotePeer[]) => void;
  onHistory?: () => void;
  thumbnailProvider?: () => string | undefined;
}


export class EditorSession {
  readonly ydoc: Y.Doc;
  readonly undoManager: Y.UndoManager;
  snapshot: DesignDoc;
  provider: MqttProvider | null = null;
  private listeners = new Set<(doc: DesignDoc) => void>();
  private options: SessionOptions;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private clipboard: DesignElement[] = [];
  private undoSub: (() => void) | null = null;
  private awarenessSub: (() => void) | null = null;
  private ready = false;

  constructor(initial: DesignDoc, options: SessionOptions) {
    this.options = options;
    this.ydoc = new Y.Doc();
    applyDocument(this.ydoc, initial);
    this.snapshot = readSnapshot(this.ydoc, initial);

    const { meta, pages, elements, comments } = collections(this.ydoc);
    this.undoManager = new Y.UndoManager([meta, pages, elements, comments], {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
      captureTimeout: 600,
    });

    this.undoManager.on("stack-item-added", () => this.options.onHistory?.());
    this.undoManager.on("stack-item-popped", () => this.options.onHistory?.());
    this.undoManager.on("stack-cleared", () => this.options.onHistory?.());

    const update = () => {
      if (this.destroyed) return;
      this.snapshot = readSnapshot(this.ydoc, this.snapshot);
      this.listeners.forEach((fn) => fn(this.snapshot));
      this.scheduleSave();
    };
    this.ydoc.on("update", update);

    this.ready = true;
    this.scheduleSave();
  }

  subscribe(fn: (doc: DesignDoc) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  historyState() {
    return {
      canUndo: this.undoManager.undoStack.length > 0,
      canRedo: this.undoManager.redoStack.length > 0,
    };
  }

  setThumbnailProvider(provider: () => string | undefined) {
    this.options.thumbnailProvider = provider;
  }

  private scheduleSave() {
    if (!this.ready || this.destroyed) return;
    this.options.onSaveState?.("saving");
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.saveNow(), 850);
  }

  async saveNow() {
    if (this.destroyed) return;
    try {
      const thumb = this.options.thumbnailProvider?.();
      await saveDocRecord(
        { ...this.snapshot, updatedAt: Date.now() },
        this.options.ownerId,
        thumb,
      );
      this.options.onSaveState?.("saved");
    } catch (err) {
      console.error("Save failed", err);
      this.options.onSaveState?.("error");
    }
  }

  async connect(roomId?: string, profile?: Profile) {
    if (!roomId || this.provider) return;
    this.options.roomId = roomId;
    const { MqttProvider } = await import("./mqtt-provider");
    if (this.destroyed) return;
    const provider = new MqttProvider(roomId, this.ydoc);
    this.provider = provider;
    this.setProfile(profile ?? this.options.profile);
    this.setPresence({ pageId: "", selection: [], cursor: undefined });
    const onAwareness = () => this.emitPeers();
    provider.awareness.on("change", onAwareness);
    this.awarenessSub = () => provider.awareness.off("change", onAwareness);
    provider.connect();
    this.emitPeers();
    this.options.onSaveState?.("saved");
  }

  setOwnerId(ownerId: string) {
    this.options.ownerId = ownerId;
  }

  setProfile(profile: Profile) {
    this.options.profile = profile;
    this.provider?.awareness.setLocalStateField("user", {
      id: profile.id,
      name: profile.name,
      color: profile.color,
    });
  }

  setPresence(presence: {
    pageId: string;
    selection: string[];
    cursor?: { x: number; y: number };
  }) {
    this.provider?.awareness.setLocalStateField("presence", presence);
  }

  private emitPeers() {
    if (!this.provider) return;
    const states = this.provider.awareness.getStates();
    const peers: RemotePeer[] = [];
    states.forEach((state, clientId) => {
      if (clientId === this.provider?.awareness.clientID) return;
      const user = state.user as { id?: string; name?: string; color?: string } | undefined;
      if (!user) return;
      const presence = (state.presence ?? {}) as {
        pageId?: string;
        selection?: string[];
        cursor?: { x: number; y: number };
      };
      peers.push({
        id: user.id ?? String(clientId),
        name: user.name ?? "Collaborator",
        color: user.color ?? "#FF5A36",
        pageId: presence.pageId ?? "",
        selection: presence.selection ?? [],
        cursor: presence.cursor,
      });
    });
    this.options.onPeers?.(peers);
  }

  // ── Document actions ──────────────────────────────────────────────────
  setTitle(title: string) {
    setMeta(this.ydoc, { title });
  }

  setCanvasSize(width: number, height: number, scaleContent = false) {
    if (scaleContent) {
      const sx = width / this.snapshot.width;
      const sy = height / this.snapshot.height;
      transactLocal(this.ydoc, () => {
        this.snapshot.elements.forEach((el) => {
          updateElement(this.ydoc, el.id, {
            x: el.x * sx,
            y: el.y * sy,
            width: el.width * sx,
            height: el.height * sy,
          });
        });
      });
    }
    setMeta(this.ydoc, { width, height });
  }

  addElement(el: DesignElement) {
    yAddElement(this.ydoc, el);
  }

  addElements(els: DesignElement[]) {
    yAddElements(this.ydoc, els);
  }

  updateElement(id: string, patch: Partial<DesignElement>) {
    updateElement(this.ydoc, id, patch);
  }

  updateElements(patches: { id: string; patch: Partial<DesignElement> }[]) {
    yUpdateElements(this.ydoc, patches);
  }

  updateSelected(ids: string[], patch: Partial<DesignElement>) {
    yUpdateElements(
      this.ydoc,
      ids.map((id) => ({ id, patch })),
    );
  }

  deleteElements(ids: string[]) {
    yDeleteElements(this.ydoc, ids);
  }

  duplicateElements(ids: string[]): string[] {
    const source = this.snapshot.elements.filter((el) => ids.includes(el.id));
    if (!source.length) return [];
    const pageId = source[0].pageId;
    const maxOrder = Math.max(
      0,
      ...this.snapshot.elements.filter((e) => e.pageId === pageId).map((e) => e.order),
    );
    const groupMap = new Map<string, string>();
    const clones = source.map((el, i) => {
      if (el.groupId && !groupMap.has(el.groupId)) groupMap.set(el.groupId, uid("grp_"));
      return {
        ...cloneElement(el, pageId, {
          x: el.x + 32,
          y: el.y + 32,
          order: maxOrder + 1 + i,
        }),
        groupId: el.groupId ? groupMap.get(el.groupId) : undefined,
      } as DesignElement;
    });
    yAddElements(this.ydoc, clones);
    return clones.map((c) => c.id);
  }

  copyToClipboard(ids: string[]) {
    this.clipboard = this.snapshot.elements
      .filter((el) => ids.includes(el.id))
      .map((el) => ({ ...el }));
  }

  hasClipboard() {
    return this.clipboard.length > 0;
  }

  pasteClipboard(pageId: string, offset = 40): string[] {
    if (!this.clipboard.length) return [];
    const existing = this.snapshot.elements.filter((e) => e.pageId === pageId);
    const maxOrder = Math.max(0, ...existing.map((e) => e.order));
    const groupMap = new Map<string, string>();
    const clones = this.clipboard.map((el, i) => {
      if (el.groupId && !groupMap.has(el.groupId)) groupMap.set(el.groupId, uid("grp_"));
      return {
        ...cloneElement(el, pageId, { x: el.x + offset, y: el.y + offset, order: maxOrder + 1 + i }),
        groupId: el.groupId ? groupMap.get(el.groupId) : undefined,
      } as DesignElement;
    });
    yAddElements(this.ydoc, clones);
    return clones.map((c) => c.id);
  }

  group(ids: string[]) {
    const groupId = uid("grp_");
    yUpdateElements(
      this.ydoc,
      ids.map((id) => ({ id, patch: { groupId } })),
    );
  }

  ungroup(ids: string[]) {
    const current = this.snapshot.elements.filter((el) => ids.includes(el.id));
    const groupIds = new Set(current.map((el) => el.groupId).filter(Boolean));
    const affected = this.snapshot.elements.filter((el) => el.groupId && groupIds.has(el.groupId));
    yUpdateElements(
      this.ydoc,
      affected.map((el) => ({ id: el.id, patch: { groupId: undefined } })),
    );
  }

  reorder(ids: string[], direction: "front" | "back" | "forward" | "backward") {
    const selected = this.snapshot.elements.filter((el) => ids.includes(el.id));
    if (!selected.length) return;
    const pageId = selected[0].pageId;
    const list = this.snapshot.elements
      .filter((el) => el.pageId === pageId)
      .sort((a, b) => a.order - b.order);
    const selectedSet = new Set(selected.map((el) => el.id));
    let ordered: DesignElement[];
    if (direction === "front") {
      ordered = [...list.filter((el) => !selectedSet.has(el.id)), ...list.filter((el) => selectedSet.has(el.id))];
    } else if (direction === "back") {
      ordered = [...list.filter((el) => selectedSet.has(el.id)), ...list.filter((el) => !selectedSet.has(el.id))];
    } else {
      ordered = [...list];
      if (direction === "forward") {
        for (let i = ordered.length - 2; i >= 0; i--) {
          if (selectedSet.has(ordered[i].id) && !selectedSet.has(ordered[i + 1].id)) {
            [ordered[i], ordered[i + 1]] = [ordered[i + 1], ordered[i]];
          }
        }
      } else {
        for (let i = 1; i < ordered.length; i++) {
          if (selectedSet.has(ordered[i].id) && !selectedSet.has(ordered[i - 1].id)) {
            [ordered[i], ordered[i - 1]] = [ordered[i - 1], ordered[i]];
          }
        }
      }
    }
    yUpdateElements(
      this.ydoc,
      ordered.map((el, i) => ({ id: el.id, patch: { order: i } })),
    );
  }

  moveElementToIndex(id: string, index: number) {
    const el = this.snapshot.elements.find((e) => e.id === id);
    if (!el) return;
    const list = this.snapshot.elements
      .filter((e) => e.pageId === el.pageId)
      .sort((a, b) => a.order - b.order);
    const from = list.findIndex((e) => e.id === id);
    if (from < 0) return;
    const [moved] = list.splice(from, 1);
    list.splice(Math.max(0, Math.min(list.length, index)), 0, moved);
    yUpdateElements(
      this.ydoc,
      list.map((e, i) => ({ id: e.id, patch: { order: i } })),
    );
  }

  align(ids: string[], mode: AlignMode, usePage = false) {
    const els = this.snapshot.elements.filter((el) => ids.includes(el.id));
    if (!els.length) return;
    const box = usePage
      ? { x: 0, y: 0, width: this.snapshot.width, height: this.snapshot.height }
      : (unionBounds(els) ?? { x: 0, y: 0, width: 0, height: 0 });
    const patches = els.map((el) => {
      const b = unionBounds([el])!;
      let dx = 0;
      let dy = 0;
      if (mode === "left") dx = box.x - b.x;
      if (mode === "center") dx = box.x + box.width / 2 - (b.x + b.width / 2);
      if (mode === "right") dx = box.x + box.width - (b.x + b.width);
      if (mode === "top") dy = box.y - b.y;
      if (mode === "middle") dy = box.y + box.height / 2 - (b.y + b.height / 2);
      if (mode === "bottom") dy = box.y + box.height - (b.y + b.height);
      return { id: el.id, patch: { x: el.x + dx, y: el.y + dy } };
    });
    yUpdateElements(this.ydoc, patches);
  }

  distribute(ids: string[], axis: "h" | "v") {
    const els = this.snapshot.elements.filter((el) => ids.includes(el.id));
    if (els.length < 3) return;
    const withBounds = els
      .map((el) => ({ el, b: unionBounds([el])! }))
      .sort((a, b) => (axis === "h" ? a.b.x - b.b.x : a.b.y - b.b.y));
    const first = withBounds[0];
    const last = withBounds[withBounds.length - 1];
    const totalSize = withBounds.reduce((sum, x) => sum + (axis === "h" ? x.b.width : x.b.height), 0);
    const span =
      axis === "h"
        ? last.b.x + last.b.width - first.b.x
        : last.b.y + last.b.height - first.b.y;
    const gap = (span - totalSize) / (withBounds.length - 1);
    let cursor = axis === "h" ? first.b.x : first.b.y;
    const patches = withBounds.map(({ el, b }, i) => {
      const patch =
        axis === "h"
          ? { x: el.x + (cursor - b.x) }
          : { y: el.y + (cursor - b.y) };
      cursor += (axis === "h" ? b.width : b.height) + gap;
      if (i === 0 || i === withBounds.length - 1) return null;
      return { id: el.id, patch };
    }).filter(Boolean) as { id: string; patch: Partial<DesignElement> }[];
    yUpdateElements(this.ydoc, patches);
  }

  addPage(background: Background = { type: "solid", color: "#FFFFFF" }) {
    const page = createPage(this.snapshot.pages.length, background);
    page.name = `Page ${this.snapshot.pages.length + 1}`;
    yAddPage(this.ydoc, page);
    return page.id;
  }

  duplicatePage(pageId: string): string | null {
    const page = this.snapshot.pages.find((p) => p.id === pageId);
    if (!page) return null;
    const newPage = {
      ...createPage(this.snapshot.pages.length, JSON.parse(JSON.stringify(page.background)), `${page.name} copy`),
      transition: page.transition,
      duration: page.duration,
    };
    const sourceEls = this.snapshot.elements.filter((el) => el.pageId === pageId);
    const groupMap = new Map<string, string>();
    const clones = sourceEls.map((el, i) => {
      if (el.groupId && !groupMap.has(el.groupId)) groupMap.set(el.groupId, uid("grp_"));
      return {
        ...cloneElement(el, newPage.id, { order: i }),
        groupId: el.groupId ? groupMap.get(el.groupId) : undefined,
      } as DesignElement;
    });
    this.ydoc.transact(() => {
      yAddPage(this.ydoc, newPage);
      yAddElements(this.ydoc, clones);
    }, LOCAL_ORIGIN);
    return newPage.id;
  }

  deletePage(pageId: string) {
    if (this.snapshot.pages.length <= 1) return;
    yDeletePage(this.ydoc, pageId);
  }

  updatePage(id: string, patch: Partial<DesignPage>) {
    yUpdatePage(this.ydoc, id, patch);
  }

  movePage(pageId: string, direction: -1 | 1) {
    yMovePage(this.ydoc, pageId, direction);
  }

  applyTemplate(template: TemplateDefinition) {
    const built = buildTemplate(template);
    transactLocal(this.ydoc, () => {
      const meta = this.ydoc.getMap("meta");
      meta.set("docType", template.docType);
      meta.set("width", built.width);
      meta.set("height", built.height);
      meta.set("templateId", template.id);
      if (!this.snapshot.title || /^Untitled/.test(this.snapshot.title)) {
        meta.set("title", template.name);
      }
      const { pages, elements, comments } = collections(this.ydoc);
      pages.clear();
      elements.clear();
      comments.clear();
      built.pages.forEach((p, i) => pages.set(p.id, { ...p, order: i }));
      built.elements.forEach((el) => elements.set(el.id, el));
    });
    this.snapshot = readSnapshot(this.ydoc, this.snapshot);
    this.listeners.forEach((fn) => fn(this.snapshot));
  }

  addComment(comment: Omit<DesignComment, "id" | "createdAt">) {
    const c: DesignComment = { ...comment, id: uid("cmt_"), createdAt: Date.now() };
    yAddComment(this.ydoc, c);
    return c.id;
  }

  replyToComment(commentId: string, reply: Omit<DesignComment["replies"][number], "id" | "createdAt">) {
    const current = this.snapshot.comments.find((c) => c.id === commentId);
    if (!current) return;
    yUpdateComment(this.ydoc, commentId, {
      replies: [
        ...current.replies,
        { ...reply, id: uid("rep_"), createdAt: Date.now() },
      ],
    });
  }

  setCommentResolved(commentId: string, resolved: boolean) {
    yUpdateComment(this.ydoc, commentId, { resolved });
  }

  deleteComment(commentId: string) {
    yDeleteComment(this.ydoc, commentId);
  }

  undo() {
    this.undoManager.undo();
    this.undoManager.stopCapturing();
  }

  redo() {
    this.undoManager.redo();
    this.undoManager.stopCapturing();
  }

  destroy() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      const finalDoc = { ...this.snapshot, updatedAt: Date.now() };
      const ownerId = this.options.ownerId;
      const thumb = this.options.thumbnailProvider?.();
      void saveDocRecord(finalDoc, ownerId, thumb).catch(() => undefined);
    }
    this.destroyed = true;
    this.awarenessSub?.();
    this.provider?.destroy();
    this.ydoc.destroy();
    this.listeners.clear();
  }

  get canUndo() {
    return this.undoManager.undoStack.length > 0;
  }

  get canRedo() {
    return this.undoManager.redoStack.length > 0;
  }
}
