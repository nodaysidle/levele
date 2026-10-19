"use client";

import { Modal } from "@/components/ui/Modal";

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Essentials",
    rows: [
      ["Undo", "⌘ / Ctrl + Z"],
      ["Redo", "⇧⌘Z / Ctrl + Y"],
      ["Save now", "⌘ / Ctrl + S"],
      ["Shortcuts", "?"],
      ["Deselect / close", "Esc"],
    ],
  },
  {
    title: "Editing",
    rows: [
      ["Select all layers", "⌘ / Ctrl + A"],
      ["Copy / paste", "⌘C / ⌘V"],
      ["Cut", "⌘X"],
      ["Duplicate", "⌘ / Ctrl + D"],
      ["Group / ungroup", "⌘G / ⇧⌘G"],
      ["Nudge 1px / 10px", "Arrows / Shift + Arrows"],
      ["Delete", "Backspace / Delete"],
      ["Edit selected text", "Enter"],
    ],
  },
  {
    title: "Arrange",
    rows: [
      ["Bring forward", "]"],
      ["Send backward", "["],
      ["Bring to front", "⌘]"],
      ["Send to back", "⌘["],
      ["Resize", "Drag handles"],
      ["Keep aspect", "Shift + corner drag"],
    ],
  },
  {
    title: "Canvas",
    rows: [
      ["Pan", "Space + drag"],
      ["Zoom", "⌘ / Ctrl + scroll"],
      ["Zoom in / out", "⌘ + / ⌘ −"],
      ["Fit to screen", "⌘0"],
      ["Text tool", "T"],
      ["Select tool", "V"],
      ["Hand tool", "H"],
      ["Comment tool", "C"],
    ],
  },
];

export default function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      subtitle="Fast hands make better design. Most tools work without leaving the canvas."
      width={720}
      footer={
        <div className="flex w-full justify-between items-center">
          <span className="text-[10px] text-[var(--muted-2)]">
            Tip: hold Space to pan, then ⌘/Ctrl + scroll to zoom into the details.
          </span>
          <button type="button" className="btn btn-dark btn-sm" onClick={onClose}>
            Got it
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="section-label mb-2.5">{group.title}</h3>
            <div className="space-y-1.5">
              {group.rows.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-3 py-1 border-b border-dashed border-[var(--line)] last:border-0">
                  <span className="text-[11.5px] text-[var(--ink-soft)]">{label}</span>
                  <span className="text-[10.5px] font-medium text-[var(--muted)] whitespace-nowrap">{keys}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 text-[10.5px] leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--ink)]">Snapping is on by default.</strong> Drag a layer near the
        page edges, center lines or another layer to see coral smart guides. Toggle snapping with the
        magnet in the bottom-right zoom bar.
      </div>
    </Modal>
  );
}
