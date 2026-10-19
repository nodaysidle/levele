import * as Y from "yjs";
import type {
  DesignComment,
  DesignDoc,
  DesignElement,
  DesignPage,
  DocType,
} from "./types";
import { uid } from "./defaults";

export const LOCAL_ORIGIN = "levele-local";

export interface YCollections {
  meta: Y.Map<unknown>;
  pages: Y.Map<DesignPage>;
  elements: Y.Map<DesignElement>;
  comments: Y.Map<DesignComment>;
}

export const collections = (ydoc: Y.Doc): YCollections => ({
  meta: ydoc.getMap("meta"),
  pages: ydoc.getMap("pages"),
  elements: ydoc.getMap("elements"),
  comments: ydoc.getMap("comments"),
});

export const transactLocal = (ydoc: Y.Doc, fn: () => void) => {
  ydoc.transact(() => {
    fn();
    ydoc.getMap("meta").set("updatedAt", Date.now());
  }, LOCAL_ORIGIN);
};

export function readSnapshot(ydoc: Y.Doc, fallback?: Partial<DesignDoc>): DesignDoc {
  const { meta, pages, elements, comments } = collections(ydoc);
  const now = Date.now();
  const pageList = Array.from(pages.values()).sort((a, b) => a.order - b.order);
  const elementList = Array.from(elements.values()).sort((a, b) => a.order - b.order);
  return {
    id: (meta.get("id") as string) || fallback?.id || uid("doc_"),
    title: (meta.get("title") as string) || fallback?.title || "Untitled design",
    docType: ((meta.get("docType") as DocType) || fallback?.docType || "social") as DocType,
    width: (meta.get("width") as number) || fallback?.width || 1080,
    height: (meta.get("height") as number) || fallback?.height || 1080,
    pages: pageList,
    elements: elementList,
    comments: Array.from(comments.values()).sort((a, b) => a.createdAt - b.createdAt),
    createdAt: (meta.get("createdAt") as number) || fallback?.createdAt || now,
    updatedAt: (meta.get("updatedAt") as number) || fallback?.updatedAt || now,
    templateId: (meta.get("templateId") as string) || fallback?.templateId,
  };
}

export function applyDocument(ydoc: Y.Doc, doc: DesignDoc) {
  const { meta, pages, elements, comments } = collections(ydoc);
  transactLocal(ydoc, () => {
    meta.set("id", doc.id);
    meta.set("title", doc.title);
    meta.set("docType", doc.docType);
    meta.set("width", doc.width);
    meta.set("height", doc.height);
    meta.set("createdAt", doc.createdAt);
    meta.set("updatedAt", doc.updatedAt);
    if (doc.templateId) meta.set("templateId", doc.templateId);
    pages.clear();
    elements.clear();
    comments.clear();
    doc.pages.forEach((p, i) => pages.set(p.id, { ...p, order: i }));
    doc.elements.forEach((el) => elements.set(el.id, el));
    doc.comments.forEach((c) => comments.set(c.id, c));
  });
}

export function setMeta(ydoc: Y.Doc, patch: Partial<Pick<DesignDoc, "title" | "width" | "height">>) {
  const { meta } = collections(ydoc);
  transactLocal(ydoc, () => {
    Object.entries(patch).forEach(([k, v]) => meta.set(k, v));
    meta.set("updatedAt", Date.now());
  });
}

export const updateElements = (
  ydoc: Y.Doc,
  patches: { id: string; patch: Partial<DesignElement> }[],
) => {
  const { elements } = collections(ydoc);
  transactLocal(ydoc, () => {
    for (const { id, patch } of patches) {
      const current = elements.get(id);
      if (current) elements.set(id, { ...current, ...patch } as DesignElement);
    }
  });
};

export const updateElement = (ydoc: Y.Doc, id: string, patch: Partial<DesignElement>) =>
  updateElements(ydoc, [{ id, patch }]);

export function addElement(ydoc: Y.Doc, el: DesignElement) {
  const { elements } = collections(ydoc);
  transactLocal(ydoc, () => elements.set(el.id, el));
}

export function addElements(ydoc: Y.Doc, els: DesignElement[]) {
  const { elements } = collections(ydoc);
  transactLocal(ydoc, () => els.forEach((el) => elements.set(el.id, el)));
}

export function deleteElements(ydoc: Y.Doc, ids: string[]) {
  const { elements } = collections(ydoc);
  transactLocal(ydoc, () => ids.forEach((id) => elements.delete(id)));
}

export function normalizeElementOrder(ydoc: Y.Doc, pageId: string) {
  const { elements } = collections(ydoc);
  const list = Array.from(elements.values())
    .filter((el) => el.pageId === pageId)
    .sort((a, b) => a.order - b.order);
  transactLocal(ydoc, () => {
    list.forEach((el, i) => {
      if (el.order !== i) elements.set(el.id, { ...el, order: i });
    });
  });
}

export function addPage(ydoc: Y.Doc, page: DesignPage) {
  const { pages } = collections(ydoc);
  transactLocal(ydoc, () => {
    const existing = Array.from(pages.values());
    pages.set(page.id, { ...page, order: existing.length });
  });
}

export function insertPage(ydoc: Y.Doc, page: DesignPage, at: number) {
  const { pages } = collections(ydoc);
  transactLocal(ydoc, () => {
    pages.set(page.id, page);
    normalizePageOrder(ydoc);
    void at;
  });
}

export function updatePage(ydoc: Y.Doc, id: string, patch: Partial<DesignPage>) {
  const { pages } = collections(ydoc);
  transactLocal(ydoc, () => {
    const current = pages.get(id);
    if (current) pages.set(id, { ...current, ...patch });
    ydoc.getMap("meta").set("updatedAt", Date.now());
  });
}

export function normalizePageOrder(ydoc: Y.Doc) {
  const { pages } = collections(ydoc);
  const list = Array.from(pages.values()).sort((a, b) => a.order - b.order);
  transactLocal(ydoc, () => {
    list.forEach((p, i) => {
      if (p.order !== i) pages.set(p.id, { ...p, order: i });
    });
  });
}

export function deletePage(ydoc: Y.Doc, pageId: string) {
  const { pages, elements, comments } = collections(ydoc);
  transactLocal(ydoc, () => {
    pages.delete(pageId);
    for (const el of Array.from(elements.values())) {
      if (el.pageId === pageId) elements.delete(el.id);
    }
    for (const c of Array.from(comments.values())) {
      if (c.pageId === pageId) comments.delete(c.id);
    }
    normalizePageOrder(ydoc);
  });
}

export function movePage(ydoc: Y.Doc, pageId: string, direction: -1 | 1) {
  const { pages } = collections(ydoc);
  const list = Array.from(pages.values()).sort((a, b) => a.order - b.order);
  const idx = list.findIndex((p) => p.id === pageId);
  const target = idx + direction;
  if (idx < 0 || target < 0 || target >= list.length) return;
  transactLocal(ydoc, () => {
    const a = list[idx];
    const b = list[target];
    pages.set(a.id, { ...a, order: b.order });
    pages.set(b.id, { ...b, order: a.order });
  });
}

export function addComment(ydoc: Y.Doc, comment: DesignComment) {
  const { comments } = collections(ydoc);
  transactLocal(ydoc, () => comments.set(comment.id, comment));
}

export function updateComment(ydoc: Y.Doc, id: string, patch: Partial<DesignComment>) {
  const { comments } = collections(ydoc);
  transactLocal(ydoc, () => {
    const current = comments.get(id);
    if (current) comments.set(id, { ...current, ...patch });
  });
}

export function deleteComment(ydoc: Y.Doc, id: string) {
  const { comments } = collections(ydoc);
  transactLocal(ydoc, () => comments.delete(id));
}
