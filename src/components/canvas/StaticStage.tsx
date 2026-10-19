"use client";

import { useMemo } from "react";
import { Stage, Layer } from "react-konva";
import type { DesignElement, DesignPage } from "@/lib/editor/types";
import PageContent from "@/components/canvas/PageContent";

export default function StaticStage({
  width,
  docWidth,
  docHeight,
  page,
  elements,
  height,
}: {
  width: number;
  docWidth: number;
  docHeight: number;
  page: DesignPage;
  elements: DesignElement[];
  height?: number;
}) {
  const scale = width / docWidth;
  const stageHeight = height ?? Math.round(docHeight * scale);
  const sorted = useMemo(
    () =>
      elements
        .filter((el) => el.pageId === page.id)
        .sort((a, b) => a.order - b.order),
    [elements, page.id],
  );
  return (
    <Stage width={width} height={stageHeight} scaleX={scale} scaleY={scale} listening={false}>
      <Layer listening={false}>
        <PageContent
          page={page}
          elements={sorted}
          width={docWidth}
          height={docHeight}
          time={null}
        />
      </Layer>
    </Stage>
  );
}
