"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DOC_SIZES } from "@/lib/editor/defaults";
import type { DocType } from "@/lib/editor/types";

export interface NewDesignPayload {
  docType: DocType;
  width: number;
  height: number;
  title: string;
}

export default function NewDesignDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: NewDesignPayload) => void;
}) {
  const [selected, setSelected] = useState<DocType>("social");
  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1080);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    const size = DOC_SIZES.find((s) => s.type === selected)!;
    if (selected !== "custom") {
      setWidth(size.width);
      setHeight(size.height);
    }
    setTitle("");
  }, [open, selected]);

  const size = DOC_SIZES.find((s) => s.type === selected)!;
  const create = () =>
    onCreate({
      docType: selected,
      width: selected === "custom" ? Math.max(100, Math.min(6000, width)) : size.width,
      height: selected === "custom" ? Math.max(100, Math.min(6000, height)) : size.height,
      title: title.trim(),
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start a new design"
      subtitle="Pick a format. Every canvas is fully editable and exportable."
      width={760}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-[10px] text-[var(--muted-2)]">
            No account required · autosaves in this browser
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-accent btn-sm" onClick={create}>
              Create design <ArrowRight size={13} />
            </button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {DOC_SIZES.map((s) => {
          const ratio = s.width / s.height;
          const maxW = 58;
          const maxH = 58;
          const w = ratio > 1 ? maxW : Math.round(maxH * ratio);
          const h = ratio > 1 ? Math.round(maxW / ratio) : maxH;
          return (
            <button
              key={s.type}
              type="button"
              onClick={() => setSelected(s.type)}
              className={`rounded-xl border p-3 text-left transition-all ${
                selected === s.type
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_3px_rgba(255,90,54,.1)]"
                  : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--panel)]"
              }`}
            >
              <span className="h-[64px] rounded-lg bg-[var(--panel-2)] flex items-center justify-center mb-2">
                <span
                  className="bg-white border border-black/10 shadow-sm"
                  style={{ width: Math.max(14, w * 0.75), height: Math.max(14, h * 0.75) }}
                />
              </span>
              <span className="block text-[11.5px] font-semibold">{s.label}</span>
              <span className="block text-[9px] text-[var(--muted)] mt-0.5">
                {s.type === "custom" ? "Your dimensions" : `${s.width} × ${s.height}`}
              </span>
            </button>
          );
        })}
      </div>

      {selected === "custom" ? (
        <div className="mt-4 rounded-xl border border-[var(--line)] p-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Width (px)</label>
              <input
                className="input"
                type="number"
                min={100}
                max={6000}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Height (px)</label>
              <input
                className="input"
                type="number"
                min={100}
                max={6000}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <label className="label">Design name (optional)</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={size.defaultTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
        />
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--panel)] border border-[var(--line)] px-3 py-2.5 text-[10.5px] text-[var(--muted)]">
        <Sparkles size={13} className="text-[var(--accent)] shrink-0" />
        Prefer a head start? Close this and pick any template — every layer stays editable.
      </div>
    </Modal>
  );
}
