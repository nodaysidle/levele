"use client";

import { useMemo } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import StaticPreview from "@/components/canvas/StaticPreview";

export default function PageStrip() {
  const doc = useEditor((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const setActivePage = useEditor((s) => s.setActivePage);
  const addPage = useEditor((s) => s.addPage);
  const duplicatePage = useEditor((s) => s.duplicatePage);
  const deletePage = useEditor((s) => s.deletePage);

  const pages = doc?.pages ?? [];
  const items = useMemo(() => {
    if (!doc) return [];
    return pages.map((page) => {
      const aspect = doc.width / doc.height;
      const width = Math.max(28, Math.min(116, Math.round(66 * aspect)));
      return { page, width };
    });
  }, [doc, pages]);

  if (!doc) return null;

  return (
    <div className="page-strip" aria-label="Pages">
      <div className="flex flex-col items-center justify-center gap-1 pr-2 shrink-0 border-r border-[var(--line)] mr-1">
        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Pages</span>
        <span className="text-[10px] font-semibold text-[var(--ink-soft)]">{pages.length}</span>
      </div>
      {items.map(({ page, width }, index) => (
        <div key={page.id} className="page-item">
          <button
            type="button"
            className={`page-thumb ${activePageId === page.id ? "is-active" : ""}`}
            style={{ width: width + 10 }}
            onClick={() => setActivePage(page.id)}
            title={page.name}
          >
            <StaticPreview
              width={width}
              docWidth={doc.width}
              docHeight={doc.height}
              page={page}
              elements={doc.elements}
            />
            <span className="page-no">{index + 1}</span>
          </button>
          <div className="page-acts">
            <button type="button" className="page-act" onClick={() => duplicatePage(page.id)} aria-label={`Duplicate ${page.name}`} title="Duplicate page">
              <Copy size={11} />
            </button>
            <button type="button" className="page-act" disabled={pages.length <= 1} onClick={() => deletePage(page.id)} aria-label={`Delete ${page.name}`} title="Delete page">
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="page-add" onClick={addPage} title="Add a page">
        <Plus size={16} />
        <span>Add</span>
      </button>
    </div>
  );
}
