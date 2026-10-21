"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Group,
  Italic,
  LockKeyhole,
  Pencil,
  Play,
  Square,
  Trash2,
  Type as TypeIcon,
  Underline,
  Ungroup,
  Unlock,
  X,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { FONTS, GRADIENTS, PALETTE, STICKERS } from "@/lib/editor/defaults";
import { ANIMATION_LOOPS, ANIMATION_PRESETS } from "@/lib/editor/defaults";
import { pageDuration } from "@/lib/editor/animation";
import type {
  AnimationLoop,
  AnimationPreset,
  Background,
  DesignElement,
  Easing,
  ElementShadow,
  PatternVariant,
  ShapeKind,
} from "@/lib/editor/types";
import {
  ColorField,
  ColorSwatchesInline,
  Field,
  NumberField,
  Section,
  Segmented,
  SelectField,
  SliderField,
  Toggle,
} from "./controls";
import { processImageUpload } from "@/lib/uploads";

const FONT_OPTIONS = FONTS.map((f) => ({ value: f.value, label: f.label }));
const WEIGHTS = [300, 400, 500, 600, 700, 800, 900].map((w) => ({
  value: String(w),
  label: String(w),
}));

const SHAPE_OPTIONS: { value: ShapeKind; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "roundRect", label: "Rounded rectangle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "triangle", label: "Triangle" },
  { value: "star", label: "Star" },
  { value: "diamond", label: "Diamond" },
  { value: "line", label: "Line" },
  { value: "arrow", label: "Arrow" },
  { value: "heart", label: "Heart" },
  { value: "burst", label: "Burst" },
  { value: "blob", label: "Blob" },
];

const PATTERN_OPTIONS: { value: PatternVariant; label: string }[] = [
  { value: "dots", label: "Dots" },
  { value: "grid", label: "Grid" },
  { value: "lines", label: "Diagonal lines" },
  { value: "waves", label: "Waves" },
  { value: "confetti", label: "Confetti" },
  { value: "checker", label: "Checker" },
  { value: "arches", label: "Arches" },
];

const defaultShadow = (): ElementShadow => ({
  enabled: true,
  color: "#17161A",
  blur: 18,
  offsetX: 0,
  offsetY: 8,
  opacity: 0.28,
});

const common = <T,>(values: T[]): T | undefined =>
  values.length && values.every((v) => v === values[0]) ? values[0] : undefined;

function useSelectedElements(): DesignElement[] {
  const doc = useEditor((s) => s.doc);
  const ids = useEditor((s) => s.selection);
  return useMemo(
    () =>
      doc
        ? ids
            .map((id) => doc.elements.find((el) => el.id === id))
            .filter((el): el is DesignElement => !!el)
        : [],
    [doc, ids],
  );
}

function InspectorHead({ title }: { title: string }) {
  const setShowRight = useEditor((s) => s.setShowRight);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      <button
        type="button"
        className="modal-close"
        style={{ width: 26, height: 26 }}
        onClick={() => {
          setShowRight(false);
          setMobilePanel("none");
        }}
        aria-label="Close inspector"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function AnimateSection() {
  const selected = useSelectedElements();
  const updateSelected = useEditor((s) => s.updateSelected);
  const playPreview = useEditor((s) => s.playPreview);
  const stopPreview = useEditor((s) => s.stopPreview);
  const previewPlaying = useEditor((s) => s.previewPlaying);
  if (!selected.length) return null;

  const animations = selected.map((el) => el.animation);
  const preset = common(animations.map((a) => a.preset));
  const duration = common(animations.map((a) => a.duration));
  const delay = common(animations.map((a) => a.delay));
  const loop = common(animations.map((a) => a.loop));
  const easing = common(animations.map((a) => a.easing));

  const patch = (partial: Partial<DesignElement["animation"]>) => {
    const current = selected[0].animation;
    updateSelected({
      animation: {
        ...current,
        ...partial,
        ...(partial.preset ? {} : {}),
      },
    } as Partial<DesignElement>);
  };

  return (
    <Section
      title="Animation"
      action={
        <button
          type="button"
          className="flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)]"
          onClick={() => (previewPlaying ? stopPreview() : playPreview())}
        >
          {previewPlaying ? <Square size={10} /> : <Play size={10} />}
          {previewPlaying ? "Stop" : "Preview"}
        </button>
      }
    >
      <SelectField
        label="Entrance"
        value={preset ?? "none"}
        options={ANIMATION_PRESETS}
        onChange={(v) => patch({ preset: v as AnimationPreset })}
      />
      <div className="grid-2">
        <NumberField
          label="Duration"
          suffix="Dur"
          unit="s"
          value={duration}
          min={0.1}
          max={5}
          step={0.1}
          onChange={(v) => patch({ duration: v })}
        />
        <NumberField
          label="Delay"
          suffix="Del"
          unit="s"
          value={delay}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => patch({ delay: v })}
        />
      </div>
      <SelectField
        label="Loop"
        value={loop ?? "none"}
        options={ANIMATION_LOOPS}
        onChange={(v) => patch({ loop: v as AnimationLoop })}
      />
      <SelectField
        label="Easing"
        value={easing ?? "ease-out"}
        options={[
          { value: "ease-out", label: "Ease out" },
          { value: "ease-in-out", label: "Ease in out" },
          { value: "spring", label: "Spring" },
          { value: "linear", label: "Linear" },
        ]}
        onChange={(v) => patch({ easing: v as Easing })}
      />
      <p className="text-[10px] leading-relaxed text-[var(--muted-2)]">
        Entrance animations play in Present mode, GIF and video exports. Loops keep moving.
      </p>
    </Section>
  );
}

function ShadowSection() {
  const selected = useSelectedElements();
  const updateSelected = useEditor((s) => s.updateSelected);
  if (!selected.length) return null;
  const shadow = selected[0].shadow;
  const enabled = !!shadow?.enabled;
  const set = (patch: Partial<ElementShadow>) =>
    updateSelected({ shadow: { ...(shadow ?? defaultShadow()), ...patch } } as Partial<DesignElement>);
  return (
    <Section title="Shadow">
      <Toggle
        label="Drop shadow"
        checked={enabled}
        onChange={(next) =>
          set(next ? { enabled: true } : { enabled: false })
        }
      />
      {enabled ? (
        <div className="mt-1">
          <ColorField label="Color" value={shadow?.color ?? "#17161A"} onChange={(color) => set({ color })} />
          <div className="grid-2">
            <NumberField label="Blur" value={shadow?.blur ?? 18} min={0} max={80} onChange={(v) => set({ blur: v })} />
            <NumberField
              label="Opacity"
              value={Math.round((shadow?.opacity ?? 0.28) * 100)}
              min={0}
              max={100}
              onChange={(v) => set({ opacity: v / 100 })}
            />
          </div>
          <div className="grid-2 mt-2">
            <NumberField label="X" value={shadow?.offsetX ?? 0} min={-80} max={80} onChange={(v) => set({ offsetX: v })} />
            <NumberField label="Y" value={shadow?.offsetY ?? 8} min={-80} max={80} onChange={(v) => set({ offsetY: v })} />
          </div>
        </div>
      ) : null}
    </Section>
  );
}

function TextInspector({ text, multi }: { text: Extract<DesignElement, { type: "text" }>; multi: boolean }) {
  const updateSelected = useEditor((s) => s.updateSelected);
  const selected = useSelectedElements();
  const texts = selected.filter((e) => e.type === "text") as Extract<DesignElement, { type: "text" }>[];
  const patch = (p: Partial<DesignElement>) => updateSelected(p);
  const bg = text.backgroundColor;
  return (
    <>
      <Section title="Content">
        <div className="field">
          <label className="label" htmlFor={`text-content-${text.id}`}>Text</label>
          <textarea
            id={`text-content-${text.id}`}
            className="textarea"
            style={{ minHeight: 76, fontSize: 12.5 }}
            value={text.text}
            onChange={(e) => {
              const value = e.target.value;
              const explicitLines = value.split("\n").length;
              const minHeight = Math.ceil(explicitLines * text.fontSize * text.lineHeight);
              patch({
                text: value,
                ...(text.height < minHeight ? { height: minHeight } : {}),
              } as Partial<DesignElement>);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Type your text…"
          />
          <p className="text-[10px] leading-relaxed text-[var(--muted-2)] mt-1.5">
            Use the canvas or this field to edit the actual copy. Double-click on the canvas also works.
          </p>
        </div>
      </Section>
      <Section title="Typography">
        <SelectField
          label="Typeface"
          value={text.fontFamily}
          options={FONT_OPTIONS as { value: string; label: string }[]}
          onChange={(fontFamily) => patch({ fontFamily } as Partial<DesignElement>)}
        />
        <div className="grid-2">
          <NumberField
            label="Size"
            value={common(texts.map((t) => t.fontSize))}
            min={6}
            max={600}
            onChange={(fontSize) => patch({ fontSize } as Partial<DesignElement>)}
          />
          <SelectField
            label="Weight"
            value={String(common(texts.map((t) => t.fontWeight)) ?? 700)}
            options={WEIGHTS as { value: string; label: string }[]}
            onChange={(v) => patch({ fontWeight: Number(v) } as Partial<DesignElement>)}
          />
        </div>
        <Segmented
          label="Alignment"
          value={text.align}
          options={[
            { value: "left", label: <AlignLeft size={13} />, title: "Left" },
            { value: "center", label: <AlignCenterHorizontal size={13} />, title: "Center" },
            { value: "right", label: <AlignRight size={13} />, title: "Right" },
            { value: "justify", label: <AlignStartHorizontal size={13} />, title: "Justify" },
          ]}
          onChange={(align) => patch({ align } as Partial<DesignElement>)}
        />
        <Segmented
          label="Vertical"
          value={text.verticalAlign}
          options={[
            { value: "top", label: "Top" },
            { value: "middle", label: "Middle" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(verticalAlign) => patch({ verticalAlign } as Partial<DesignElement>)}
        />
        <div className="grid-2">
          <NumberField
            label="Line"
            value={common(texts.map((t) => t.lineHeight)) ?? 1.1}
            min={0.6}
            max={3}
            step={0.05}
            onChange={(lineHeight) => patch({ lineHeight } as Partial<DesignElement>)}
          />
          <NumberField
            label="Spacing"
            value={common(texts.map((t) => t.letterSpacing)) ?? 0}
            min={-20}
            max={80}
            step={0.5}
            onChange={(letterSpacing) => patch({ letterSpacing } as Partial<DesignElement>)}
          />
        </div>
        <div className="flex gap-1.5 mt-1">
          {[
            { key: "italic", active: text.italic, icon: <Italic size={14} />, label: "Italic" },
            { key: "underline", active: text.underline, icon: <Underline size={14} />, label: "Underline" },
            { key: "uppercase", active: text.uppercase, icon: <span className="text-[11px] font-bold">AA</span>, label: "Uppercase" },
            { key: "bold", active: text.fontWeight >= 600, icon: <Bold size={14} />, label: "Bold" },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              title={btn.label}
              className={`tool-btn flex-1 ${btn.active ? "is-active" : ""}`}
              onClick={() => {
                if (btn.key === "bold") patch({ fontWeight: text.fontWeight >= 600 ? 400 : 700 } as Partial<DesignElement>);
                else patch({ [btn.key]: !btn.active } as Partial<DesignElement>);
              }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Text color">
        <ColorField
          label="Color"
          value={text.color}
          onChange={(color) => patch({ color } as Partial<DesignElement>)}
        />
        <Toggle
          label="Highlight background"
          checked={!!bg}
          onChange={(next) =>
            patch({ backgroundColor: next ? "#FFE066" : undefined } as Partial<DesignElement>)
          }
        />
        {bg ? (
          <ColorField
            label="Highlight"
            value={bg}
            onChange={(backgroundColor) => patch({ backgroundColor } as Partial<DesignElement>)}
          />
        ) : null}
        {multi ? <p className="text-[10px] text-[var(--muted-2)] mt-1">Applies to selected text layers.</p> : null}
      </Section>
    </>
  );
}

function ShapeInspector({ shape }: { shape: Extract<DesignElement, { type: "shape" }> }) {
  const updateSelected = useEditor((s) => s.updateSelected);
  const patch = (p: Partial<DesignElement>) => updateSelected(p);
  return (
    <Section title="Shape">
      <SelectField
        label="Shape"
        value={shape.shape}
        options={SHAPE_OPTIONS}
        onChange={(next) => patch({ shape: next } as Partial<DesignElement>)}
      />
      <Toggle
        label="Gradient fill"
        checked={!!shape.gradient}
        onChange={(on) =>
          patch({
            gradient: on
              ? { from: shape.fill, to: "#FFE066", angle: 135 }
              : undefined,
          } as Partial<DesignElement>)
        }
      />
      {shape.gradient ? (
        <>
          <ColorField
            label="From"
            value={shape.gradient.from}
            onChange={(from) =>
              patch({ gradient: { ...shape.gradient!, from } } as Partial<DesignElement>)
            }
          />
          <ColorField
            label="To"
            value={shape.gradient.to}
            onChange={(to) =>
              patch({ gradient: { ...shape.gradient!, to } } as Partial<DesignElement>)
            }
          />
          <SliderField
            label="Angle"
            value={shape.gradient.angle}
            min={0}
            max={360}
            onChange={(angle) =>
              patch({ gradient: { ...shape.gradient!, angle } } as Partial<DesignElement>)
            }
            format={(v) => `${Math.round(v)}°`}
          />
        </>
      ) : (
        <ColorField
          label="Fill"
          value={shape.fill}
          onChange={(fill) => patch({ fill } as Partial<DesignElement>)}
        />
      )}
      <ColorField
        label="Stroke"
        value={shape.stroke}
        allowTransparent
        onChange={(stroke) => patch({ stroke } as Partial<DesignElement>)}
      />
      <div className="grid-2">
        <NumberField
          label="Stroke"
          suffix="w"
          value={shape.strokeWidth}
          min={0}
          max={80}
          onChange={(strokeWidth) => patch({ strokeWidth } as Partial<DesignElement>)}
        />
        {shape.shape === "roundRect" || shape.shape === "rect" ? (
          <NumberField
            label="Radius"
            value={shape.cornerRadius}
            min={0}
            max={400}
            onChange={(cornerRadius) => patch({ cornerRadius } as Partial<DesignElement>)}
          />
        ) : (
          <NumberField
            label="Radius"
            value={shape.cornerRadius}
            min={0}
            max={400}
            onChange={(cornerRadius) => patch({ cornerRadius } as Partial<DesignElement>)}
          />
        )}
      </div>
      <SelectField
        label="Line style"
        value={shape.dash?.join(",") === "2,8" ? "dotted" : shape.dash ? "dashed" : "solid"}
        options={[
          { value: "solid", label: "Solid" },
          { value: "dashed", label: "Dashed" },
          { value: "dotted", label: "Dotted" },
        ]}
        onChange={(v) =>
          patch({
            dash: v === "solid" ? undefined : v === "dashed" ? [18, 12] : [2, 8],
          } as Partial<DesignElement>)
        }
      />
      <div className="flex flex-wrap gap-1.5 mt-2">
        {PALETTE.slice(0, 12).map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${shape.fill.toUpperCase() === c ? "is-active" : ""}`}
            style={{ background: c }}
            onClick={() => patch({ fill: c } as Partial<DesignElement>)}
            title={c}
            aria-label={c}
          />
        ))}
      </div>
    </Section>
  );
}

function IconInspector({ icon }: { icon: Extract<DesignElement, { type: "icon" }> }) {
  const updateSelected = useEditor((s) => s.updateSelected);
  const patch = (p: Partial<DesignElement>) => updateSelected(p);
  return (
    <Section title="Icon">
      <ColorField
        label="Color"
        value={icon.color}
        onChange={(color) => patch({ color } as Partial<DesignElement>)}
      />
      <SliderField
        label="Stroke"
        value={icon.strokeWidth}
        min={0.5}
        max={4}
        step={0.25}
        onChange={(strokeWidth) => patch({ strokeWidth } as Partial<DesignElement>)}
        format={(v) => `${v}px`}
      />
      <p className="text-[10px] text-[var(--muted-2)] leading-relaxed">
        113 editable icon paths from Lucide. Resize with the corner handles.
      </p>
    </Section>
  );
}

function ImageInspector({ image }: { image: Extract<DesignElement, { type: "image" }> }) {
  const updateSelected = useEditor((s) => s.updateSelected);
  const addImage = useEditor((s) => s.addImage);
  const toast = useEditor((s) => s.toast);
  const inputRef = useRef<HTMLInputElement>(null);
  const patch = (p: Partial<DesignElement>) => updateSelected(p);

  const replace = async (file?: File) => {
    if (!file) return;
    try {
      const processed = await processImageUpload(file, 2000);
      const id = await addImage(processed.dataUrl, processed.name);
      if (id) toast("Photo added as a new layer — replace the old one from the layers panel", "info");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    }
  };

  return (
    <Section title="Image">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void replace(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button type="button" className="btn btn-outline btn-sm w-full mb-3" onClick={() => inputRef.current?.click()}>
        Add replacement photo
      </button>
      <Segmented
        label="Fit"
        value={image.fit}
        options={[
          { value: "cover", label: "Fill frame" },
          { value: "contain", label: "Fit inside" },
        ]}
        onChange={(fit) => patch({ fit } as Partial<DesignElement>)}
      />
      <NumberField
        label="Radius"
        value={image.cornerRadius}
        min={0}
        max={500}
        onChange={(cornerRadius) => patch({ cornerRadius } as Partial<DesignElement>)}
      />
      <Toggle
        label="Color overlay"
        checked={!!image.overlay}
        onChange={(on) =>
          patch({
            overlay: on ? "#17161A" : undefined,
            overlayOpacity: on ? 0.35 : undefined,
          } as Partial<DesignElement>)
        }
      />
      {image.overlay ? (
        <>
          <ColorField
            label="Overlay"
            value={image.overlay}
            onChange={(overlay) => patch({ overlay } as Partial<DesignElement>)}
          />
          <SliderField
            label="Overlay opacity"
            value={image.overlayOpacity ?? 0.35}
            min={0}
            max={1}
            step={0.01}
            onChange={(overlayOpacity) => patch({ overlayOpacity } as Partial<DesignElement>)}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </>
      ) : null}
      <p className="text-[10px] text-[var(--muted-2)] leading-relaxed mt-1">
        Double-click a photo to replace it. Uploads are stored locally.
      </p>
    </Section>
  );
}

function StickerInspector({ sticker }: { sticker: Extract<DesignElement, { type: "sticker" }> }) {
  const updateSelected = useEditor((s) => s.updateSelected);
  return (
    <Section title="Sticker">
      <div className="grid grid-cols-6 gap-1.5">
        {STICKERS.slice(0, 24).map((s) => (
          <button
            key={s.emoji}
            type="button"
            className={`aspect-square rounded-lg border flex items-center justify-center text-[20px] ${
              sticker.emoji === s.emoji
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--line)] hover:border-[var(--line-strong)]"
            }`}
            onClick={() => updateSelected({ emoji: s.emoji } as Partial<DesignElement>)}
            title={s.label}
          >
            {s.emoji}
          </button>
        ))}
      </div>
    </Section>
  );
}

function ElementInspector() {
  const selected = useSelectedElements();
  const updateSelected = useEditor((s) => s.updateSelected);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const reorderSelected = useEditor((s) => s.reorderSelected);
  const groupSelected = useEditor((s) => s.groupSelected);
  const ungroupSelected = useEditor((s) => s.ungroupSelected);
  const alignSelected = useEditor((s) => s.alignSelected);
  const distributeSelected = useEditor((s) => s.distributeSelected);
  const renameElement = useEditor((s) => s.renameElement);
  const toggleLock = useEditor((s) => s.toggleLock);
  const toggleHidden = useEditor((s) => s.toggleHidden);
  const setEditingText = useEditor((s) => s.setEditingText);

  if (!selected.length) return null;
  const el = selected[0];
  const multi = selected.length > 1;
  const text = el.type === "text" ? el : null;
  const shape = el.type === "shape" ? el : null;
  const icon = el.type === "icon" ? el : null;
  const image = el.type === "image" ? el : null;
  const sticker = el.type === "sticker" ? el : null;
  const patch = (p: Partial<DesignElement>) => updateSelected(p);
  const allSameType = selected.every((s) => s.type === el.type);

  return (
    <>
      <div className="px-4 py-3 border-b border-[var(--line)] flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-md bg-[var(--panel-2)] grid place-items-center text-[var(--muted)] shrink-0">
          {text ? <TypeIcon size={14} /> : null}
          {shape ? <Square size={14} /> : null}
          {icon ? <Square size={14} /> : null}
          {image ? <Square size={14} /> : null}
          {sticker ? <Square size={14} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--muted-2)] pl-1.5 mb-0.5">
            {multi ? "Selection" : "Layer name"}
          </div>
          <input
            className="w-full bg-transparent text-[12px] font-semibold outline-none border border-transparent focus:border-[var(--line-strong)] focus:bg-white rounded px-1.5 py-1"
            value={multi ? `${selected.length} layers selected` : el.name}
            disabled={multi}
            onChange={(e) => renameElement(el.id, e.target.value)}
            onBlur={(e) => {
              if (!multi && !e.target.value.trim()) {
                renameElement(el.id, el.type === "text" ? "Text" : el.type);
              }
            }}
            placeholder="Layer name"
            aria-label="Layer name"
          />
        </div>
        {el.type === "text" && !multi ? (
          <button
            type="button"
            className="layer-action"
            onClick={() => setEditingText(el.id)}
            title="Edit text on canvas"
            aria-label="Edit text on canvas"
          >
            <Pencil size={12} />
          </button>
        ) : null}
        <button type="button" className="layer-action" onClick={() => (multi ? selected.forEach((s) => toggleLock(s.id)) : toggleLock(el.id))} title="Lock">
          {el.locked ? <LockKeyhole size={13} /> : <Unlock size={13} />}
        </button>
      </div>

      <Section title="Transform">
        <div className="grid-2">
          <NumberField
            label="X"
            value={multi ? undefined : Math.round(el.x)}
            onChange={(x) => patch({ x })}
          />
          <NumberField
            label="Y"
            value={multi ? undefined : Math.round(el.y)}
            onChange={(y) => patch({ y })}
          />
          <NumberField
            label="W"
            value={multi ? undefined : Math.round(el.width)}
            min={1}
            onChange={(width) => patch({ width })}
          />
          <NumberField
            label="H"
            value={multi ? undefined : Math.round(el.height)}
            min={1}
            onChange={(height) => patch({ height })}
          />
          <NumberField
            label="R"
            value={multi ? undefined : Math.round(el.rotation)}
            min={-360}
            max={360}
            onChange={(rotation) => patch({ rotation })}
          />
          <NumberField
            label="%"
            value={multi ? undefined : Math.round(el.opacity * 100)}
            min={0}
            max={100}
            onChange={(opacity) => patch({ opacity: opacity / 100 })}
          />
        </div>
      </Section>

      <Section title="Align">
        <div className="grid-3 mb-1.5">
          <button type="button" className="tool-btn" title="Align left" onClick={() => alignSelected("left", multi ? false : true)}><AlignStartVertical size={14} /></button>
          <button type="button" className="tool-btn" title="Align center" onClick={() => alignSelected("center", multi ? false : true)}><AlignCenterVertical size={14} /></button>
          <button type="button" className="tool-btn" title="Align right" onClick={() => alignSelected("right", multi ? false : true)}><AlignEndVertical size={14} /></button>
          <button type="button" className="tool-btn" title="Align top" onClick={() => alignSelected("top", multi ? false : true)}><AlignStartHorizontal size={14} /></button>
          <button type="button" className="tool-btn" title="Align middle" onClick={() => alignSelected("middle", multi ? false : true)}><AlignCenterHorizontal size={14} /></button>
          <button type="button" className="tool-btn" title="Align bottom" onClick={() => alignSelected("bottom", multi ? false : true)}><AlignEndHorizontal size={14} /></button>
        </div>
        <div className="grid-2">
          <button type="button" className="tool-btn" title="Distribute horizontally" disabled={selected.length < 3} onClick={() => distributeSelected("h")}><AlignHorizontalSpaceAround size={14} /></button>
          <button type="button" className="tool-btn" title="Distribute vertically" disabled={selected.length < 3} onClick={() => distributeSelected("v")}><AlignVerticalSpaceAround size={14} /></button>
        </div>
      </Section>

      <Section title="Arrange">
        <div className="grid-4 mb-1.5">
          <button type="button" className="tool-btn" title="Bring to front" onClick={() => reorderSelected("front")}><ArrowUpToLine size={14} /></button>
          <button type="button" className="tool-btn" title="Bring forward" onClick={() => reorderSelected("forward")}><ChevronUp size={14} /></button>
          <button type="button" className="tool-btn" title="Send backward" onClick={() => reorderSelected("backward")}><ChevronDown size={14} /></button>
          <button type="button" className="tool-btn" title="Send to back" onClick={() => reorderSelected("back")}><ArrowDownToLine size={14} /></button>
        </div>
        <div className="grid-2">
          <button type="button" className="tool-btn" disabled={selected.length < 2} onClick={groupSelected}><Group size={14} /> <span className="ml-1.5 text-[10.5px]">Group</span></button>
          <button type="button" className="tool-btn" disabled={!selected.some((e) => e.groupId)} onClick={ungroupSelected}><Ungroup size={14} /> <span className="ml-1.5 text-[10.5px]">Ungroup</span></button>
        </div>
        <div className="grid-3 mt-1.5">
          <button type="button" className="tool-btn" title="Duplicate" onClick={duplicateSelected}><Copy size={14} /></button>
          <button type="button" className="tool-btn" title={el.hidden ? "Show" : "Hide"} onClick={() => toggleHidden(el.id)}>{el.hidden ? "Show" : "Hide"}</button>
          <button type="button" className="tool-btn danger" title="Delete" onClick={deleteSelected}><Trash2 size={14} /></button>
        </div>
      </Section>

      {text && allSameType ? <TextInspector text={text} multi={multi} /> : null}
      {shape && allSameType ? <ShapeInspector shape={shape} /> : null}
      {icon && allSameType ? <IconInspector icon={icon} /> : null}
      {image && allSameType ? <ImageInspector image={image} /> : null}
      {sticker && allSameType ? <StickerInspector sticker={sticker} /> : null}

      <ShadowSection />
      <AnimateSection />
    </>
  );
}

function PageInspector() {
  const doc = useEditor((s) => s.doc);
  const page = useEditor((s) => s.doc?.pages.find((p) => p.id === s.activePageId));
  const session = useEditor((s) => s.session);
  const updatePage = useEditor((s) => s.updatePage);
  const duplicatePage = useEditor((s) => s.duplicatePage);
  const deletePage = useEditor((s) => s.deletePage);
  const movePage = useEditor((s) => s.movePage);
  const openPresentation = useEditor((s) => s.openPresentation);
  const toast = useEditor((s) => s.toast);
  const setPageBackground = useEditor((s) => s.setPageBackground);
  const [scaleContent, setScaleContent] = useState(true);
  const [width, setWidth] = useState(doc?.width ?? 1080);
  const [height, setHeight] = useState(doc?.height ?? 1080);
  const imageInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (doc) {
      setWidth(doc.width);
      setHeight(doc.height);
    }
  }, [doc?.width, doc?.height]);

  const pageElements = useMemo(
    () => (doc && page ? doc.elements.filter((e) => e.pageId === page.id) : []),
    [doc, page],
  );

  if (!doc || !page) return null;
  const bg = page.background;
  const pageIndex = doc.pages.findIndex((p) => p.id === page.id);

  const setType = (type: Background["type"]) => {
    if (type === bg.type) return;
    if (type === "solid") setPageBackground({ type: "solid", color: "#F6EFE4" });
    if (type === "gradient") setPageBackground({ type: "gradient", from: "#FF5A36", to: "#FFE066", angle: 135 });
    if (type === "pattern") setPageBackground({ type: "pattern", variant: "dots", bg: "#F6EFE4", color: "#17161A" });
    if (type === "image") imageInput.current?.click();
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[.09em] text-[var(--muted)]">Page</div>
          <input
            className="mt-1 w-full bg-transparent text-[13px] font-semibold outline-none border border-transparent focus:border-[var(--line-strong)] focus:bg-white rounded px-1.5 py-0.5"
            value={page.name}
            onChange={(e) => updatePage(page.id, { name: e.target.value })}
            aria-label="Page name"
          />
        </div>
        <button type="button" className="btn btn-dark btn-xs shrink-0" onClick={() => openPresentation()}>
          <Play size={11} /> Present
        </button>
      </div>

      <Section title="Background">
        <Segmented
          value={bg.type}
          options={[
            { value: "solid", label: "Solid" },
            { value: "gradient", label: "Gradient" },
            { value: "pattern", label: "Pattern" },
            { value: "image", label: "Image" },
          ]}
          onChange={(t) => setType(t as Background["type"])}
        />
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const processed = await processImageUpload(file, 2200);
              setPageBackground({ type: "image", src: processed.dataUrl, overlay: "#17161A", overlayOpacity: 0.2 });
            } catch (err) {
              toast(err instanceof Error ? err.message : "Upload failed", "error");
            }
          }}
        />
        {bg.type === "solid" ? (
          <div className="mt-2">
            <ColorField label="Color" value={bg.color} onChange={(color) => setPageBackground({ type: "solid", color })} />
            <div className="flex flex-wrap gap-1.5">
              {PALETTE.slice(0, 18).map((color) => (
                <button key={color} type="button" className={`swatch ${bg.color.toUpperCase() === color ? "is-active" : ""}`} style={{ background: color }} onClick={() => setPageBackground({ type: "solid", color })} title={color} aria-label={color} />
              ))}
            </div>
          </div>
        ) : null}
        {bg.type === "gradient" ? (
          <div className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div style={{ height: 44, borderRadius: 8, background: `linear-gradient(${bg.angle}deg,${bg.from},${bg.to})` }} />
              <div className="grid grid-cols-2 gap-1.5">
                {GRADIENTS.map((g, i) => (
                  <button key={i} type="button" className="rounded-md border border-black/10" style={{ background: `linear-gradient(${g.angle}deg,${g.from},${g.to})` }} onClick={() => setPageBackground({ type: "gradient", ...g })} title={`Gradient ${i + 1}`} />
                ))}
              </div>
            </div>
            <div className="mt-2">
              <ColorField label="From" value={bg.from} onChange={(from) => setPageBackground({ ...bg, from })} />
              <ColorField label="To" value={bg.to} onChange={(to) => setPageBackground({ ...bg, to })} />
              <SliderField label="Angle" value={bg.angle} min={0} max={360} onChange={(angle) => setPageBackground({ ...bg, angle })} format={(v) => `${Math.round(v)}°`} />
            </div>
          </div>
        ) : null}
        {bg.type === "pattern" ? (
          <div className="mt-2">
            <SelectField
              label="Pattern"
              value={bg.variant}
              options={PATTERN_OPTIONS}
              onChange={(variant) => setPageBackground({ ...bg, variant })}
            />
            <ColorField label="Background" value={bg.bg} onChange={(bgColor) => setPageBackground({ ...bg, bg: bgColor })} />
            <ColorField label="Ink" value={bg.color} onChange={(color) => setPageBackground({ ...bg, color })} />
          </div>
        ) : null}
        {bg.type === "image" ? (
          <div className="mt-2">
            <div className="rounded-lg overflow-hidden border border-[var(--line)] mb-2">
              <img src={bg.src} alt="Page background" className="w-full h-20 object-cover" />
            </div>
            <button type="button" className="btn btn-outline btn-sm w-full mb-2" onClick={() => imageInput.current?.click()}>
              Replace image
            </button>
            <ColorField label="Overlay" value={bg.overlay ?? "#17161A"} onChange={(overlay) => setPageBackground({ ...bg, overlay })} />
            <SliderField label="Overlay opacity" value={bg.overlayOpacity ?? 0.2} min={0} max={1} step={0.01} onChange={(overlayOpacity) => setPageBackground({ ...bg, overlayOpacity })} format={(v) => `${Math.round(v * 100)}%`} />
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-outline btn-sm w-full mt-2"
          onClick={() => {
            doc.pages.forEach((p) => session?.updatePage(p.id, { background: bg }));
            toast("Background applied to all pages", "success");
          }}
        >
          Apply background to all pages
        </button>
      </Section>

      <Section title="Page motion">
        <SelectField
          label="Transition"
          value={page.transition}
          options={[
            { value: "fade", label: "Fade" },
            { value: "slide", label: "Slide" },
            { value: "zoom", label: "Zoom" },
            { value: "none", label: "None" },
          ]}
          onChange={(transition) => updatePage(page.id, { transition })}
        />
        <NumberField
          label="Auto-advance"
          suffix="Auto"
          unit="s"
          value={page.duration}
          min={1}
          max={30}
          onChange={(duration) => updatePage(page.id, { duration })}
        />
        <p className="text-[10px] text-[var(--muted-2)] leading-relaxed">
          {pageElements.length} layers · {pageDuration(page.duration, pageElements).toFixed(1)}s animation.
          Used by Present, GIF and video.
        </p>
      </Section>

      <Section title="Canvas">
        <div className="grid-2">
          <NumberField label="W" value={width} min={100} max={6000} onChange={setWidth} />
          <NumberField label="H" value={height} min={100} max={6000} onChange={setHeight} />
        </div>
        <Toggle label="Scale content" checked={scaleContent} onChange={setScaleContent} />
        <button
          type="button"
          className="btn btn-outline btn-sm w-full mt-2"
          onClick={() => {
            session?.setCanvasSize(Math.round(width), Math.round(height), scaleContent);
            toast("Canvas resized", "success");
          }}
        >
          Resize canvas
        </button>
        <p className="text-[10px] text-[var(--muted-2)] mt-1.5">
          Current: {doc.width} × {doc.height}px
        </p>
      </Section>

      <Section title="Pages">
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className="tool-btn" disabled={pageIndex <= 0} onClick={() => movePage(page.id, -1)}><ChevronLeft size={13} /> <span className="ml-1 text-[10.5px]">Move left</span></button>
          <button type="button" className="tool-btn" disabled={pageIndex >= doc.pages.length - 1} onClick={() => movePage(page.id, 1)}><ChevronRight size={13} /> <span className="ml-1 text-[10.5px]">Move right</span></button>
          <button type="button" className="tool-btn" onClick={() => duplicatePage(page.id)}><Copy size={13} /> <span className="ml-1 text-[10.5px]">Duplicate</span></button>
          <button type="button" className="tool-btn danger" disabled={doc.pages.length <= 1} onClick={() => deletePage(page.id)}><Trash2 size={13} /> <span className="ml-1 text-[10.5px]">Delete</span></button>
        </div>
        <p className="text-[10px] text-[var(--muted-2)] mt-2">
          Page {pageIndex + 1} of {doc.pages.length}
        </p>
      </Section>
    </>
  );
}

export default function Inspector() {
  const hasSelection = useEditor((s) => s.selection.length > 0);
  const showRight = useEditor((s) => s.showRight);
  const mobilePanel = useEditor((s) => s.mobilePanel);
  if (!showRight) return null;
  return (
    <aside className={`inspector ${mobilePanel === "right" ? "is-open" : ""}`}>
      <InspectorHead title={hasSelection ? "Design" : "Page"} />
      <div className="inspector-scroll">
        {hasSelection ? <ElementInspector /> : <PageInspector />}
      </div>
    </aside>
  );
}
