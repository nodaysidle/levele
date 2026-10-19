import type { DesignElement } from "./types";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapGuide {
  orientation: "v" | "h";
  position: number;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const rotatedBounds = (el: DesignElement): Rect => {
  const w = el.width;
  const h = el.height;
  const rad = ((el.rotation || 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bw = w * cos + h * sin;
  const bh = w * sin + h * cos;
  return {
    x: el.x + w / 2 - bw / 2,
    y: el.y + h / 2 - bh / 2,
    width: bw,
    height: bh,
  };
};

export const unionBounds = (els: DesignElement[]): Rect | null => {
  if (!els.length) return null;
  const rects = els.map(rotatedBounds);
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
};

export const rectsIntersect = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const addCandidate = (
  candidates: { vertical: number[]; horizontal: number[] },
  rect: Rect,
) => {
  candidates.vertical.push(rect.x, rect.x + rect.width / 2, rect.x + rect.width);
  candidates.horizontal.push(rect.y, rect.y + rect.height / 2, rect.y + rect.height);
};

export function snapRect(
  moving: Rect,
  targets: Rect[],
  pageWidth: number,
  pageHeight: number,
  threshold: number,
  grid = 0,
): { dx: number; dy: number; guides: SnapGuide[] } {
  const candidates = {
    vertical: [0, pageWidth / 2, pageWidth],
    horizontal: [0, pageHeight / 2, pageHeight],
  };
  targets.forEach((t) => addCandidate(candidates, t));
  if (grid > 0) {
    for (let x = grid; x < pageWidth; x += grid) candidates.vertical.push(x);
    for (let y = grid; y < pageHeight; y += grid) candidates.horizontal.push(y);
  }

  const movingV = [moving.x, moving.x + moving.width / 2, moving.x + moving.width];
  const movingH = [moving.y, moving.y + moving.height / 2, moving.y + moving.height];

  let bestV: { delta: number; guide: number } | null = null;
  let bestH: { delta: number; guide: number } | null = null;

  for (const edge of movingV) {
    for (const candidate of candidates.vertical) {
      const delta = candidate - edge;
      if (Math.abs(delta) <= threshold && (!bestV || Math.abs(delta) < Math.abs(bestV.delta))) {
        bestV = { delta, guide: candidate };
      }
    }
  }
  for (const edge of movingH) {
    for (const candidate of candidates.horizontal) {
      const delta = candidate - edge;
      if (Math.abs(delta) <= threshold && (!bestH || Math.abs(delta) < Math.abs(bestH.delta))) {
        bestH = { delta, guide: candidate };
      }
    }
  }

  const guides: SnapGuide[] = [];
  if (bestV) guides.push({ orientation: "v", position: bestV.guide });
  if (bestH) guides.push({ orientation: "h", position: bestH.guide });
  return { dx: bestV?.delta ?? 0, dy: bestH?.delta ?? 0, guides };
}

export const rotatePoint = (x: number, y: number, cx: number, cy: number, deg: number) => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
};

export const formatPx = (v: number) => `${Math.round(v)}`;
