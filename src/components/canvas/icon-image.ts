"use client";

import { useEffect, useState } from "react";
import { ICONS_BY_NAME } from "@/lib/editor/icons";

const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

const buildSvg = (name: string, color: string, strokeWidth: number) => {
  const def = ICONS_BY_NAME[name] ?? ICONS_BY_NAME.star;
  if (!def) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="512" height="512" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${def.svg}</svg>`;
};

const loadIcon = (name: string, color: string, strokeWidth: number) => {
  const key = `${name}|${color}|${strokeWidth}`;
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(key);
  if (existing) return existing;
  if (typeof window === "undefined") return Promise.resolve(null);
  const svg = buildSvg(name, color, strokeWidth);
  if (!svg) return Promise.resolve(null);
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(key, img);
      pending.delete(key);
      resolve(img);
    };
    img.onerror = () => {
      pending.delete(key);
      resolve(null);
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  pending.set(key, promise);
  return promise;
};

export function useIconImage(name: string, color: string, strokeWidth: number) {
  const key = `${name}|${color}|${strokeWidth}`;
  const [image, setImage] = useState<HTMLImageElement | null>(() => cache.get(key) ?? null);

  useEffect(() => {
    let alive = true;
    const cached = cache.get(key);
    if (cached) {
      setImage(cached);
      return;
    }
    setImage(null);
    void loadIcon(name, color, strokeWidth).then((img) => {
      if (alive) setImage(img);
    });
    return () => {
      alive = false;
    };
  }, [key, name, color, strokeWidth]);

  return image;
}

export const preloadIcon = loadIcon;
