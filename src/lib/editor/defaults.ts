import { nanoid } from "nanoid";
import type {
  Background,
  DesignDoc,
  DesignElement,
  DesignPage,
  DocType,
  DocumentSize,
  ElementAnimation,
  IconElement,
  ImageElement,
  ShapeElement,
  ShapeKind,
  StickerElement,
  TextElement,
} from "./types";

export const uid = (prefix = "") => `${prefix}${nanoid(10)}`;

export const DOC_SIZES: DocumentSize[] = [
  {
    type: "social",
    label: "Social post",
    width: 1080,
    height: 1080,
    description: "Square · 1080 × 1080",
    defaultTitle: "Untitled social post",
    category: "Social",
  },
  {
    type: "story",
    label: "Story",
    width: 1080,
    height: 1920,
    description: "Vertical · 1080 × 1920",
    defaultTitle: "Untitled story",
    category: "Social",
  },
  {
    type: "thumbnail",
    label: "Thumbnail",
    width: 1280,
    height: 720,
    description: "Widescreen · 1280 × 720",
    defaultTitle: "Untitled thumbnail",
    category: "Social",
  },
  {
    type: "poster",
    label: "Poster",
    width: 1240,
    height: 1748,
    description: "A4 portrait · 1240 × 1748",
    defaultTitle: "Untitled poster",
    category: "Print",
  },
  {
    type: "invitation",
    label: "Invitation",
    width: 1080,
    height: 1440,
    description: "Portrait · 1080 × 1440",
    defaultTitle: "Untitled invitation",
    category: "Print",
  },
  {
    type: "business-card",
    label: "Business card",
    width: 1050,
    height: 600,
    description: "3.5 × 2 in · 1050 × 600",
    defaultTitle: "Untitled business card",
    category: "Print",
  },
  {
    type: "slide",
    label: "Presentation",
    width: 1920,
    height: 1080,
    description: "16:9 slides · 1920 × 1080",
    defaultTitle: "Untitled presentation",
    category: "Presentation",
  },
  {
    type: "resume",
    label: "Resume",
    width: 1240,
    height: 1754,
    description: "A4 · 1240 × 1754",
    defaultTitle: "Untitled resume",
    category: "Personal",
  },
  {
    type: "custom",
    label: "Custom size",
    width: 1080,
    height: 1080,
    description: "Set your own dimensions",
    defaultTitle: "Untitled design",
    category: "Personal",
  },
];

export const sizeFor = (type: DocType): DocumentSize =>
  DOC_SIZES.find((s) => s.type === type) ?? DOC_SIZES[0];

export const FONTS = [
  { label: "Inter", value: "Inter", stack: '"Inter", system-ui, sans-serif' },
  { label: "Space Grotesk", value: "Space Grotesk", stack: '"Space Grotesk", system-ui, sans-serif' },
  { label: "Poppins", value: "Poppins", stack: '"Poppins", system-ui, sans-serif' },
  { label: "Instrument Serif", value: "Instrument Serif", stack: '"Instrument Serif", Georgia, serif' },
  { label: "Playfair Display", value: "Playfair Display", stack: '"Playfair Display", Georgia, serif' },
  { label: "DM Serif Display", value: "DM Serif Display", stack: '"DM Serif Display", Georgia, serif' },
  { label: "Lora", value: "Lora", stack: '"Lora", Georgia, serif' },
  { label: "Fraunces", value: "Fraunces", stack: '"Fraunces", Georgia, serif' },
  { label: "Bebas Neue", value: "Bebas Neue", stack: '"Bebas Neue", Impact, sans-serif' },
  { label: "Archivo Black", value: "Archivo Black", stack: '"Archivo Black", Impact, sans-serif' },
  { label: "Caveat", value: "Caveat", stack: '"Caveat", cursive' },
  { label: "Libre Baskerville", value: "Libre Baskerville", stack: '"Libre Baskerville", Georgia, serif' },
] as const;

export const fontStack = (family: string) =>
  FONTS.find((f) => f.value === family)?.stack ?? `"${family}", system-ui, sans-serif`;

export const PALETTE = [
  "#17161A", "#3D3A42", "#78747F", "#B8B4BC", "#FFFFFF",
  "#FFF7ED", "#F6EFE4", "#E9DCC9", "#D8C3A5", "#B08968",
  "#FF5A36", "#FF8A5C", "#FFC56E", "#FFE066", "#D7F75B",
  "#22A06B", "#0E7C66", "#9BD4C3", "#57C4E5", "#2F6FED",
  "#1D3FBF", "#8B5CF6", "#C4A7FF", "#FF8FB1", "#E5484D",
  "#F2C4CE", "#C7E8F5", "#D9D2FF", "#FEF3C7", "#101828",
];

export const GRADIENTS: { from: string; to: string; angle: number }[] = [
  { from: "#FF5A36", to: "#FFB86B", angle: 135 },
  { from: "#0F172A", to: "#334155", angle: 160 },
  { from: "#0E7C66", to: "#9BD4C3", angle: 135 },
  { from: "#2F6FED", to: "#C4A7FF", angle: 135 },
  { from: "#FF8FB1", to: "#FFE066", angle: 120 },
  { from: "#F6EFE4", to: "#D8C3A5", angle: 150 },
  { from: "#17161A", to: "#FF5A36", angle: 160 },
  { from: "#D7F75B", to: "#22A06B", angle: 120 },
];

export const PHOTOS = [
  { id: "1015", title: "Fjord", tags: "travel nature water", w: 900, h: 1200 },
  { id: "1025", title: "Blanket dog", tags: "animal cozy", w: 900, h: 1200 },
  { id: "1039", title: "Rainforest falls", tags: "nature green", w: 900, h: 1200 },
  { id: "1043", title: "Valley", tags: "nature mountains", w: 900, h: 1200 },
  { id: "1050", title: "Sea cliffs", tags: "nature water", w: 900, h: 1200 },
  { id: "1060", title: "Slow coffee", tags: "food coffee", w: 900, h: 1200 },
  { id: "1062", title: "Wrapped pup", tags: "animal portrait", w: 900, h: 1200 },
  { id: "1069", title: "Jellyfish", tags: "nature ocean", w: 900, h: 1200 },
  { id: "1080", title: "Strawberries", tags: "food fruit", w: 900, h: 1200 },
  { id: "206", title: "Golden field", tags: "nature landscape", w: 1200, h: 900 },
  { id: "292", title: "Harvest table", tags: "food flatlay", w: 1200, h: 900 },
  { id: "429", title: "Raspberries", tags: "food fruit", w: 1200, h: 900 },
  { id: "452", title: "Concert", tags: "music people night", w: 1200, h: 900 },
  { id: "660", title: "Sparkler", tags: "people celebration", w: 1200, h: 900 },
  { id: "823", title: "Photographer", tags: "people portrait", w: 1200, h: 900 },
  { id: "870", title: "Lighthouse", tags: "travel ocean", w: 1200, h: 900 },
] as const;

export const photoUrl = (id: string) => `/photos/${id}.jpg`;

export const STICKERS: { emoji: string; label: string; group: string }[] = [
  { emoji: "✨", label: "Sparkles", group: "Symbols" },
  { emoji: "🌟", label: "Star", group: "Symbols" },
  { emoji: "🔥", label: "Fire", group: "Symbols" },
  { emoji: "💥", label: "Boom", group: "Symbols" },
  { emoji: "💫", label: "Dizzy", group: "Symbols" },
  { emoji: "🌈", label: "Rainbow", group: "Symbols" },
  { emoji: "☀️", label: "Sun", group: "Symbols" },
  { emoji: "🌙", label: "Moon", group: "Symbols" },
  { emoji: "⚡", label: "Bolt", group: "Symbols" },
  { emoji: "❤️", label: "Heart", group: "Symbols" },
  { emoji: "💛", label: "Yellow heart", group: "Symbols" },
  { emoji: "💬", label: "Speech", group: "Symbols" },
  { emoji: "🎉", label: "Party", group: "Celebration" },
  { emoji: "🎊", label: "Confetti", group: "Celebration" },
  { emoji: "🎈", label: "Balloon", group: "Celebration" },
  { emoji: "🎁", label: "Gift", group: "Celebration" },
  { emoji: "🥳", label: "Party face", group: "Celebration" },
  { emoji: "🍾", label: "Champagne", group: "Celebration" },
  { emoji: "🪩", label: "Disco", group: "Celebration" },
  { emoji: "👑", label: "Crown", group: "Celebration" },
  { emoji: "🌿", label: "Leaf", group: "Nature" },
  { emoji: "🌱", label: "Sprout", group: "Nature" },
  { emoji: "🌸", label: "Blossom", group: "Nature" },
  { emoji: "🌻", label: "Sunflower", group: "Nature" },
  { emoji: "🌵", label: "Cactus", group: "Nature" },
  { emoji: "🍋", label: "Lemon", group: "Food" },
  { emoji: "🍓", label: "Strawberry", group: "Food" },
  { emoji: "🍒", label: "Cherries", group: "Food" },
  { emoji: "🥑", label: "Avocado", group: "Food" },
  { emoji: "🍕", label: "Pizza", group: "Food" },
  { emoji: "🧋", label: "Boba", group: "Food" },
  { emoji: "☕", label: "Coffee", group: "Food" },
  { emoji: "🍰", label: "Cake", group: "Food" },
  { emoji: "💻", label: "Laptop", group: "Objects" },
  { emoji: "📸", label: "Camera", group: "Objects" },
  { emoji: "🎧", label: "Headphones", group: "Objects" },
  { emoji: "🎸", label: "Guitar", group: "Objects" },
  { emoji: "🕶️", label: "Sunglasses", group: "Objects" },
  { emoji: "💌", label: "Love letter", group: "Objects" },
  { emoji: "📌", label: "Pin", group: "Objects" },
  { emoji: "🧡", label: "Orange heart", group: "Symbols" },
];

export const ANIMATION_PRESETS: {
  value: ElementAnimation["preset"];
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade in" },
  { value: "up", label: "Rise up" },
  { value: "down", label: "Drop in" },
  { value: "left", label: "From right" },
  { value: "right", label: "From left" },
  { value: "zoom-in", label: "Zoom in" },
  { value: "zoom-out", label: "Zoom out" },
  { value: "spin", label: "Spin in" },
  { value: "pop", label: "Pop" },
];

export const ANIMATION_LOOPS: {
  value: ElementAnimation["loop"];
  label: string;
}[] = [
  { value: "none", label: "No loop" },
  { value: "float", label: "Float" },
  { value: "pulse", label: "Pulse" },
  { value: "wiggle", label: "Wiggle" },
];

export const defaultAnimation = (): ElementAnimation => ({
  preset: "none",
  duration: 0.7,
  delay: 0,
  easing: "ease-out",
  loop: "none",
});

const base = (
  pageId: string,
  type: DesignElement["type"],
  order: number,
  partial: Partial<DesignElement> & { x: number; y: number; width: number; height: number },
) => ({
  id: uid("el_"),
  pageId,
  type,
  name: partial.name ?? type[0].toUpperCase() + type.slice(1),
  x: partial.x,
  y: partial.y,
  width: partial.width,
  height: partial.height,
  rotation: partial.rotation ?? 0,
  opacity: partial.opacity ?? 1,
  locked: partial.locked ?? false,
  hidden: partial.hidden ?? false,
  order,
  groupId: partial.groupId,
  animation: partial.animation ?? defaultAnimation(),
  shadow: partial.shadow,
});

export const createText = (
  pageId: string,
  order: number,
  partial: Partial<TextElement> & { x: number; y: number },
): TextElement => {
  const fontSize = partial.fontSize ?? 64;
  const lines = (partial.text ?? "Add a heading").split("\n").length;
  return {
    ...base(pageId, "text", order, {
      x: partial.x,
      y: partial.y,
      width: partial.width ?? 620,
      height: partial.height ?? Math.ceil(fontSize * (partial.lineHeight ?? 1.1) * lines),
      name: partial.name ?? "Text",
      rotation: partial.rotation,
      opacity: partial.opacity,
      locked: partial.locked,
      hidden: partial.hidden,
      groupId: partial.groupId,
      animation: partial.animation,
      shadow: partial.shadow,
    }),
    type: "text",
    text: partial.text ?? "Add a heading",
    fontFamily: partial.fontFamily ?? "Inter",
    fontSize,
    fontWeight: partial.fontWeight ?? 700,
    italic: partial.italic ?? false,
    underline: partial.underline ?? false,
    uppercase: partial.uppercase ?? false,
    color: partial.color ?? "#17161A",
    align: partial.align ?? "left",
    verticalAlign: partial.verticalAlign ?? "top",
    lineHeight: partial.lineHeight ?? 1.1,
    letterSpacing: partial.letterSpacing ?? 0,
    backgroundColor: partial.backgroundColor,
    backgroundRadius: partial.backgroundRadius ?? 16,
  };
};

export const createShape = (
  pageId: string,
  order: number,
  shape: ShapeKind,
  partial: Partial<ShapeElement> & { x: number; y: number; width: number; height: number },
): ShapeElement => ({
  ...base(pageId, "shape", order, {
    ...partial,
    name: partial.name ?? shape.replace(/(^\w)/, (c) => c.toUpperCase()),
  }),
  type: "shape",
  shape,
  fill: partial.fill ?? "#FF5A36",
  gradient: partial.gradient,
  stroke: partial.stroke ?? "transparent",
  strokeWidth: partial.strokeWidth ?? 0,
  cornerRadius: partial.cornerRadius ?? 0,
  dash: partial.dash,
});

export const createIcon = (
  pageId: string,
  order: number,
  icon: string,
  partial: Partial<IconElement> & { x: number; y: number },
): IconElement => ({
  ...base(pageId, "icon", order, {
    x: partial.x,
    y: partial.y,
    width: partial.width ?? 160,
    height: partial.height ?? 160,
    name: partial.name ?? icon.replace(/-/g, " "),
    rotation: partial.rotation,
    opacity: partial.opacity,
    locked: partial.locked,
    hidden: partial.hidden,
    groupId: partial.groupId,
    animation: partial.animation,
    shadow: partial.shadow,
  }),
  type: "icon",
  icon,
  color: partial.color ?? "#17161A",
  strokeWidth: partial.strokeWidth ?? 1.75,
});

export const createImage = (
  pageId: string,
  order: number,
  src: string,
  partial: Partial<ImageElement> & { x: number; y: number; width: number; height: number },
): ImageElement => ({
  ...base(pageId, "image", order, {
    ...partial,
    name: partial.name ?? "Photo",
  }),
  type: "image",
  src,
  fit: partial.fit ?? "cover",
  cornerRadius: partial.cornerRadius ?? 0,
  overlay: partial.overlay,
  overlayOpacity: partial.overlayOpacity,
});

export const createSticker = (
  pageId: string,
  order: number,
  emoji: string,
  partial: Partial<StickerElement> & { x: number; y: number },
): StickerElement => ({
  ...base(pageId, "sticker", order, {
    x: partial.x,
    y: partial.y,
    width: partial.width ?? 160,
    height: partial.height ?? 160,
    name: partial.name ?? "Sticker",
    rotation: partial.rotation,
    opacity: partial.opacity,
    locked: partial.locked,
    hidden: partial.hidden,
    groupId: partial.groupId,
    animation: partial.animation,
    shadow: partial.shadow,
  }),
  type: "sticker",
  emoji,
});

export const cloneElement = (
  el: DesignElement,
  pageId = el.pageId,
  overrides: Partial<DesignElement> = {},
): DesignElement =>
  ({
    ...el,
    ...overrides,
    id: uid("el_"),
    pageId,
    groupId: el.groupId ? uid("grp_") : undefined,
    animation: { ...el.animation },
    shadow: el.shadow ? { ...el.shadow } : undefined,
  }) as unknown as DesignElement;

export const createPage = (
  order: number,
  background: Background = { type: "solid", color: "#FFFFFF" },
  name?: string,
): DesignPage => ({
  id: uid("pg_"),
  name: name ?? `Page ${order + 1}`,
  background,
  transition: "fade",
  duration: 4,
  order,
});

export const createDoc = (opts: {
  docType?: DocType;
  width?: number;
  height?: number;
  title?: string;
  templateId?: string;
}): DesignDoc => {
  const size = sizeFor(opts.docType ?? "social");
  const now = Date.now();
  const page = createPage(0);
  return {
    id: uid("doc_"),
    title: opts.title ?? size.defaultTitle,
    docType: opts.docType ?? "social",
    width: opts.width ?? size.width,
    height: opts.height ?? size.height,
    pages: [page],
    elements: [],
    comments: [],
    createdAt: now,
    updatedAt: now,
    templateId: opts.templateId,
  };
};

export const elementStyleLabel = (el: DesignElement) =>
  el.type === "text"
    ? el.text.slice(0, 40) || "Empty text"
    : el.type === "icon"
      ? el.name
      : el.type === "image"
        ? "Photo"
        : el.type === "sticker"
          ? el.emoji
          : el.name;

export const BACKGROUND_PRESETS: { label: string; background: Background }[] = [
  { label: "White", background: { type: "solid", color: "#FFFFFF" } },
  { label: "Cream", background: { type: "solid", color: "#F6EFE4" } },
  { label: "Ink", background: { type: "solid", color: "#17161A" } },
  { label: "Coral", background: { type: "solid", color: "#FF5A36" } },
  { label: "Emerald", background: { type: "solid", color: "#0E7C66" } },
  { label: "Cobalt", background: { type: "solid", color: "#1D3FBF" } },
  { label: "Lilac", background: { type: "solid", color: "#D9D2FF" } },
  ...GRADIENTS.map((g, i) => ({
    label: `Gradient ${i + 1}`,
    background: { type: "gradient" as const, ...g },
  })),
];
