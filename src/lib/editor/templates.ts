import {
  createDoc,
  createIcon,
  createImage,
  createPage,
  createShape,
  createSticker,
  createText,
  DOC_SIZES,
} from "./defaults";
import type {
  Background,
  DesignDoc,
  DesignElement,
  DesignPage,
  DocType,
  ElementAnimation,
  IconElement,
  ImageElement,
  ShapeElement,
  ShapeKind,
  StickerElement,
  TextElement,
} from "./types";

export interface TemplateContent {
  width: number;
  height: number;
  pages: DesignPage[];
  elements: DesignElement[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  docType: DocType;
  category: string;
  tags: string[];
  accent: string;
  build: () => TemplateContent;
}

const INK = "#17161A";
const CREAM = "#F6EFE4";
const PAPER = "#FFFDF8";
const CORAL = "#FF5A36";
const MUTED = "#B8B4BC";
const MUTED_DARK = "#6F6A75";
const EMERALD = "#0E7C66";
const COBALT = "#1D3FBF";
const MUSTARD = "#FFE066";
const LILAC = "#D9D2FF";
const SAND = "#E9DCC9";
const BLUSH = "#FF8FB1";

const anim = (
  preset: ElementAnimation["preset"],
  delay = 0,
  duration = 0.8,
  loop: ElementAnimation["loop"] = "none",
): ElementAnimation => ({ preset, delay, duration, easing: "ease-out", loop });

class TplPage {
  readonly id: string;
  readonly pageId: string;
  private order = 0;
  constructor(
    page: DesignPage,
    private elements: DesignElement[],
  ) {
    this.id = page.id;
    this.pageId = page.id;
  }
  text(
    x: number,
    y: number,
    text: string,
    opts: Partial<TextElement> & { width?: number } = {},
  ) {
    const el = createText(this.pageId, this.order++, {
      x,
      y,
      text,
      ...opts,
      name: opts.name ?? text.split("\n")[0].slice(0, 32),
    });
    this.elements.push(el);
    return el;
  }
  shape(
    kind: ShapeKind,
    x: number,
    y: number,
    width: number,
    height: number,
    opts: Partial<ShapeElement> = {},
  ) {
    const el = createShape(this.pageId, this.order++, kind, {
      x,
      y,
      width,
      height,
      ...opts,
    });
    this.elements.push(el);
    return el;
  }
  image(
    src: string,
    x: number,
    y: number,
    width: number,
    height: number,
    opts: Partial<ImageElement> = {},
  ) {
    const el = createImage(this.pageId, this.order++, src, {
      x,
      y,
      width,
      height,
      ...opts,
    });
    this.elements.push(el);
    return el;
  }
  icon(
    icon: string,
    x: number,
    y: number,
    size: number,
    opts: Partial<IconElement> = {},
  ) {
    const el = createIcon(this.pageId, this.order++, icon, {
      x,
      y,
      width: size,
      height: size,
      ...opts,
    });
    this.elements.push(el);
    return el;
  }
  sticker(emoji: string, x: number, y: number, size: number, opts: Partial<StickerElement> = {}) {
    const el = createSticker(this.pageId, this.order++, emoji, {
      x,
      y,
      width: size,
      height: size,
      ...opts,
    });
    this.elements.push(el);
    return el;
  }
}

type TemplateBuilder = {
  width: number;
  height: number;
  pages: DesignPage[];
  elements: DesignElement[];
  add: (bg: Background, name?: string) => TplPage;
};

const builder = (width: number, height: number): TemplateBuilder => {
  const pages: DesignPage[] = [];
  const elements: DesignElement[] = [];
  return {
    width,
    height,
    pages,
    elements,
    add(bg, name) {
      const page = createPage(pages.length, bg, name);
      pages.push(page);
      return new TplPage(page, elements);
    },
  };
};

const solid = (color: string): Background => ({ type: "solid", color });
const gradient = (from: string, to: string, angle = 135): Background => ({
  type: "gradient",
  from,
  to,
  angle,
});

// ── Social ────────────────────────────────────────────────────────────────

const socialLaunch = (): TemplateContent => {
  const b = builder(1080, 1080);
  const p = b.add(solid(INK), "Cover");
  p.shape("ellipse", 786, -150, 430, 430, { fill: CORAL });
  p.shape("star", 760, 520, 230, 230, { fill: MUSTARD, rotation: 14 });
  p.text(80, 72, "LEVELE® / STUDIO", {
    fontSize: 24,
    fontWeight: 600,
    color: CREAM,
    letterSpacing: 4,
    uppercase: true,
    animation: anim("fade", 0),
  });
  p.text(68, 200, "Make it\nbold.", {
    fontSize: 190,
    fontWeight: 700,
    fontFamily: "Space Grotesk",
    color: CREAM,
    lineHeight: 0.95,
    width: 900,
    height: 400,
    animation: anim("up", 0.05, 0.9),
  });
  p.text(82, 690, "A free design studio for the internet.\nMade to be shared.", {
    fontSize: 38,
    fontWeight: 500,
    color: MUTED,
    lineHeight: 1.35,
    width: 620,
    animation: anim("up", 0.25),
  });
  p.shape("roundRect", 82, 862, 390, 80, { fill: CORAL, cornerRadius: 40 });
  p.text(82, 886, "START CREATING →", {
    fontSize: 22,
    fontWeight: 700,
    color: INK,
    letterSpacing: 1.5,
    width: 390,
    align: "center",
    animation: anim("fade", 0.4),
  });
  p.text(940, 1000, "01", {
    fontSize: 24,
    fontWeight: 600,
    color: CREAM,
    width: 60,
    align: "right",
  });
  return b;
};

const socialQuote = (): TemplateContent => {
  const b = builder(1080, 1080);
  const p = b.add({ type: "pattern", variant: "dots", bg: CREAM, color: "#E5C9B9" }, "Quote");
  p.text(84, -40, "“", {
    fontSize: 420,
    fontFamily: "Instrument Serif",
    color: CORAL,
    width: 300,
  });
  p.text(100, 310, "Good design is\nas little design\nas possible.", {
    fontSize: 96,
    fontFamily: "Playfair Display",
    fontWeight: 500,
    color: INK,
    lineHeight: 1.04,
    width: 880,
    height: 380,
    animation: anim("up", 0.05),
  });
  p.shape("rect", 100, 770, 210, 6, { fill: INK });
  p.text(100, 812, "DIETER RAMS", {
    fontSize: 24,
    fontWeight: 700,
    color: INK,
    letterSpacing: 4,
  });
  p.text(100, 850, "A note on doing less, better.", {
    fontSize: 26,
    fontFamily: "Instrument Serif",
    italic: true,
    color: MUTED_DARK,
  });
  p.sticker("✨", 850, 850, 100);
  return b;
};

const socialCoffee = (): TemplateContent => {
  const b = builder(1080, 1080);
  const p = b.add(solid("#F1E7DA"), "Cover");
  p.image("/photos/1060.jpg", 520, 0, 560, 1080, { fit: "cover" });
  p.shape("ellipse", 430, 820, 200, 200, { fill: CORAL });
  p.text(64, 70, "FIELD NOTES / 02", {
    fontSize: 22,
    fontWeight: 600,
    color: INK,
    letterSpacing: 3,
  });
  p.text(58, 240, "Slow\nmornings.", {
    fontSize: 132,
    fontFamily: "Fraunces",
    fontWeight: 500,
    color: INK,
    lineHeight: 0.94,
    width: 500,
    height: 290,
    animation: anim("up", 0.1),
  });
  p.text(64, 600, "A ritual, not a rush.\nBrewed for the unhurried.", {
    fontSize: 30,
    color: MUTED_DARK,
    lineHeight: 1.4,
    width: 420,
  });
  p.text(64, 950, "READ THE JOURNAL →", {
    fontSize: 20,
    fontWeight: 700,
    color: INK,
    letterSpacing: 2,
    width: 420,
  });
  return b;
};

// ── Stories ───────────────────────────────────────────────────────────────

const storySale = (): TemplateContent => {
  const b = builder(1080, 1920);
  const p = b.add(gradient(BLUSH, MUSTARD, 160), "Sale");
  p.text(0, 120, "WEEKEND ONLY", {
    fontSize: 32,
    fontWeight: 700,
    color: INK,
    letterSpacing: 8,
    width: 1080,
    align: "center",
    animation: anim("fade"),
  });
  p.text(0, 230, "THE\nBIG\nSALE", {
    fontSize: 330,
    fontFamily: "Bebas Neue",
    color: INK,
    lineHeight: 0.84,
    width: 1080,
    align: "center",
    height: 860,
    animation: anim("up", 0.05, 0.9),
  });
  p.shape("ellipse", 320, 1090, 440, 440, { fill: CORAL });
  p.text(320, 1190, "-50%", {
    fontSize: 150,
    fontFamily: "Archivo Black",
    color: CREAM,
    width: 440,
    align: "center",
    animation: anim("pop", 0.35),
  });
  p.text(0, 1600, "Everything must go.\nFriday — Sunday only.", {
    fontSize: 42,
    fontWeight: 600,
    color: INK,
    lineHeight: 1.35,
    width: 1080,
    align: "center",
  });
  p.text(0, 1770, "LEVELE STORE · IN STORE + ONLINE", {
    fontSize: 20,
    fontWeight: 600,
    color: "#6F4A1F",
    letterSpacing: 3,
    width: 1080,
    align: "center",
  });
  p.sticker("🎉", 90, 1590, 120, { rotation: -12 });
  p.sticker("🪩", 880, 240, 100, { rotation: 10 });
  return b;
};

const storyTravel = (): TemplateContent => {
  const b = builder(1080, 1920);
  const p = b.add({ type: "image", src: "/photos/1015.jpg", overlay: "#0B1220", overlayOpacity: 0.28 }, "Fjord");
  p.shape("rect", 0, 0, 1080, 1920, { fill: "#0B1220", opacity: 0.18 });
  p.text(80, 100, "FIELD NOTES / 01", {
    fontSize: 24,
    fontWeight: 600,
    color: CREAM,
    letterSpacing: 4,
    animation: anim("fade"),
  });
  p.text(76, 1070, "The quiet\nnorth.", {
    fontSize: 156,
    fontFamily: "Instrument Serif",
    color: "#FFFDF8",
    lineHeight: 0.95,
    width: 900,
    height: 340,
    animation: anim("up", 0.1, 1),
  });
  p.shape("rect", 80, 1450, 120, 4, { fill: CORAL });
  p.text(80, 1490, "A slow journey through the fjords\nof western Norway.", {
    fontSize: 34,
    color: "#EDE7DD",
    lineHeight: 1.45,
    width: 620,
    animation: anim("up", 0.3),
  });
  p.shape("roundRect", 80, 1680, 330, 72, {
    fill: "transparent",
    stroke: CREAM,
    strokeWidth: 2,
    cornerRadius: 36,
  });
  p.text(80, 1701, "READ THE STORY  →", {
    fontSize: 20,
    fontWeight: 600,
    color: CREAM,
    letterSpacing: 2,
    width: 330,
    align: "center",
  });
  p.text(940, 1704, "01 / 04", {
    fontSize: 20,
    fontWeight: 600,
    color: CREAM,
    width: 70,
    align: "right",
  });
  return b;
};

// ── Posters ───────────────────────────────────────────────────────────────

const posterJazz = (): TemplateContent => {
  const b = builder(1240, 1748);
  const p = b.add(solid(INK), "Jazz night");
  p.shape("ellipse", 880, -220, 560, 560, { fill: MUSTARD });
  p.text(80, 100, "THE BLUE ROOM PRESENTS", {
    fontSize: 24,
    fontWeight: 600,
    color: CREAM,
    letterSpacing: 5,
  });
  p.text(64, 180, "JAZZ", {
    fontSize: 380,
    fontFamily: "Bebas Neue",
    color: CREAM,
    lineHeight: 0.8,
    width: 900,
    height: 320,
    animation: anim("up", 0.05, 0.9),
  });
  p.text(64, 470, "NIGHT", {
    fontSize: 380,
    fontFamily: "Bebas Neue",
    color: MUSTARD,
    lineHeight: 0.8,
    width: 900,
    height: 320,
    animation: anim("up", 0.12, 0.9),
  });
  p.shape("roundRect", 930, 470, 210, 64, { fill: CORAL, cornerRadius: 32 });
  p.text(930, 489, "LIVE ●", {
    fontSize: 26,
    fontWeight: 700,
    color: INK,
    width: 210,
    align: "center",
    letterSpacing: 2,
  });
  p.image("/photos/452.jpg", 80, 900, 1080, 540, { fit: "cover", cornerRadius: 18 });
  p.shape("rect", 80, 1490, 1080, 1, { fill: "#3A3840" });
  p.text(80, 1520, "MILES / COLTRANE / EVANS", {
    fontSize: 30,
    fontWeight: 600,
    color: CREAM,
    letterSpacing: 2,
  });
  p.text(80, 1590, "FRIDAY 21:00 — LATE\nTHE BLUE ROOM · 14 WATER STREET", {
    fontSize: 24,
    color: MUTED,
    lineHeight: 1.6,
  });
  p.text(940, 1590, "€24", {
    fontSize: 56,
    fontFamily: "Bebas Neue",
    color: MUSTARD,
    width: 220,
    align: "right",
  });
  return b;
};

const posterExhibit = (): TemplateContent => {
  const b = builder(1240, 1748);
  const p = b.add(solid(CREAM), "Exhibition");
  p.shape("ellipse", 930, 82, 200, 200, { fill: CORAL });
  p.text(64, 96, "FORM", {
    fontSize: 320,
    fontFamily: "Archivo Black",
    color: INK,
    letterSpacing: -18,
    width: 1120,
    height: 360,
    animation: anim("up", 0.05),
  });
  p.text(70, 400, "& FUNCTION", {
    fontSize: 86,
    fontFamily: "Space Grotesk",
    fontWeight: 500,
    color: INK,
    letterSpacing: -2,
    width: 1000,
  });
  p.shape("rect", 70, 540, 1100, 2, { fill: INK });
  p.image("/photos/1050.jpg", 70, 600, 1100, 700, { fit: "cover" });
  p.text(70, 1350, "AN EXHIBITION OF\nEVERYDAY OBJECTS", {
    fontSize: 46,
    fontWeight: 600,
    color: INK,
    lineHeight: 1.18,
    width: 560,
  });
  p.text(700, 1350, "04 — 28\nOCTOBER 2026", {
    fontSize: 30,
    fontFamily: "Space Grotesk",
    fontWeight: 500,
    color: INK,
    lineHeight: 1.5,
    width: 300,
  });
  p.text(1010, 1350, "HALL\nNORTH", {
    fontSize: 30,
    fontWeight: 600,
    color: INK,
    lineHeight: 1.5,
    width: 160,
  });
  p.shape("rect", 70, 1600, 1100, 2, { fill: INK });
  p.text(70, 1630, "FREE ENTRY · TUESDAY — SUNDAY · 10:00 — 18:00", {
    fontSize: 22,
    color: MUTED_DARK,
    letterSpacing: 2,
  });
  return b;
};

// ── Slides ────────────────────────────────────────────────────────────────

const slidePitch = (): TemplateContent => {
  const b = builder(1920, 1080);
  const cover = b.add(solid(INK), "Cover");
  cover.shape("roundRect", 120, 110, 22, 22, { fill: CORAL, cornerRadius: 11 });
  cover.text(158, 102, "NORTHWIND", {
    fontSize: 34,
    fontWeight: 700,
    color: CREAM,
    letterSpacing: 6,
  });
  cover.text(118, 270, "The operating\nsystem for\nindependent studios.", {
    fontSize: 108,
    fontFamily: "Space Grotesk",
    fontWeight: 700,
    color: CREAM,
    lineHeight: 1,
    width: 1240,
    height: 360,
    animation: anim("up", 0.05, 1),
  });
  cover.text(120, 720, "One calm place to plan, price, deliver and get paid.\nBuilt for teams of two to twenty.", {
    fontSize: 32,
    color: MUTED,
    lineHeight: 1.5,
    width: 850,
  });
  cover.shape("ellipse", 1420, 240, 420, 420, {
    fill: "transparent",
    stroke: CORAL,
    strokeWidth: 2,
  });
  cover.shape("ellipse", 1520, 340, 220, 220, { fill: CORAL });
  cover.text(120, 948, "SERIES A · 2026", {
    fontSize: 20,
    fontWeight: 600,
    color: MUTED,
    letterSpacing: 4,
  });
  cover.text(1700, 948, "01", { fontSize: 20, fontWeight: 600, color: MUTED, width: 100, align: "right" });

  const problem = b.add(solid(CREAM), "Problem");
  problem.text(120, 100, "01 / THE PROBLEM", {
    fontSize: 22,
    fontWeight: 700,
    color: CORAL,
    letterSpacing: 4,
  });
  problem.text(118, 180, "Studio work is scattered\nacross nine tabs.", {
    fontSize: 92,
    fontFamily: "Space Grotesk",
    fontWeight: 600,
    color: INK,
    lineHeight: 1.05,
    width: 1200,
    height: 220,
  });
  const stats = [
    { n: "63%", t: "of studios lose track of\nscope changes every week." },
    { n: "11h", t: "spent each month chasing\ninvoices and approvals." },
    { n: "2.4x", t: "more tools than five years\nago — and less clarity." },
  ];
  stats.forEach((s, i) => {
    const x = 120 + i * 560;
    problem.shape("rect", x, 560, 500, 1, { fill: "#CFC5B6" });
    problem.text(x, 600, s.n, {
      fontSize: 100,
      fontFamily: "Fraunces",
      fontWeight: 600,
      color: INK,
      width: 480,
    });
    problem.text(x, 740, s.t, {
      fontSize: 28,
      color: MUTED_DARK,
      lineHeight: 1.5,
      width: 450,
    });
  });
  problem.text(120, 960, "NORTHWIND · SERIES A 2026", { fontSize: 18, color: MUTED_DARK, letterSpacing: 3 });
  problem.text(1700, 960, "02", { fontSize: 18, color: MUTED_DARK, width: 100, align: "right" });

  const product = b.add(solid("#141318"), "Product");
  product.text(120, 100, "02 / THE PRODUCT", {
    fontSize: 22,
    fontWeight: 700,
    color: MUSTARD,
    letterSpacing: 4,
  });
  product.text(118, 175, "One workspace.\nEvery moving part.", {
    fontSize: 88,
    fontFamily: "Space Grotesk",
    fontWeight: 600,
    color: CREAM,
    lineHeight: 1.05,
    width: 1000,
    height: 210,
  });
  const cards = [
    { icon: "target", title: "Plan", copy: "Timelines, briefs and\ncapacity in one view." },
    { icon: "palette", title: "Make", copy: "Concepts, versions and\nfeedback, side by side." },
    { icon: "credit-card", title: "Get paid", copy: "Proposals, invoices and\npayments, automated." },
  ];
  cards.forEach((c, i) => {
    const x = 120 + i * 570;
    product.shape("roundRect", x, 560, 500, 340, {
      fill: "#232129",
      cornerRadius: 28,
    });
    product.icon(c.icon, x + 40, 600, 56, { color: MUSTARD, strokeWidth: 1.6 });
    product.text(x + 40, 690, c.title, {
      fontSize: 40,
      fontWeight: 600,
      color: CREAM,
      width: 400,
    });
    product.text(x + 40, 760, c.copy, {
      fontSize: 26,
      color: MUTED,
      lineHeight: 1.5,
      width: 400,
    });
  });
  product.text(120, 960, "NORTHWIND · SERIES A 2026", { fontSize: 18, color: MUTED_DARK, letterSpacing: 3 });
  product.text(1700, 960, "03", { fontSize: 18, color: MUTED_DARK, width: 100, align: "right" });

  const traction = b.add(solid(CORAL), "Traction");
  traction.text(120, 100, "03 / TRACTION", {
    fontSize: 22,
    fontWeight: 700,
    color: INK,
    letterSpacing: 4,
  });
  traction.text(110, 180, "312%", {
    fontSize: 220,
    fontFamily: "Archivo Black",
    color: CREAM,
    width: 900,
    height: 250,
    animation: anim("up", 0.05),
  });
  traction.text(120, 430, "net revenue growth in the last twelve months.", {
    fontSize: 32,
    color: INK,
    width: 650,
  });
  const bars = [130, 220, 300, 360, 470, 580, 760];
  bars.forEach((h, i) => {
    traction.shape("roundRect", 960 + i * 110, 720 - h, 64, h, {
      fill: CREAM,
      cornerRadius: 10,
      opacity: 0.32 + i * 0.09,
    });
  });
  traction.shape("rect", 960, 722, 760, 2, { fill: INK });
  traction.text(120, 800, "140 studios · 9 countries · 96% annual retention", {
    fontSize: 26,
    color: INK,
    letterSpacing: 1,
    width: 800,
  });
  traction.text(120, 960, "NORTHWIND · SERIES A 2026", { fontSize: 18, color: "#5D2415", letterSpacing: 3 });
  traction.text(1700, 960, "04", { fontSize: 18, color: "#5D2415", width: 100, align: "right" });

  const ask = b.add(solid(CREAM), "Ask");
  ask.text(120, 100, "04 / THE ASK", {
    fontSize: 22,
    fontWeight: 700,
    color: CORAL,
    letterSpacing: 4,
  });
  ask.text(112, 200, "€4M", {
    fontSize: 240,
    fontFamily: "Archivo Black",
    color: INK,
    width: 900,
    height: 280,
  });
  ask.text(120, 480, "to make independent studios\nfeel inevitable.", {
    fontSize: 60,
    fontFamily: "Space Grotesk",
    fontWeight: 600,
    color: INK,
    lineHeight: 1.1,
    width: 900,
  });
  const asks = ["Ship the money layer", "Open the marketplace", "Grow to 1,000 studios"];
  asks.forEach((t, i) => {
    ask.text(120, 680 + i * 62, `0${i + 1}   ${t}`, {
      fontSize: 28,
      color: MUTED_DARK,
      width: 800,
    });
  });
  ask.shape("roundRect", 1320, 700, 480, 1, { fill: "#CFC5B6" });
  ask.text(1320, 740, "hello@northwind.studio", {
    fontSize: 34,
    fontWeight: 600,
    color: INK,
    width: 480,
  });
  ask.text(1320, 800, "northwind.studio\nOslo · Berlin · Lisbon", {
    fontSize: 24,
    color: MUTED_DARK,
    lineHeight: 1.6,
    width: 480,
  });
  ask.text(120, 960, "NORTHWIND · SERIES A 2026", { fontSize: 18, color: MUTED_DARK, letterSpacing: 3 });
  ask.text(1700, 960, "05", { fontSize: 18, color: MUTED_DARK, width: 100, align: "right" });
  return b;
};

const slidePortfolio = (): TemplateContent => {
  const b = builder(1920, 1080);
  const cover = b.add(solid(CREAM), "Cover");
  cover.image("/photos/1043.jpg", 1010, 0, 910, 1080, { fit: "cover" });
  cover.text(100, 90, "FIELDWORK STUDIO", {
    fontSize: 22,
    fontWeight: 700,
    color: INK,
    letterSpacing: 5,
  });
  cover.text(92, 270, "Work that\nfeels alive.", {
    fontSize: 156,
    fontFamily: "Instrument Serif",
    color: INK,
    lineHeight: 0.94,
    width: 850,
    height: 330,
    animation: anim("up", 0.05),
  });
  cover.text(100, 700, "Brand, digital and editorial design\nfor people building good things.", {
    fontSize: 30,
    color: MUTED_DARK,
    lineHeight: 1.5,
    width: 640,
  });
  cover.text(100, 940, "PORTFOLIO · 2026", {
    fontSize: 18,
    fontWeight: 600,
    color: MUTED_DARK,
    letterSpacing: 4,
  });

  const work = b.add(solid(PAPER), "Selected work");
  work.text(100, 90, "SELECTED WORK", {
    fontSize: 22,
    fontWeight: 700,
    color: CORAL,
    letterSpacing: 5,
  });
  work.text(98, 150, "A few recent things.", {
    fontSize: 88,
    fontFamily: "Instrument Serif",
    color: INK,
    width: 1000,
  });
  work.image("/photos/1060.jpg", 100, 330, 820, 560, { fit: "cover" });
  work.image("/photos/292.jpg", 1000, 330, 820, 560, { fit: "cover" });
  work.text(100, 920, "Slow Coffee — identity & packaging", {
    fontSize: 28,
    fontWeight: 600,
    color: INK,
    width: 800,
  });
  work.text(1000, 920, "Harvest Table — editorial art direction", {
    fontSize: 28,
    fontWeight: 600,
    color: INK,
    width: 820,
  });
  work.text(1000, 970, "2025 · PORTLAND, OR", {
    fontSize: 18,
    color: MUTED_DARK,
    letterSpacing: 3,
  });
  work.text(1800, 1010, "02", { fontSize: 18, color: MUTED_DARK, width: 40, align: "right" });

  const quote = b.add(solid(INK), "Approach");
  quote.text(100, 100, "THE APPROACH", {
    fontSize: 22,
    fontWeight: 700,
    color: MUSTARD,
    letterSpacing: 5,
  });
  quote.text(100, 280, "“Make the thing.\nThen make it\nmake sense.”", {
    fontSize: 130,
    fontFamily: "Instrument Serif",
    color: CREAM,
    lineHeight: 1.02,
    width: 1300,
    height: 500,
    animation: anim("up", 0.05),
  });
  quote.shape("rect", 100, 820, 120, 4, { fill: CORAL });
  quote.text(100, 855, "A note taped above the studio door.", {
    fontSize: 26,
    color: MUTED,
    width: 900,
  });
  quote.text(1800, 1010, "03", { fontSize: 18, color: MUTED_DARK, width: 40, align: "right" });
  return b;
};

// ── Resume ────────────────────────────────────────────────────────────────

const resumeEditorial = (): TemplateContent => {
  const b = builder(1240, 1754);
  const p = b.add(solid(PAPER), "Resume");
  p.shape("rect", 0, 0, 380, 1754, { fill: INK });
  p.shape("ellipse", 80, 90, 120, 120, { fill: CORAL });
  p.text(80, 116, "MO", {
    fontSize: 44,
    fontFamily: "Fraunces",
    fontWeight: 600,
    color: INK,
    width: 120,
    align: "center",
  });
  p.text(80, 270, "CONTACT", {
    fontSize: 20,
    fontWeight: 700,
    color: MUSTARD,
    letterSpacing: 3,
  });
  p.text(80, 315, "mara.okafor@email.com\n+1 415 555 0148\nmaraokafor.design\nSan Francisco, CA", {
    fontSize: 22,
    color: "#D7D2C8",
    lineHeight: 1.7,
    width: 250,
  });
  p.text(80, 560, "SKILLS", {
    fontSize: 20,
    fontWeight: 700,
    color: MUSTARD,
    letterSpacing: 3,
  });
  p.text(80, 605, "Product strategy\nDesign systems\nResearch & testing\nPrototyping\nFacilitation\nMotion basics", {
    fontSize: 22,
    color: "#D7D2C8",
    lineHeight: 1.7,
    width: 250,
  });
  p.text(80, 970, "EDUCATION", {
    fontSize: 20,
    fontWeight: 700,
    color: MUSTARD,
    letterSpacing: 3,
  });
  p.text(80, 1015, "BFA, Communication Design\nRhode Island School of Design\n2014 — 2018", {
    fontSize: 22,
    color: "#D7D2C8",
    lineHeight: 1.6,
    width: 250,
  });
  p.text(80, 1280, "RECOGNITION", {
    fontSize: 20,
    fontWeight: 700,
    color: MUSTARD,
    letterSpacing: 3,
  });
  p.text(80, 1325, "Fast Company Innovation\nby Design — Finalist, 2024\nAIGA Eye on Design, 2023", {
    fontSize: 22,
    color: "#D7D2C8",
    lineHeight: 1.6,
    width: 250,
  });
  p.text(80, 1640, "PORTFOLIO AVAILABLE\nON REQUEST", {
    fontSize: 16,
    color: "#8C8792",
    letterSpacing: 2,
    lineHeight: 1.6,
    width: 250,
  });

  p.text(440, 110, "Mara Okafor", {
    fontSize: 92,
    fontFamily: "Fraunces",
    fontWeight: 600,
    color: INK,
    width: 740,
    height: 110,
    animation: anim("fade", 0),
  });
  p.text(444, 230, "Product designer & researcher", {
    fontSize: 28,
    fontFamily: "Instrument Serif",
    italic: true,
    color: CORAL,
    width: 700,
  });
  p.text(440, 310, "I design calm, useful products for complex problems — and build the teams and systems that keep them good.", {
    fontSize: 24,
    color: MUTED_DARK,
    lineHeight: 1.5,
    width: 720,
  });
  p.shape("rect", 440, 420, 720, 2, { fill: "#E2D8CA" });

  const entry = (y: number, role: string, company: string, dates: string, bullets: string) => {
    p.text(440, y, role, {
      fontSize: 30,
      fontWeight: 700,
      color: INK,
      width: 540,
    });
    p.text(985, y + 6, dates, {
      fontSize: 18,
      color: MUTED_DARK,
      width: 180,
      align: "right",
    });
    p.text(440, y + 42, company, {
      fontSize: 22,
      fontWeight: 600,
      color: CORAL,
      width: 540,
    });
    p.text(440, y + 84, bullets, {
      fontSize: 21,
      color: MUTED_DARK,
      lineHeight: 1.55,
      width: 730,
    });
  };
  p.text(440, 460, "EXPERIENCE", {
    fontSize: 20,
    fontWeight: 700,
    color: INK,
    letterSpacing: 3,
  });
  entry(
    510,
    "Staff Product Designer",
    "Northwind",
    "2022 — NOW",
    "Lead designer for the studio operations platform used by 140 teams.\nRebuilt the core planning flow, lifting week-one activation 34%.\nBuilt the design system and a five-person practice from scratch.",
  );
  entry(
    800,
    "Senior Product Designer",
    "Lumen Health",
    "2019 — 2022",
    "Owned the patient scheduling experience across web and mobile.\nRan a 40-participant research program and quarterly usability labs.\nShipped a design system adopted by six product squads.",
  );
  entry(
    1090,
    "Product Designer",
    "Fieldwork Studio",
    "2018 — 2019",
    "Designed brand and digital work for early-stage founders.\nTurned messy briefs into clear, shippable design directions.",
  );
  p.shape("rect", 440, 1370, 720, 2, { fill: "#E2D8CA" });
  p.text(440, 1400, "SELECTED WORK", {
    fontSize: 20,
    fontWeight: 700,
    color: INK,
    letterSpacing: 3,
  });
  p.text(440, 1445, "Northwind Studio OS — 2023\nA calm workspace for creative teams. 0 → 12k weekly active users.", {
    fontSize: 21,
    color: MUTED_DARK,
    lineHeight: 1.5,
    width: 720,
  });
  p.text(440, 1550, "Lumen Care — 2021\nScheduling that meets patients where they are. 4.8 App Store rating.", {
    fontSize: 21,
    color: MUTED_DARK,
    lineHeight: 1.5,
    width: 720,
  });
  p.text(440, 1670, "References available · maraokafor.design", {
    fontSize: 18,
    color: MUTED_DARK,
    width: 700,
  });
  return b;
};

// ── Thumbnail ─────────────────────────────────────────────────────────────

const thumbnailTech = (): TemplateContent => {
  const b = builder(1280, 720);
  const p = b.add({ type: "image", src: "/photos/823.jpg", overlay: "#0F1420", overlayOpacity: 0.35 }, "Thumbnail");
  p.shape("rect", 0, 0, 1280, 720, { fill: "#0F1420", opacity: 0.25 });
  p.shape("roundRect", 70, 62, 300, 56, { fill: CORAL, cornerRadius: 28 });
  p.text(70, 78, "30-DAY EXPERIMENT", {
    fontSize: 20,
    fontWeight: 700,
    color: INK,
    letterSpacing: 2,
    width: 300,
    align: "center",
  });
  p.text(64, 150, "I TRIED\nTHIS FOR\n30 DAYS", {
    fontSize: 138,
    fontFamily: "Archivo Black",
    color: CREAM,
    lineHeight: 0.94,
    width: 1050,
    height: 400,
    animation: anim("up", 0.05, 0.9),
  });
  p.text(72, 615, "Here's what nobody tells you.", {
    fontSize: 34,
    fontWeight: 500,
    color: CREAM,
    width: 700,
  });
  p.shape("ellipse", 1040, 430, 180, 180, { fill: MUSTARD });
  p.text(1040, 470, "WOW", {
    fontSize: 54,
    fontFamily: "Archivo Black",
    color: INK,
    width: 180,
    align: "center",
  });
  p.text(1160, 648, "EP. 14", {
    fontSize: 18,
    fontWeight: 700,
    color: CREAM,
    letterSpacing: 2,
    width: 80,
    align: "right",
  });
  p.icon("arrow-up-right", 1130, 60, 70, { color: CREAM, strokeWidth: 1.5 });
  return b;
};

// ── Invitations ───────────────────────────────────────────────────────────

const inviteWedding = (): TemplateContent => {
  const b = builder(1080, 1440);
  const p = b.add(solid(CREAM), "Invitation");
  p.shape("roundRect", 46, 46, 988, 1348, {
    fill: "transparent",
    stroke: "#B08968",
    strokeWidth: 2,
    cornerRadius: 0,
  });
  p.text(0, 100, "TOGETHER WITH THEIR FAMILIES", {
    fontSize: 20,
    fontWeight: 600,
    color: "#8A6A4E",
    letterSpacing: 4,
    width: 1080,
    align: "center",
  });
  p.text(0, 300, "Amara", {
    fontSize: 150,
    fontFamily: "Instrument Serif",
    color: INK,
    width: 1080,
    align: "center",
    animation: anim("fade", 0.1, 1.2),
  });
  p.text(0, 450, "&", {
    fontSize: 84,
    fontFamily: "Instrument Serif",
    italic: true,
    color: CORAL,
    width: 1080,
    align: "center",
  });
  p.text(0, 550, "Noah", {
    fontSize: 150,
    fontFamily: "Instrument Serif",
    color: INK,
    width: 1080,
    align: "center",
    animation: anim("fade", 0.2, 1.2),
  });
  p.shape("rect", 470, 760, 140, 2, { fill: "#B08968" });
  p.text(0, 800, "SATURDAY · SEPTEMBER 12 · 2026", {
    fontSize: 26,
    fontWeight: 600,
    color: INK,
    letterSpacing: 3,
    width: 1080,
    align: "center",
  });
  p.text(0, 850, "FOUR IN THE AFTERNOON", {
    fontSize: 18,
    color: "#8A6A4E",
    letterSpacing: 4,
    width: 1080,
    align: "center",
  });
  p.text(0, 980, "THE OLD ORCHARD", {
    fontSize: 30,
    fontFamily: "Instrument Serif",
    color: INK,
    letterSpacing: 2,
    width: 1080,
    align: "center",
  });
  p.text(0, 1030, "SOMERSET, ENGLAND", {
    fontSize: 18,
    color: "#8A6A4E",
    letterSpacing: 4,
    width: 1080,
    align: "center",
  });
  p.text(0, 1180, "Dinner, dancing and a late-night fire.\nPlease RSVP by July 1.", {
    fontSize: 24,
    fontFamily: "Instrument Serif",
    italic: true,
    color: MUTED_DARK,
    lineHeight: 1.5,
    width: 1080,
    align: "center",
  });
  p.sticker("🌿", 490, 1260, 100);
  p.text(0, 1350, "AMARAANDNOAH.COM", {
    fontSize: 16,
    fontWeight: 600,
    color: "#8A6A4E",
    letterSpacing: 3,
    width: 1080,
    align: "center",
  });
  return b;
};

const inviteBirthday = (): TemplateContent => {
  const b = builder(1080, 1440);
  const p = b.add({ type: "pattern", variant: "confetti", bg: LILAC, color: COBALT }, "Birthday");
  const confetti = [
    [70, 120, 26, 26, CORAL, 18],
    [940, 160, 32, 18, MUSTARD, -24],
    [160, 1200, 38, 18, EMERALD, 32],
    [890, 1180, 28, 28, CORAL, 12],
    [790, 90, 18, 40, EMERALD, 42],
    [330, 180, 22, 22, BLUSH, 0],
    [1000, 640, 20, 20, MUSTARD, 0],
    [60, 760, 26, 26, MUSTARD, 0],
  ] as const;
  confetti.forEach(([x, y, w, h, fill, rotation]) =>
    p.shape("roundRect", x, y, w, h, { fill, cornerRadius: 6, rotation }),
  );
  p.text(0, 180, "MAYA IS TURNING", {
    fontSize: 30,
    fontWeight: 700,
    color: COBALT,
    letterSpacing: 8,
    width: 1080,
    align: "center",
  });
  p.text(0, 250, "30", {
    fontSize: 520,
    fontFamily: "Bebas Neue",
    color: COBALT,
    lineHeight: 0.8,
    width: 1080,
    align: "center",
    height: 470,
    animation: anim("pop", 0.1, 1),
  });
  p.text(0, 700, "LET'S PARTY", {
    fontSize: 100,
    fontFamily: "Archivo Black",
    color: CORAL,
    width: 1080,
    align: "center",
    animation: anim("up", 0.3),
  });
  p.shape("roundRect", 240, 860, 600, 330, { fill: PAPER, cornerRadius: 30 });
  p.text(240, 900, "SATURDAY, NOVEMBER 8", {
    fontSize: 28,
    fontWeight: 700,
    color: INK,
    letterSpacing: 2,
    width: 600,
    align: "center",
  });
  p.text(240, 960, "8 PM — LATE", {
    fontSize: 44,
    fontFamily: "Bebas Neue",
    color: CORAL,
    width: 600,
    align: "center",
  });
  p.text(240, 1040, "The Loft · 44 Mercer Street\nDress code: your best dancing shoes", {
    fontSize: 22,
    color: MUTED_DARK,
    lineHeight: 1.5,
    width: 600,
    align: "center",
  });
  p.text(240, 1130, "RSVP TO MAYA · 555 0142", {
    fontSize: 16,
    fontWeight: 600,
    color: INK,
    letterSpacing: 2,
    width: 600,
    align: "center",
  });
  p.sticker("🎈", 110, 950, 120, { rotation: -12 });
  p.sticker("🪩", 850, 930, 110, { rotation: 10 });
  return b;
};

// ── Business cards ────────────────────────────────────────────────────────

const cardStudio = (): TemplateContent => {
  const b = builder(1050, 600);
  const front = b.add(solid(INK), "Front");
  front.shape("ellipse", 790, -90, 330, 330, { fill: CORAL });
  front.icon("sparkles", 850, 60, 90, { color: INK, strokeWidth: 1.4 });
  front.text(72, 110, "STUDIO\nNORTH", {
    fontSize: 96,
    fontFamily: "Space Grotesk",
    fontWeight: 700,
    color: CREAM,
    lineHeight: 0.92,
    width: 520,
    height: 180,
  });
  front.text(76, 380, "DESIGN & DIRECTION", {
    fontSize: 20,
    fontWeight: 600,
    color: MUSTARD,
    letterSpacing: 4,
  });
  front.text(72, 500, "studionorth.co", { fontSize: 22, color: MUTED, width: 300 });
  front.text(680, 500, "OSLO / 59.91° N", {
    fontSize: 18,
    color: MUTED,
    letterSpacing: 2,
    width: 300,
    align: "right",
  });

  const back = b.add(solid(CREAM), "Back");
  back.shape("rect", 0, 0, 18, 600, { fill: CORAL });
  back.text(80, 90, "Ingrid Solberg", {
    fontSize: 58,
    fontFamily: "Fraunces",
    fontWeight: 600,
    color: INK,
    width: 600,
  });
  back.text(82, 170, "Creative director", {
    fontSize: 26,
    fontFamily: "Instrument Serif",
    italic: true,
    color: CORAL,
    width: 500,
  });
  back.text(80, 280, "ingrid@studionorth.co", {
    fontSize: 24,
    fontWeight: 600,
    color: INK,
    width: 500,
  });
  back.text(80, 326, "+47 22 44 18 90\nStorgata 14, 0184 Oslo", {
    fontSize: 20,
    color: MUTED_DARK,
    lineHeight: 1.6,
    width: 420,
  });
  const dots = Array.from({ length: 9 });
  dots.forEach((_, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    back.shape("ellipse", 820 + col * 50, 360 + row * 50, 22, 22, {
      fill: i === 4 ? CORAL : INK,
    });
  });
  back.text(760, 90, "SN", {
    fontSize: 72,
    fontFamily: "Space Grotesk",
    fontWeight: 700,
    color: "#E2D8CA",
    width: 210,
    align: "right",
  });
  return b;
};

const cardConsultant = (): TemplateContent => {
  const b = builder(1050, 600);
  const p = b.add(solid(PAPER), "Card");
  p.shape("rect", 0, 0, 1050, 18, { fill: EMERALD });
  p.shape("ellipse", 830, 420, 150, 150, { fill: "#E9F5EF" });
  p.icon("globe", 862, 452, 86, { color: EMERALD, strokeWidth: 1.4 });
  p.text(64, 90, "Elena Marsh", {
    fontSize: 54,
    fontFamily: "Space Grotesk",
    fontWeight: 600,
    color: INK,
    width: 600,
  });
  p.text(66, 155, "Strategy & operations consultant", {
    fontSize: 22,
    color: EMERALD,
    letterSpacing: 1,
    width: 600,
  });
  p.shape("rect", 66, 216, 90, 3, { fill: CORAL });
  p.text(66, 260, "elena@marshconsulting.co\n+1 212 555 0184\nmarshconsulting.co", {
    fontSize: 22,
    color: MUTED_DARK,
    lineHeight: 1.65,
    width: 460,
  });
  p.text(66, 470, "NEW YORK · LONDON", {
    fontSize: 17,
    fontWeight: 600,
    color: INK,
    letterSpacing: 3,
  });
  p.text(750, 80, "MARSH", {
    fontSize: 46,
    fontFamily: "Archivo Black",
    color: "#E4EBE6",
    width: 240,
    align: "right",
  });
  return b;
};

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "social-launch",
    name: "Make it bold",
    description: "A high-contrast launch post with an oversized headline.",
    docType: "social",
    category: "Social",
    tags: ["bold", "launch", "dark"],
    accent: CORAL,
    build: socialLaunch,
  },
  {
    id: "social-quote",
    name: "Quiet quote",
    description: "Editorial serif quote on a soft dotted background.",
    docType: "social",
    category: "Social",
    tags: ["quote", "editorial", "minimal"],
    accent: "#D8A48F",
    build: socialQuote,
  },
  {
    id: "social-coffee",
    name: "Slow mornings",
    description: "Split photo and type layout for journal-style posts.",
    docType: "social",
    category: "Social",
    tags: ["photo", "lifestyle", "warm"],
    accent: "#B08968",
    build: socialCoffee,
  },
  {
    id: "story-sale",
    name: "Big weekend sale",
    description: "Loud, playful story with a discount badge.",
    docType: "story",
    category: "Story",
    tags: ["sale", "bold", "retail"],
    accent: BLUSH,
    build: storySale,
  },
  {
    id: "story-travel",
    name: "The quiet north",
    description: "Full-bleed travel story with an editorial serif title.",
    docType: "story",
    category: "Story",
    tags: ["travel", "photo", "editorial"],
    accent: "#2F6FED",
    build: storyTravel,
  },
  {
    id: "poster-jazz",
    name: "Jazz night",
    description: "Late-night gig poster with bold condensed type.",
    docType: "poster",
    category: "Poster",
    tags: ["music", "event", "dark"],
    accent: MUSTARD,
    build: posterJazz,
  },
  {
    id: "poster-exhibit",
    name: "Form & function",
    description: "Swiss-inspired exhibition poster with a photo.",
    docType: "poster",
    category: "Poster",
    tags: ["exhibition", "swiss", "photo"],
    accent: CORAL,
    build: posterExhibit,
  },
  {
    id: "slide-pitch",
    name: "Northwind pitch",
    description: "Five-slide startup pitch deck, fully editable.",
    docType: "slide",
    category: "Presentation",
    tags: ["pitch", "startup", "deck"],
    accent: CORAL,
    build: slidePitch,
  },
  {
    id: "slide-portfolio",
    name: "Fieldwork portfolio",
    description: "Three-slide portfolio with photography and a pull quote.",
    docType: "slide",
    category: "Presentation",
    tags: ["portfolio", "studio", "photo"],
    accent: "#B08968",
    build: slidePortfolio,
  },
  {
    id: "resume-editorial",
    name: "Editorial resume",
    description: "Two-column A4 resume with a dark sidebar.",
    docType: "resume",
    category: "Resume",
    tags: ["resume", "editorial", "two-column"],
    accent: CORAL,
    build: resumeEditorial,
  },
  {
    id: "thumbnail-tech",
    name: "30-day experiment",
    description: "High-contrast YouTube thumbnail with a badge.",
    docType: "thumbnail",
    category: "Thumbnail",
    tags: ["youtube", "bold", "photo"],
    accent: MUSTARD,
    build: thumbnailTech,
  },
  {
    id: "invite-wedding",
    name: "Amara & Noah",
    description: "Elegant wedding invitation with fine borders.",
    docType: "invitation",
    category: "Invitation",
    tags: ["wedding", "elegant", "serif"],
    accent: "#B08968",
    build: inviteWedding,
  },
  {
    id: "invite-birthday",
    name: "Thirty, flirty",
    description: "Playful birthday invitation with confetti.",
    docType: "invitation",
    category: "Invitation",
    tags: ["birthday", "playful", "colorful"],
    accent: COBALT,
    build: inviteBirthday,
  },
  {
    id: "card-studio",
    name: "Studio North",
    description: "Two-sided design studio business card.",
    docType: "business-card",
    category: "Business card",
    tags: ["studio", "dark", "minimal"],
    accent: CORAL,
    build: cardStudio,
  },
  {
    id: "card-consultant",
    name: "Elena Marsh",
    description: "Clean, credentialed consulting card.",
    docType: "business-card",
    category: "Business card",
    tags: ["consultant", "clean", "green"],
    accent: EMERALD,
    build: cardConsultant,
  },
];

const contentCache = new Map<string, TemplateContent>();

export function buildTemplate(def: TemplateDefinition): TemplateContent {
  const cached = contentCache.get(def.id);
  if (cached) return cached;
  const content = def.build();
  contentCache.set(def.id, content);
  return content;
}

export function templateToDoc(def: TemplateDefinition): DesignDoc {
  const content = buildTemplate(def);
  const doc = createDoc({
    docType: def.docType,
    width: content.width,
    height: content.height,
    title: def.name,
    templateId: def.id,
  });
  return {
    ...doc,
    width: content.width,
    height: content.height,
    pages: content.pages.map((p, i) => ({ ...p, order: i })),
    elements: content.elements.map((e) => ({ ...e })),
  };
}

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

export const templatesForType = (type: DocType) =>
  TEMPLATES.filter((t) => t.docType === type);

export const TEMPLATE_CATEGORIES = [
  "All",
  ...Array.from(new Set(TEMPLATES.map((t) => t.category))),
];

export const TEMPLATE_DIMENSIONS: Record<string, { width: number; height: number }> =
  Object.fromEntries(
    DOC_SIZES.map((s) => [s.type, { width: s.width, height: s.height }]),
  );
