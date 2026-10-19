"use client";

import { useEffect, useState } from "react";

type LoadedImage = HTMLImageElement | null;

const imageCache = new Map<string, LoadedImage>();
const loading = new Map<string, Promise<HTMLImageElement | null>>();

const loadImage = (src: string): Promise<HTMLImageElement | null> => {
  if (typeof window === "undefined") return Promise.resolve(null);
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);
  const pending = loading.get(src);
  if (pending) return pending;
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      loading.delete(src);
      resolve(img);
    };
    img.onerror = () => {
      imageCache.set(src, null);
      loading.delete(src);
      resolve(null);
    };
    img.src = src;
  });
  loading.set(src, promise);
  return promise;
};

export function useCanvasImage(src: string | undefined): LoadedImage {
  const [image, setImage] = useState<LoadedImage>(() => (src ? imageCache.get(src) ?? null : null));

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    let alive = true;
    const cached = imageCache.get(src);
    if (cached) {
      setImage(cached);
      return;
    }
    setImage(null);
    void loadImage(src).then((img) => {
      if (alive) setImage(img);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  return image;
}

export const preloadImage = loadImage;

export const coverCrop = (img: HTMLImageElement, width: number, height: number) => {
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = width / height;
  if (imgRatio > boxRatio) {
    const cropWidth = img.naturalHeight * boxRatio;
    return {
      x: (img.naturalWidth - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: img.naturalHeight,
    };
  }
  const cropHeight = img.naturalWidth / boxRatio;
  return {
    x: 0,
    y: (img.naturalHeight - cropHeight) / 2,
    width: img.naturalWidth,
    height: cropHeight,
  };
};

export const containSize = (img: HTMLImageElement, width: number, height: number) => {
  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  return { width: img.naturalWidth * scale, height: img.naturalHeight * scale };
};
