"use client";

import { useEffect, useRef } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { useEditor } from "@/lib/editor/store";
import PageContent from "@/components/canvas/PageContent";

let exportStage: Konva.Stage | null = null;
export const getExportStage = () => exportStage;

export function ExportStage() {
  const doc = useEditor((s) => s.doc);
  const exportPageId = useEditor((s) => s.exportPageId);
  const exportTime = useEditor((s) => s.exportTime);
  const stageRef = useRef<Konva.Stage>(null);

  useEffect(() => {
    exportStage = stageRef.current;
    return () => {
      exportStage = null;
    };
  }, []);

  if (!doc) return null;
  const page = doc.pages.find((p) => p.id === exportPageId) ?? doc.pages[0];
  if (!page) return null;
  const elements = doc.elements
    .filter((el) => el.pageId === page.id)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="offscreen-stage" aria-hidden>
      <Stage ref={stageRef} width={doc.width} height={doc.height}>
        <Layer>
          <PageContent
            page={page}
            elements={elements}
            width={doc.width}
            height={doc.height}
            time={exportTime ?? null}
          />
        </Layer>
      </Stage>
    </div>
  );
}

export function ThumbnailStage({
  stageRef,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const doc = useEditor((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  if (!doc) return null;
  const page = doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0];
  if (!page) return null;
  const width = 420;
  const scale = width / doc.width;
  const height = Math.round(doc.height * scale);
  const elements = doc.elements
    .filter((el) => el.pageId === page.id)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="offscreen-stage" aria-hidden>
      <Stage ref={stageRef} width={width} height={height} scaleX={scale} scaleY={scale}>
        <Layer>
          <PageContent
            page={page}
            elements={elements}
            width={doc.width}
            height={doc.height}
            time={null}
          />
        </Layer>
      </Stage>
    </div>
  );
}
