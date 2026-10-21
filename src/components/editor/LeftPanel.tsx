"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Layers as LayersIcon,
  LayoutTemplate,
  LockKeyhole,
  PaintBucket,
  Plus,
  Search,
  Shapes,
  Smile,
  Sparkles,
  Trash2,
  Type,
  Unlock,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { useEditor, type LeftTab } from "@/lib/editor/store";
import {
  BACKGROUND_PRESETS,
  createText,
  fontStack,
  GRADIENTS,
  PALETTE,
  PHOTOS,
  photoUrl,
  STICKERS,
} from "@/lib/editor/defaults";
import { ICONS, ICON_CATEGORIES } from "@/lib/editor/icons";
import { buildTemplate, TEMPLATES, type TemplateDefinition } from "@/lib/editor/templates";
import type { Background, DesignElement, PatternVariant, ShapeKind } from "@/lib/editor/types";
import { listAssets, saveAsset } from "@/lib/storage/db";
import { processImageUpload, humanSize } from "@/lib/uploads";
import StaticPreview from "@/components/canvas/StaticPreview";
import { uid } from "@/lib/editor/defaults";
import type { AssetRecord } from "@/lib/editor/types";

const RAIL: { id: LeftTab; label: string; icon: React.ReactNode }[] = [
  { id: "templates", label: "Templates", icon: <LayoutTemplate size={19} strokeWidth={1.7} /> },
  { id: "text", label: "Text", icon: <Type size={19} strokeWidth={1.7} /> },
  { id: "elements", label: "Elements", icon: <Shapes size={19} strokeWidth={1.7} /> },
  { id: "photos", label: "Photos", icon: <ImageIcon size={19} strokeWidth={1.7} /> },
  { id: "uploads", label: "Uploads", icon: <UploadCloud size={19} strokeWidth={1.7} /> },
  { id: "backgrounds", label: "Background", icon: <PaintBucket size={19} strokeWidth={1.7} /> },
  { id: "layers", label: "Layers", icon: <LayersIcon size={19} strokeWidth={1.7} /> },
];

export function LeftRail() {
  const leftTab = useEditor((s) => s.leftTab);
  const showLeft = useEditor((s) => s.showLeft);
  const setLeftTab = useEditor((s) => s.setLeftTab);
  const setShowLeft = useEditor((s) => s.setShowLeft);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);
  const toggleComments = useEditor((s) => s.setCommentsOpen);
  return (
    <nav className="left-rail" aria-label="Design tools">
      {RAIL.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rail-item ${leftTab === item.id && showLeft ? "is-active" : ""}`}
          onClick={() => {
            if (leftTab === item.id && showLeft) {
              setShowLeft(false);
              setMobilePanel("none");
            } else {
              setLeftTab(item.id);
              toggleComments(false);
            }
          }}
          title={item.label}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

const PanelHead = ({ title, children }: { title: string; children?: React.ReactNode }) => {
  const setShowLeft = useEditor((s) => s.setShowLeft);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      <div className="flex items-center gap-1">
        {children}
        <button
          type="button"
          className="modal-close"
          style={{ width: 26, height: 26 }}
          onClick={() => {
            setShowLeft(false);
            setMobilePanel("none");
          }}
          aria-label="Close panel"
        >
          <ChevronLeft size={15} />
        </button>
      </div>
    </div>
  );
};

function TemplateCard({
  template,
  onPick,
}: {
  template: TemplateDefinition;
  onPick: (t: TemplateDefinition) => void;
}) {
  const content = useMemo(() => buildTemplate(template), [template]);
  const aspect = content.width / content.height;
  const maxW = 240;
  const maxH = 132;
  const width = Math.round(Math.min(maxW, maxH * aspect));
  const page = content.pages[0];
  return (
    <button type="button" className="text-left group" onClick={() => onPick(template)}>
      <div
        className="flex items-center justify-center rounded-[9px] border border-[var(--line)] bg-[#efeae1] overflow-hidden transition-all group-hover:border-[var(--line-strong)] group-hover:shadow-md"
        style={{ height: 144 }}
      >
        {page ? (
          <div style={{ width, maxHeight: 128, overflow: "hidden", boxShadow: "0 6px 18px rgba(23,22,26,.16)" }}>
            <StaticPreview
              width={width}
              docWidth={content.width}
              docHeight={content.height}
              page={page}
              elements={content.elements}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-semibold truncate">{template.name}</span>
        <span className="text-[9px] text-[var(--muted-2)] shrink-0">{template.category}</span>
      </div>
    </button>
  );
}

function IconGlyph({ svg, size = 20 }: { svg: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const SHAPES: { kind: ShapeKind; label: string; node: React.ReactNode }[] = [
  { kind: "rect", label: "Square", node: <rect x="4" y="4" width="16" height="16" rx="1" /> },
  { kind: "roundRect", label: "Rounded", node: <rect x="4" y="4" width="16" height="16" rx="4" /> },
  { kind: "ellipse", label: "Circle", node: <circle cx="12" cy="12" r="8" /> },
  { kind: "triangle", label: "Triangle", node: <path d="M12 4 21 20H3z" /> },
  { kind: "star", label: "Star", node: <path d="m12 3 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.2l5.9-.8z" /> },
  { kind: "diamond", label: "Diamond", node: <path d="m12 3 9 9-9 9-9-9z" /> },
  { kind: "line", label: "Line", node: <path d="M3 12h18" strokeWidth="2.4" /> },
  { kind: "arrow", label: "Arrow", node: <path d="M3 12h16m-5-6 6 6-6 6" strokeWidth="2" /> },
  { kind: "heart", label: "Heart", node: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /> },
  { kind: "burst", label: "Burst", node: <path d="m12 2 2 5 4-2.5.5 4.5 4.5.5-2.5 4 3 3.5-4.5 1.5-.5 4.5-4-2.5-2 5-2-5-4 2.5-.5-4.5L4 18l3-3.5-2.5-4L9 10l.5-4.5 4 2.5z" /> },
  { kind: "blob", label: "Blob", node: <path d="M12 3c4 0 9 3 9 9s-4 9-9 9-9-3-9-9 5-9 9-9z" /> },
];

const TEXT_PRESETS = [
  { label: "Display", sample: "Make it bold", font: "Space Grotesk", size: 0.11, weight: 700, lineHeight: 1.02 },
  { label: "Heading", sample: "A clear heading", font: "Inter", size: 0.075, weight: 700, lineHeight: 1.12 },
  { label: "Subheading", sample: "Supporting thought", font: "Inter", size: 0.05, weight: 600, lineHeight: 1.25 },
  { label: "Body", sample: "A quiet paragraph for the details that matter.", font: "Inter", size: 0.032, weight: 400, lineHeight: 1.5 },
  { label: "Caption", sample: "EYEBROW / CAPTION", font: "Inter", size: 0.022, weight: 600, lineHeight: 1.3, letterSpacing: 0.0015 },
  { label: "Editorial", sample: "Once, slowly", font: "Instrument Serif", size: 0.09, weight: 400, lineHeight: 1.1, italic: true },
  { label: "Script", sample: "Made by hand", font: "Caveat", size: 0.1, weight: 500, lineHeight: 1.1 },
  { label: "Condensed", sample: "BIG NEWS", font: "Bebas Neue", size: 0.14, weight: 400, lineHeight: 0.95 },
];

function TemplatesTab() {
  const session = useEditor((s) => s.session);
  const setActivePage = useEditor((s) => s.setActivePage);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);
  const toast = useEditor((s) => s.toast);
  const docType = useEditor((s) => s.doc?.docType);
  const [filter, setFilter] = useState("For this size");
  const categories = ["For this size", "All", ...Array.from(new Set(TEMPLATES.map((t) => t.category)))];
  const list = TEMPLATES.filter((t) => {
    if (filter === "For this size") return t.docType === docType;
    if (filter === "All") return true;
    return t.category === filter;
  });
  return (
    <>
      <PanelHead title="Templates" />
      <div className="flex gap-1.5 flex-wrap px-4 py-3 border-b border-[var(--line)]">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`h-6 rounded-full px-2.5 text-[10px] font-semibold transition-colors ${
              filter === c
                ? "bg-[var(--ink)] text-white"
                : "bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="panel-scroll">
        {list.length ? (
          <div className="grid grid-cols-1 gap-4">
            {list.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onPick={(template) => {
                  session?.applyTemplate(template);
                  const built = buildTemplate(template);
                  if (built.pages[0]) setActivePage(built.pages[0].id);
                  toast(`Applied “${template.name}” — undo anytime`, "success");
                  setMobilePanel("none");
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[var(--muted)] py-6 text-center">
            No templates for this format yet. Try “All”.
          </p>
        )}
      </div>
    </>
  );
}

function TextTab() {
  const doc = useEditor((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const session = useEditor((s) => s.session);
  const setSelection = useEditor((s) => s.setSelection);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);

  const add = (preset: (typeof TEXT_PRESETS)[number]) => {
    if (!doc || !activePageId || !session) return;
    const fontSize = Math.max(14, Math.round(Math.min(doc.width, doc.height) * preset.size));
    const width = doc.width * 0.76;
    const lineHeight = preset.lineHeight ?? 1.2;
    const pageElements = doc.elements.filter((e) => e.pageId === activePageId);
    const order = Math.max(-1, ...pageElements.map((e) => e.order)) + 1;
    // Count wrapped lines with the real font; 0.94 leaves slack for letter-spacing and unloaded fonts.
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) ctx.font = `${preset.italic ? "italic " : ""}${preset.weight} ${fontSize}px ${fontStack(preset.font)}`;
    const fits = (t: string) => !ctx || ctx.measureText(t).width <= width * 0.94;
    let lines = 1;
    let row = "";
    for (const word of preset.sample.split(" ")) {
      const next = row ? `${row} ${word}` : word;
      if (row && !fits(next)) {
        lines++;
        row = word;
      } else row = next;
    }
    const height = Math.ceil(fontSize * lineHeight * lines);
    const bg = doc.pages.find((p) => p.id === activePageId)?.background;
    const hex =
      bg?.type === "solid" ? bg.color : bg?.type === "gradient" ? bg.from : bg?.type === "pattern" ? bg.bg : "";
    const rgb = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)?.[1];
    const full = rgb?.length === 3 ? rgb.replace(/./g, "$&$&") : rgb;
    const lum = full
      ? (0.299 * parseInt(full.slice(0, 2), 16) + 0.587 * parseInt(full.slice(2, 4), 16) + 0.114 * parseInt(full.slice(4, 6), 16)) / 255
      : 1;
    const nudge = (pageElements.length % 3) * 16;
    const el = createText(activePageId, order, {
      x: (doc.width - width) / 2 + nudge,
      y: (doc.height - height) / 2 + nudge,
      width,
      height,
      align: "center",
      text: preset.sample,
      fontFamily: preset.font,
      fontSize,
      fontWeight: preset.weight,
      italic: preset.italic,
      lineHeight: preset.lineHeight,
      letterSpacing: preset.letterSpacing ? Math.round(fontSize * preset.letterSpacing * 10) : 0,
      color: lum < 0.5 ? "#FFFFFF" : "#17161A",
      name: preset.label,
    });
    session.addElement(el);
    setSelection([el.id]);
    setMobilePanel("none");
  };

  return (
    <>
      <PanelHead title="Text" />
      <div className="panel-scroll">
        <p className="text-[11px] text-[var(--muted)] mb-3 leading-relaxed">
          Click a style to add a text layer. Double-click any text on the canvas to edit it.
        </p>
        {TEXT_PRESETS.map((p) => (
          <button key={p.label} type="button" className="text-preset" onClick={() => add(p)}>
            <strong
              style={{
                fontFamily: `"${p.font}", sans-serif`,
                fontSize: Math.max(15, Math.min(30, p.size * 300)),
                fontStyle: p.italic ? "italic" : "normal",
                lineHeight: p.lineHeight,
                letterSpacing: p.letterSpacing ? 2 : 0,
              }}
            >
              {p.sample}
            </strong>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function ElementsTab() {
  const addShape = useEditor((s) => s.addShape);
  const addIcon = useEditor((s) => s.addIcon);
  const addSticker = useEditor((s) => s.addSticker);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [stickerQuery, setStickerQuery] = useState("");

  const icons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ICONS.filter(
      (i) =>
        (cat === "All" || i.category === cat) &&
        (!q || i.name.includes(q) || i.label.toLowerCase().includes(q)),
    );
  }, [query, cat]);

  const stickers = useMemo(() => {
    const q = stickerQuery.trim().toLowerCase();
    return STICKERS.filter((s) => !q || s.label.toLowerCase().includes(q) || s.group.toLowerCase().includes(q));
  }, [stickerQuery]);

  return (
    <>
      <PanelHead title="Elements" />
      <div className="panel-scroll">
        <h3 className="section-label">Shapes</h3>
        <div className="shape-grid">
          {SHAPES.map((s) => (
            <button
              key={s.kind}
              type="button"
              className="shape-tile"
              title={s.label}
              onClick={() => {
                addShape(s.kind);
                setMobilePanel("none");
              }}
            >
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              >
                {s.node}
              </svg>
            </button>
          ))}
        </div>

        <h3 className="section-label mt-5">Icons</h3>
        <div className="search-field mb-2">
          <Search size={13} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons"
            aria-label="Search icons"
          />
        </div>
        <div className="flex gap-1 flex-wrap mb-2.5">
          {["All", ...ICON_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`h-5.5 rounded-full px-2 text-[9.5px] font-semibold ${
                cat === c
                  ? "bg-[var(--ink)] text-white"
                  : "bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              style={{ height: 22 }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="icon-grid">
          {icons.map((icon) => (
            <button
              key={icon.id}
              type="button"
              className="icon-tile"
              title={icon.label}
              onClick={() => {
                addIcon(icon.name);
                setMobilePanel("none");
              }}
            >
              <IconGlyph svg={icon.svg} />
            </button>
          ))}
        </div>
        {!icons.length ? (
          <p className="text-[11px] text-[var(--muted)] py-4 text-center">No icons match “{query}”.</p>
        ) : null}

        <h3 className="section-label mt-5">Stickers</h3>
        <div className="search-field mb-2.5">
          <Search size={13} />
          <input
            value={stickerQuery}
            onChange={(e) => setStickerQuery(e.target.value)}
            placeholder="Search stickers"
            aria-label="Search stickers"
          />
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {stickers.map((s) => (
            <button
              key={s.emoji}
              type="button"
              className="aspect-square rounded-lg border border-[var(--line)] bg-white text-[22px] flex items-center justify-center hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all"
              title={s.label}
              onClick={() => {
                addSticker(s.emoji);
                setMobilePanel("none");
              }}
            >
              {s.emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function PhotosTab() {
  const addImage = useEditor((s) => s.addImage);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);
  const profile = useEditor((s) => s.profile);
  const toast = useEditor((s) => s.toast);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length || !profile) return;
    for (const file of Array.from(files).slice(0, 6)) {
      try {
        const processed = await processImageUpload(file);
        await saveAsset({
          id: uid("asset_"),
          ownerId: profile.id,
          name: processed.name,
          dataUrl: processed.dataUrl,
          createdAt: Date.now(),
        });
        await addImage(processed.dataUrl, processed.name, {
          w: processed.width,
          h: processed.height,
        });
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload failed", "error");
      }
    }
    setMobilePanel("none");
  };

  return (
    <>
      <PanelHead title="Photos" />
      <div className="panel-scroll">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
        <button type="button" className="upload-zone w-full mb-4" onClick={() => inputRef.current?.click()}>
          <UploadCloud size={20} className="mx-auto text-[var(--muted)]" />
          <p>Upload a photo</p>
          <span className="text-[9.5px] text-[var(--muted-2)]">JPG, PNG, WebP — resized for the web</span>
        </button>
        <h3 className="section-label">Photo library</h3>
        <div className="photo-grid">
          {PHOTOS.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className="photo-tile"
              onClick={() => {
                void addImage(photoUrl(photo.id), photo.title, { w: photo.w, h: photo.h });
                setMobilePanel("none");
              }}
              title={photo.title}
            >
              <img src={photoUrl(photo.id)} alt={photo.title} loading="lazy" />
              <span>{photo.title}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[9.5px] leading-relaxed text-[var(--muted-2)]">
          Sample photography from Lorem Picsum / Unsplash. You can use your own uploads anywhere.
        </p>
      </div>
    </>
  );
}

function UploadsTab() {
  const profile = useEditor((s) => s.profile);
  const addImage = useEditor((s) => s.addImage);
  const toast = useEditor((s) => s.toast);
  const setMobilePanel = useEditor((s) => s.setMobilePanel);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    if (!profile) return;
    void listAssets(profile.id).then(setAssets);
  };
  useEffect(refresh, [profile?.id]);

  const upload = async (files: FileList | null) => {
    if (!files?.length || !profile) return;
    setBusy(true);
    for (const file of Array.from(files).slice(0, 12)) {
      try {
        const processed = await processImageUpload(file);
        const asset: AssetRecord = {
          id: uid("asset_"),
          ownerId: profile.id,
          name: processed.name,
          dataUrl: processed.dataUrl,
          createdAt: Date.now(),
        };
        await saveAsset(asset);
        setAssets((prev) => [asset, ...prev]);
        await addImage(processed.dataUrl, processed.name, { w: processed.width, h: processed.height });
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload failed", "error");
      }
    }
    setBusy(false);
    setMobilePanel("none");
  };

  return (
    <>
      <PanelHead title="Uploads" />
      <div className="panel-scroll">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void upload(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          className={`upload-zone ${dragging ? "dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void upload(e.dataTransfer.files);
          }}
        >
          <UploadCloud size={22} className="mx-auto text-[var(--muted)]" />
          <p>{busy ? "Processing…" : "Drop images here or click to upload"}</p>
          <span className="text-[9.5px] text-[var(--muted-2)]">Stored in this browser</span>
        </div>
        <h3 className="section-label mt-5">Your uploads</h3>
        {assets.length ? (
          assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className="asset-row w-full text-left"
              onClick={() => {
                void addImage(asset.dataUrl, asset.name);
                setMobilePanel("none");
              }}
            >
              <img src={asset.dataUrl} alt={asset.name} />
              <div className="min-w-0">
                <strong>{asset.name}</strong>
                <span>{humanSize(asset.dataUrl)}</span>
              </div>
            </button>
          ))
        ) : (
          <p className="text-[11.5px] text-[var(--muted)] py-3">
            No uploads yet. Add a logo, headshot or product photo.
          </p>
        )}
        <p className="mt-4 text-[9.5px] leading-relaxed text-[var(--muted-2)]">
          Uploads stay on this device. Projects with uploads are ideal for live links or the
          downloadable project file rather than snapshot URLs.
        </p>
      </div>
    </>
  );
}

const PATTERNS: { variant: PatternVariant; label: string; css: string }[] = [
  { variant: "dots", label: "Dots", css: "radial-gradient(#17161A22 1.5px, transparent 1.5px) 0 0/9px 9px" },
  { variant: "grid", label: "Grid", css: "linear-gradient(#17161A16 1px, transparent 1px) 0 0/12px 12px, linear-gradient(90deg,#17161A16 1px,transparent 1px) 0 0/12px 12px" },
  { variant: "lines", label: "Lines", css: "repeating-linear-gradient(45deg,#17161A18 0 2px,transparent 2px 9px)" },
  { variant: "waves", label: "Waves", css: "repeating-radial-gradient(circle at 50% 100%,transparent 0 8px,#17161A18 8px 9.5px,transparent 9.5px 16px)" },
  { variant: "confetti", label: "Confetti", css: "radial-gradient(#FF5A3655 2px, transparent 2px) 2px 2px/17px 17px, radial-gradient(#FFE06688 2px, transparent 2px) 8px 8px/17px 17px" },
  { variant: "checker", label: "Checker", css: "conic-gradient(#17161A10 25%,transparent 0 50%,#17161A10 0 75%,transparent 0) 0 0/16px 16px" },
  { variant: "arches", label: "Arches", css: "repeating-radial-gradient(circle at 50% 100%,transparent 0 10px,#17161A25 10px 11px,transparent 11px 20px)" },
];

function BackgroundsTab() {
  const page = useEditor((s) => s.doc?.pages.find((p) => p.id === s.activePageId));
  const setPageBackground = useEditor((s) => s.setPageBackground);
  const toast = useEditor((s) => s.toast);
  const profile = useEditor((s) => s.profile);
  const inputRef = useRef<HTMLInputElement>(null);

  const is = (bg: Background) => JSON.stringify(bg) === JSON.stringify(page?.background);
  const set = (bg: Background) => setPageBackground(bg);

  const uploadBackground = async (file?: File) => {
    if (!file || !profile) return;
    try {
      const processed = await processImageUpload(file, 2200);
      set({
        type: "image",
        src: processed.dataUrl,
        overlay: "#17161A",
        overlayOpacity: 0.2,
      });
      toast("Background image added", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
    }
  };

  return (
    <>
      <PanelHead title="Backgrounds" />
      <div className="panel-scroll">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void uploadBackground(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="upload-zone w-full mb-4"
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon size={19} className="mx-auto text-[var(--muted)]" />
          <p>Use an image as background</p>
        </button>

        <h3 className="section-label">Page colors</h3>
        <div className="bg-grid">
          {PALETTE.concat(["#FFFDF8", "#F2E8D5"]).map((color) => (
            <button
              key={color}
              type="button"
              className={`bg-tile ${is({ type: "solid", color }) ? "is-active" : ""}`}
              style={{ background: color }}
              onClick={() => set({ type: "solid", color })}
              title={color}
            />
          ))}
        </div>

        <h3 className="section-label mt-5">Gradients</h3>
        <div className="bg-gradient-grid">
          {GRADIENTS.map((g, i) => {
            const bg: Background = { type: "gradient", ...g };
            return (
              <button
                key={i}
                type="button"
                className={`bg-gradient-tile ${is(bg) ? "is-active" : ""}`}
                style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                onClick={() => set(bg)}
                title={`Gradient ${i + 1}`}
              />
            );
          })}
        </div>

        <h3 className="section-label mt-5">Patterns</h3>
        <div className="photo-grid">
          {PATTERNS.map((p) => {
            const bg: Background = {
              type: "pattern",
              variant: p.variant,
              bg: "#F6EFE4",
              color: "#17161A",
            };
            return (
              <button
                key={p.variant}
                type="button"
                className={`photo-tile ${is(bg) ? "ring-2 ring-[var(--accent)]" : ""}`}
                style={{ background: "#F6EFE4" }}
                onClick={() => set(bg)}
                title={p.label}
              >
                <span
                  className="absolute inset-0"
                  style={{ backgroundImage: p.css.split(", ").length > 1 ? undefined : undefined }}
                >
                  <span className="absolute inset-0" style={{ background: p.css }} />
                </span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        <h3 className="section-label mt-5">Curated</h3>
        <div className="grid grid-cols-2 gap-2">
          {BACKGROUND_PRESETS.slice(0, 4).map((p) => (
            <button
              key={p.label}
              type="button"
              className="rounded-lg border border-[var(--line)] p-2 text-left hover:border-[var(--accent)]"
              onClick={() => set(p.background)}
            >
              <span
                className="block h-10 rounded-md border border-black/5 mb-1.5"
                style={{
                  background:
                    p.background.type === "solid"
                      ? p.background.color
                      : p.background.type === "gradient"
                        ? `linear-gradient(${p.background.angle}deg, ${p.background.from}, ${p.background.to})`
                        : "#eee",
                }}
              />
              <span className="text-[10px] font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

const elementIcon = (el: DesignElement) => {
  if (el.type === "text") return <Type size={13} />;
  if (el.type === "image") return <ImageIcon size={13} />;
  if (el.type === "sticker") return <Smile size={13} />;
  if (el.type === "icon") {
    const def = ICONS.find((i) => i.name === el.icon);
    return def ? <IconGlyph svg={def.svg} size={14} /> : <Sparkles size={13} />;
  }
  return <Shapes size={13} />;
};

function LayersTab() {
  const doc = useEditor((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const selection = useEditor((s) => s.selection);
  const session = useEditor((s) => s.session);
  const setSelection = useEditor((s) => s.setSelection);
  const toggleLock = useEditor((s) => s.toggleLock);
  const toggleHidden = useEditor((s) => s.toggleHidden);
  const groupSelected = useEditor((s) => s.groupSelected);
  const ungroupSelected = useEditor((s) => s.ungroupSelected);
  const reorderSelected = useEditor((s) => s.reorderSelected);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const layers = useMemo(
    () =>
      doc && activePageId
        ? doc.elements
            .filter((el) => el.pageId === activePageId)
            .sort((a, b) => b.order - a.order)
        : [],
    [doc, activePageId],
  );

  return (
    <>
      <PanelHead title="Layers" />
      <div className="flex gap-1.5 px-4 py-2.5 border-b border-[var(--line)]">
        <button
          type="button"
          className="btn btn-outline btn-xs flex-1"
          disabled={selection.length < 2}
          onClick={groupSelected}
        >
          Group
        </button>
        <button
          type="button"
          className="btn btn-outline btn-xs flex-1"
          disabled={!selection.length}
          onClick={ungroupSelected}
        >
          Ungroup
        </button>
        <button
          type="button"
          className="btn btn-outline btn-xs flex-1"
          disabled={!selection.length}
          onClick={() => reorderSelected("front")}
        >
          Front
        </button>
        <button
          type="button"
          className="btn btn-outline btn-xs flex-1"
          disabled={!selection.length}
          onClick={() => reorderSelected("back")}
        >
          Back
        </button>
      </div>
      <div className="panel-scroll">
        {layers.length ? (
          layers.map((el) => (
            <div
              key={el.id}
              draggable
              onDragStart={() => setDragId(el.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(el.id);
              }}
              onDragLeave={() => setDragOver((v) => (v === el.id ? null : v))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== el.id && session) {
                  const targetIndex = layers.length - 1 - layers.findIndex((l) => l.id === el.id);
                  session.moveElementToIndex(dragId, targetIndex);
                }
                setDragId(null);
                setDragOver(null);
              }}
              className={`layer-row ${selection.includes(el.id) ? "is-active" : ""} ${
                dragOver === el.id ? "ring-1 ring-[var(--accent)]" : ""
              } ${el.hidden ? "opacity-45" : ""}`}
              onClick={(e) => {
                if (e.shiftKey) {
                  setSelection(
                    selection.includes(el.id)
                      ? selection.filter((id) => id !== el.id)
                      : [...selection, el.id],
                  );
                } else {
                  setSelection([el.id]);
                }
              }}
            >
              <GripVertical size={12} className="text-[var(--muted-2)] shrink-0 cursor-grab" />
              <span className="layer-icon">{elementIcon(el)}</span>
              <span className="layer-name" title={el.name}>
                {el.name}
              </span>
              <button
                type="button"
                className="layer-action"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLock(el.id);
                }}
                title={el.locked ? "Unlock" : "Lock"}
              >
                {el.locked ? <LockKeyhole size={12} /> : <Unlock size={12} />}
              </button>
              <button
                type="button"
                className="layer-action"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleHidden(el.id);
                }}
                title={el.hidden ? "Show" : "Hide"}
              >
                {el.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <LayersIcon size={24} className="mx-auto text-[var(--muted-2)]" />
            <p className="text-[11.5px] text-[var(--muted)] mt-2">No layers yet.</p>
            <p className="text-[10px] text-[var(--muted-2)]">Add text, shapes or photos to get started.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function LeftPanel() {
  const tab = useEditor((s) => s.leftTab);
  const mobilePanel = useEditor((s) => s.mobilePanel);
  const showLeft = useEditor((s) => s.showLeft);
  if (!showLeft) return null;
  return (
    <aside className={`left-panel ${mobilePanel === "left" ? "is-open" : ""}`}>
      {tab === "templates" ? <TemplatesTab /> : null}
      {tab === "text" ? <TextTab /> : null}
      {tab === "elements" ? <ElementsTab /> : null}
      {tab === "photos" ? <PhotosTab /> : null}
      {tab === "uploads" ? <UploadsTab /> : null}
      {tab === "backgrounds" ? <BackgroundsTab /> : null}
      {tab === "layers" ? <LayersTab /> : null}
    </aside>
  );
}
