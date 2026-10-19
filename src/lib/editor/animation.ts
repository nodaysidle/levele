import type { DesignElement, ElementAnimation } from "./types";

export interface AnimationState {
  opacity: number;
  dx: number;
  dy: number;
  scale: number;
  rotate: number;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

const applyEase = (t: number, easing: ElementAnimation["easing"]) => {
  if (easing === "linear") return t;
  if (easing === "ease-in-out") return easeInOut(t);
  if (easing === "spring") return backOut(t);
  return easeOut(t);
};

export const animationIsIdle = (a: ElementAnimation) =>
  a.preset === "none" && a.loop === "none";

/**
 * Computes the visual state of an element at a given time (seconds).
 * `time === null` means "final state" — what the editor always shows.
 */
export function animationState(
  el: DesignElement,
  time: number | null | undefined,
): AnimationState {
  const a = el.animation;
  const state: AnimationState = { opacity: 1, dx: 0, dy: 0, scale: 1, rotate: 0 };
  if (time == null) return state;

  if (a.loop !== "none") {
    const t = time;
    if (a.loop === "float") {
      state.dy += Math.sin(t * 1.6) * 10;
      state.dx += Math.cos(t * 1.2) * 4;
    } else if (a.loop === "pulse") {
      state.scale *= 1 + Math.sin(t * 2.4) * 0.04;
    } else if (a.loop === "wiggle") {
      state.rotate += Math.sin(t * 2.8) * 4;
    }
  }

  if (a.preset === "none") return state;

  const raw = (time - a.delay) / Math.max(0.05, a.duration);
  if (raw <= 0) {
    return { ...state, opacity: 0 };
  }
  const p = Math.min(1, raw);
  const eased = applyEase(p, a.easing);
  const remaining = 1 - eased;
  state.opacity *= Math.min(1, p * 4);
  switch (a.preset) {
    case "fade":
      state.opacity *= eased;
      break;
    case "up":
      state.opacity *= eased;
      state.dy += 56 * remaining;
      break;
    case "down":
      state.opacity *= eased;
      state.dy -= 56 * remaining;
      break;
    case "left":
      state.opacity *= eased;
      state.dx += 72 * remaining;
      break;
    case "right":
      state.opacity *= eased;
      state.dx -= 72 * remaining;
      break;
    case "zoom-in":
      state.opacity *= eased;
      state.scale *= 0.82 + 0.18 * eased;
      break;
    case "zoom-out":
      state.opacity *= eased;
      state.scale *= 1.2 - 0.2 * eased;
      break;
    case "spin":
      state.opacity *= eased;
      state.rotate += -28 * remaining;
      state.scale *= 0.85 + 0.15 * eased;
      break;
    case "pop":
      state.opacity *= Math.min(1, p * 3);
      state.scale *= 0.55 + 0.45 * backOut(p);
      break;
  }
  return state;
}

export const pageDuration = (duration: number, elements: DesignElement[]) => {
  const end = elements.reduce(
    (max, el) => Math.max(max, el.animation.delay + el.animation.duration),
    0,
  );
  return Math.max(duration, end + 0.6);
};

export const ANIMATION_PREVIEW_SECONDS = 3.2;
