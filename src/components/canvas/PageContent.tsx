"use client";

import { useEffect, useState } from "react";
import { Group } from "react-konva";
import type Konva from "konva";
import type { DesignElement, DesignPage } from "@/lib/editor/types";
import { animationState } from "@/lib/editor/animation";
import BackgroundNode from "./BackgroundNode";
import ElementNode from "./ElementNode";

export interface PageContentProps {
  page: DesignPage;
  elements: DesignElement[];
  width: number;
  height: number;
  time?: number | null;
  offsets?: Record<string, { dx: number; dy: number }>;
  hiddenIds?: Set<string>;
  interactive?: boolean;
  onElementPointerDown?: (el: DesignElement, evt: Konva.KonvaEventObject<PointerEvent>) => void;
  onElementDblClick?: (el: DesignElement, evt: Konva.KonvaEventObject<MouseEvent>) => void;
  onElementHover?: (id: string | null) => void;
}

export default function PageContent({
  page,
  elements,
  width,
  height,
  time = null,
  offsets,
  hiddenIds,
  interactive = false,
  onElementPointerDown,
  onElementDblClick,
  onElementHover,
}: PageContentProps) {
  // Konva measures text with the browser canvas font. Google Fonts load after
  // the first paint, so remount once (and whenever another face arrives) to
  // re-measure with the real typeface.
  const [fontVersion, setFontVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    const bump = () => {
      if (alive) setFontVersion((v) => v + 1);
    };
    document.fonts?.ready.then(bump).catch(() => undefined);
    document.fonts?.addEventListener("loadingdone", bump);
    const timer = window.setTimeout(bump, 1800);
    return () => {
      alive = false;
      document.fonts?.removeEventListener("loadingdone", bump);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <Group>
      <BackgroundNode background={page.background} width={width} height={height} />
      {elements.map((el) => {
        if (el.hidden || hiddenIds?.has(el.id)) return null;
        const state = animationState(el, time);
        const offset = offsets?.[el.id];
        return (
          <Group
            key={el.id}
            id={`el-${el.id}`}
            name="element"
            x={el.x + el.width / 2 + state.dx + (offset?.dx ?? 0)}
            y={el.y + el.height / 2 + state.dy + (offset?.dy ?? 0)}
            offsetX={el.width / 2}
            offsetY={el.height / 2}
            width={el.width}
            height={el.height}
            rotation={el.rotation + state.rotate}
            scaleX={state.scale}
            scaleY={state.scale}
            opacity={el.opacity * state.opacity}
            listening={interactive}
            onPointerDown={
              interactive && onElementPointerDown
                ? (e) => onElementPointerDown(el, e)
                : undefined
            }
            onDblClick={
              interactive && onElementDblClick ? (e) => onElementDblClick(el, e) : undefined
            }
            onDblTap={
              interactive && onElementDblClick
                ? (e) =>
                    onElementDblClick(
                      el,
                      e as unknown as Konva.KonvaEventObject<MouseEvent>,
                    )
                : undefined
            }
            onMouseEnter={
              interactive && onElementHover ? () => onElementHover(el.id) : undefined
            }
            onMouseLeave={interactive && onElementHover ? () => onElementHover(null) : undefined}
          >
            <ElementNode el={el} fontVersion={fontVersion} />
          </Group>
        );
      })}
    </Group>
  );
}
