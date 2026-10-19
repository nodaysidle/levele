export type DocType =
  | "social"
  | "poster"
  | "story"
  | "slide"
  | "resume"
  | "thumbnail"
  | "invitation"
  | "business-card"
  | "custom";

export type ElementType = "text" | "shape" | "icon" | "image" | "sticker";

export type ShapeKind =
  | "rect"
  | "roundRect"
  | "ellipse"
  | "triangle"
  | "star"
  | "diamond"
  | "line"
  | "arrow"
  | "heart"
  | "burst"
  | "blob";

export type PatternVariant =
  | "dots"
  | "grid"
  | "lines"
  | "waves"
  | "confetti"
  | "checker"
  | "arches";

export type Background =
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string; angle: number }
  | {
      type: "image";
      src: string;
      overlay?: string;
      overlayOpacity?: number;
      blur?: number;
    }
  | { type: "pattern"; variant: PatternVariant; bg: string; color: string };

export type AnimationPreset =
  | "none"
  | "fade"
  | "up"
  | "down"
  | "left"
  | "right"
  | "zoom-in"
  | "zoom-out"
  | "spin"
  | "pop";

export type AnimationLoop = "none" | "float" | "pulse" | "wiggle";
export type Easing = "ease-out" | "ease-in-out" | "linear" | "spring";

export interface ElementAnimation {
  preset: AnimationPreset;
  duration: number;
  delay: number;
  easing: Easing;
  loop: AnimationLoop;
}

export interface ElementShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface ElementBase {
  id: string;
  pageId: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  order: number;
  groupId?: string;
  animation: ElementAnimation;
  shadow?: ElementShadow;
}

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  color: string;
  align: "left" | "center" | "right" | "justify";
  verticalAlign: "top" | "middle" | "bottom";
  lineHeight: number;
  letterSpacing: number;
  backgroundColor?: string;
  backgroundRadius?: number;
}

export interface ShapeElement extends ElementBase {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  gradient?: { from: string; to: string; angle: number };
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  dash?: number[];
}

export interface IconElement extends ElementBase {
  type: "icon";
  icon: string;
  color: string;
  strokeWidth: number;
}

export interface ImageElement extends ElementBase {
  type: "image";
  src: string;
  fit: "cover" | "contain";
  cornerRadius: number;
  overlay?: string;
  overlayOpacity?: number;
}

export interface StickerElement extends ElementBase {
  type: "sticker";
  emoji: string;
}

export type DesignElement =
  | TextElement
  | ShapeElement
  | IconElement
  | ImageElement
  | StickerElement;

export type PageTransition = "none" | "fade" | "slide" | "zoom";

export interface DesignPage {
  id: string;
  name: string;
  background: Background;
  transition: PageTransition;
  duration: number;
  order: number;
}

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  authorColor: string;
  text: string;
  createdAt: number;
}

export interface DesignComment {
  id: string;
  pageId: string;
  x: number;
  y: number;
  authorId: string;
  authorName: string;
  authorColor: string;
  text: string;
  createdAt: number;
  resolved: boolean;
  replies: CommentReply[];
}

export interface DesignDoc {
  id: string;
  title: string;
  docType: DocType;
  width: number;
  height: number;
  pages: DesignPage[];
  elements: DesignElement[];
  comments: DesignComment[];
  createdAt: number;
  updatedAt: number;
  templateId?: string;
}

export interface Profile {
  id: string;
  name: string;
  email?: string;
  color: string;
  guest: boolean;
}

export interface AccountRecord {
  id: string;
  email: string;
  name: string;
  color: string;
  salt: string;
  hash: string;
  createdAt: number;
}

export interface StoredDoc {
  id: string;
  title: string;
  ownerId: string;
  docType: DocType;
  width: number;
  height: number;
  pageCount: number;
  updatedAt: number;
  createdAt: number;
  thumbnail?: string;
  doc: DesignDoc;
}

export interface AssetRecord {
  id: string;
  ownerId: string;
  name: string;
  dataUrl: string;
  createdAt: number;
}

export interface RemotePeer {
  id: string;
  name: string;
  color: string;
  pageId: string;
  selection: string[];
  cursor?: { x: number; y: number };
}

export interface DocumentSize {
  type: DocType;
  label: string;
  width: number;
  height: number;
  description: string;
  defaultTitle: string;
  category: "Social" | "Print" | "Presentation" | "Personal";
}
