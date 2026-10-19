"use client";

import dynamic from "next/dynamic";
import type { DesignElement, DesignPage } from "@/lib/editor/types";

const StaticStage = dynamic(() => import("./StaticStage"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded bg-black/5" />,
});

export default function StaticPreview({
  width,
  docWidth,
  docHeight,
  page,
  elements,
}: {
  width: number;
  docWidth: number;
  docHeight: number;
  page: DesignPage;
  elements: DesignElement[];
}) {
  return (
    <div
      style={{
        width,
        height: (width / docWidth) * docHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <StaticStage
        width={width}
        docWidth={docWidth}
        docHeight={docHeight}
        page={page}
        elements={elements}
      />
    </div>
  );
}
