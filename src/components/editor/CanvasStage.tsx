"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Group, Rect, Line, Transformer, Shape, Text as KonvaText } from "react-konva";
import type Konva from "konva";
import { useEditor } from "@/lib/editor/store";
import {
  rectsIntersect,
  rotatedBounds,
  snapRect,
  unionBounds,
  type Rect as Box,
  type SnapGuide,
} from "@/lib/editor/geometry";
import { clamp } from "@/lib/editor/geometry";
import PageContent from "@/components/canvas/PageContent";
import {
  CommentPins,
  RemoteCursors,
  TextEditorOverlay,
  ZoomControls,
} from "./CanvasOverlays";
import { ExportStage, ThumbnailStage } from "./HiddenStages";

type Interaction =
  | {
      kind: "drag";
      start: { x: number; y: number };
      origins: Record<string, { x: number; y: number }>;
      ids: string[];
      box: Box;
      targets: Box[];
      moved: boolean;
      pageId: string;
      startClient: { x: number; y: number };
    }
  | {
      kind: "marquee";
      start: { x: number; y: number };
      current: { x: number; y: number };
      additive: boolean;
      pageId: string;
    }
  | {
      kind: "pan";
      startClient: { x: number; y: number };
      startPan: { x: number; y: number };
    };

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
};

const isTransformerNode = (node: Konva.Node | null) => {
  let current: Konva.Node | null = node;
  while (current) {
    if (current.className === "Transformer") return true;
    current = current.getParent();
  }
  return false;
};

export default function CanvasStage() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const activePageId = useEditor((s) => s.activePageId);
  const zoom = useEditor((s) => s.zoom);
  const pan = useEditor((s) => s.pan);
  const tool = useEditor((s) => s.tool);
  const showGrid = useEditor((s) => s.showGrid);
  const showGuides = useEditor((s) => s.showGuides);
  const snapping = useEditor((s) => s.snapping);
  const editingTextId = useEditor((s) => s.editingTextId);
  const previewPlaying = useEditor((s) => s.previewPlaying);
  const previewTime = useEditor((s) => s.previewTime);
  const peers = useEditor((s) => s.peers);
  const session = useEditor((s) => s.session);
  const viewport = useEditor((s) => s.viewport);
  const fitVersion = useEditor((s) => s.fitVersion);

  const setViewport = useEditor((s) => s.setViewport);
  const setZoom = useEditor((s) => s.setZoom);
  const setPan = useEditor((s) => s.setPan);
  const setSelection = useEditor((s) => s.setSelection);
  const selectWithGroup = useEditor((s) => s.selectWithGroup);
  const clearSelection = useEditor((s) => s.clearSelection);
  const setEditingText = useEditor((s) => s.setEditingText);
  const setCommentDraft = useEditor((s) => s.setCommentDraft);
  const addTextAt = useEditor((s) => s.addTextAt);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const thumbRef = useRef<Konva.Stage>(null);
  const interaction = useRef<Interaction | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const spaceRef = useRef(false);

  const [dragging, setDragging] = useState(false);
  const [dragIds, setDragIds] = useState<string[]>([]);
  const [dragBox, setDragBox] = useState<Box | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [spaceMode, setSpaceMode] = useState(false);

  const page = useMemo(
    () => doc?.pages.find((p) => p.id === activePageId) ?? null,
    [doc, activePageId],
  );
  const elements = useMemo(
    () =>
      doc && activePageId
        ? doc.elements
            .filter((el) => el.pageId === activePageId)
            .sort((a, b) => a.order - b.order)
        : [],
    [doc, activePageId],
  );
  const selected = useMemo(
    () =>
      doc
        ? selection
            .map((id) => doc.elements.find((el) => el.id === id))
            .filter((el): el is import("@/lib/editor/types").DesignElement => !!el)
        : [],
    [doc, selection],
  );
  const pageElements = useMemo(
    () => (doc && page ? elements.filter((el) => !el.hidden) : []),
    [elements, doc, page],
  );

  // Measure the viewport.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setViewport(Math.round(rect.width), Math.round(rect.height));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [setViewport]);

  // Fit the page whenever the canvas, document size, or panel layout changes.
  useEffect(() => {
    if (!doc || viewport.width < 80 || viewport.height < 80) return;
    const nextZoom = Math.min(
      (viewport.width - 88) / doc.width,
      (viewport.height - 88) / doc.height,
      1.4,
    );
    const z = Math.max(0.05, nextZoom);
    setZoom(z);
    setPan({
      x: Math.round((viewport.width - doc.width * z) / 2),
      y: Math.round((viewport.height - doc.height * z) / 2),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.width, doc?.height, viewport.width, viewport.height, fitVersion]);

  // Dev-only test hook used by the Playwright smoke suite.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const win = window as unknown as { __leveleCanvas?: unknown };
    win.__leveleCanvas = {
      rect: (id: string) => {
        const stage = stageRef.current;
        const node = stage?.findOne(`#el-${id}`);
        if (!stage || !node) return null;
        const box = node.getClientRect({ relativeTo: stage });
        const bounds = stage.container().getBoundingClientRect();
        return {
          x: bounds.left + stage.x() + box.x * stage.scaleX(),
          y: bounds.top + stage.y() + box.y * stage.scaleY(),
          width: box.width * stage.scaleX(),
          height: box.height * stage.scaleY(),
        };
      },
      stage: () => stageRef.current,
      anchor: (name = "rotater") => {
        const stage = stageRef.current;
        const tr = stage?.findOne("Transformer") as Konva.Transformer | null;
        if (!stage || !tr) return null;
        tr.forceUpdate();
        const node = tr.findOne(`.${name}`);
        if (!node) return null;
        const pos = node.getAbsolutePosition();
        const bounds = stage.container().getBoundingClientRect();
        return { x: bounds.left + pos.x, y: bounds.top + pos.y };
      },
    };
  }, [doc?.elements.length, doc?.width]);

  // Thumbnail provider for autosave.
  useEffect(() => {
    if (!session) return;
    session.setThumbnailProvider(() => {
      try {
        return thumbRef.current?.toDataURL({
          pixelRatio: 1,
          mimeType: "image/jpeg",
          quality: 0.8,
        });
      } catch {
        return undefined;
      }
    });
  }, [session, doc?.width, doc?.height]);

  // Broadcast this user's page, selection and cursor to collaborators.
  useEffect(() => {
    session?.setPresence({
      pageId: activePageId ?? "",
      selection,
      cursor: undefined,
    });
  }, [session, activePageId, selection]);

  const lastPresence = useRef(0);
  const broadcastCursor = () => {
    if (!session?.provider) return;
    const now = performance.now();
    if (now - lastPresence.current < 80) return;
    lastPresence.current = now;
    const pos = stageRef.current?.getRelativePointerPosition();
    if (!pos) return;
    session.setPresence({
      pageId: activePageId ?? "",
      selection,
      cursor: { x: pos.x, y: pos.y },
    });
  };

  // Cursor mode.
  useEffect(() => {
    const container = stageRef.current?.container();
    if (!container) return;
    container.style.cursor = panning
      ? "grabbing"
      : spaceMode || tool === "hand"
        ? "grab"
        : tool === "comment"
          ? "crosshair"
          : tool === "text"
            ? "text"
            : "default";
  }, [tool, spaceMode, panning]);

  // Space to pan, Escape to cancel.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.code === "Space") {
        spaceRef.current = true;
        setSpaceMode(true);
        if (document.activeElement instanceof HTMLElement) {
          if (document.activeElement.tagName !== "BUTTON") e.preventDefault();
        }
      }
      if (e.key === "Escape") {
        interaction.current = null;
        dragOffsetRef.current = null;
        setDragging(false);
        setDragOffset(null);
        setGuides([]);
        setMarquee(null);
        setPanning(false);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceRef.current = false;
        setSpaceMode(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const clientToPage = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const state = useEditor.getState();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - state.pan.x) / state.zoom,
      y: (clientY - rect.top - state.pan.y) / state.zoom,
    };
  }, []);

  // Window-level pointer handling keeps drags alive outside the stage bounds.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const inter = interaction.current;
      if (!inter) return;
      const state = useEditor.getState();
      if (inter.kind === "pan") {
        setPan({
          x: inter.startPan.x + (e.clientX - inter.startClient.x),
          y: inter.startPan.y + (e.clientY - inter.startClient.y),
        });
        return;
      }
      const point = clientToPage(e.clientX, e.clientY);
      if (inter.kind === "marquee") {
        inter.current = point;
        const rect = {
          x: Math.min(inter.start.x, point.x),
          y: Math.min(inter.start.y, point.y),
          width: Math.abs(point.x - inter.start.x),
          height: Math.abs(point.y - inter.start.y),
        };
        setMarquee(rect);
        return;
      }

      let dx = point.x - inter.start.x;
      let dy = point.y - inter.start.y;
      const screenDistance = Math.hypot(
        e.clientX - inter.startClient.x,
        e.clientY - inter.startClient.y,
      );
      if (!inter.moved && screenDistance < 3) return;
      inter.moved = true;
      let nextGuides: SnapGuide[] = [];
      if (state.snapping) {
        const result = snapRect(
          { ...inter.box, x: inter.box.x + dx, y: inter.box.y + dy },
          inter.targets,
          state.doc?.width ?? 0,
          state.doc?.height ?? 0,
          7 / state.zoom,
        );
        dx += result.dx;
        dy += result.dy;
        nextGuides = result.guides;
      }
      dragOffsetRef.current = { dx, dy };
      setDragOffset({ dx, dy });
      setGuides(nextGuides);
    };

    const up = () => {
      const inter = interaction.current;
      interaction.current = null;
      const state = useEditor.getState();
      if (!inter) return;

      if (inter.kind === "drag") {
        const offset = dragOffsetRef.current;
        if (inter.moved && offset) {
          const patches = inter.ids
            .map((id) => {
              const origin = inter.origins[id];
              const el = state.doc?.elements.find((e) => e.id === id);
              if (!origin || !el || el.locked) return null;
              return {
                id,
                patch: {
                  x: Math.round((origin.x + offset.dx) * 100) / 100,
                  y: Math.round((origin.y + offset.dy) * 100) / 100,
                },
              };
            })
            .filter(Boolean) as { id: string; patch: { x: number; y: number } }[];
          if (patches.length) state.session?.updateElements(patches);
        }
        dragOffsetRef.current = null;
        setDragging(false);
        setDragOffset(null);
        setGuides([]);
        setDragIds([]);
        setDragBox(null);
      } else if (inter.kind === "marquee") {
        const width = Math.abs(inter.current.x - inter.start.x);
        const height = Math.abs(inter.current.y - inter.start.y);
        if (width < 3 && height < 3) {
          if (!inter.additive) clearSelection();
        } else {
          const rect = {
            x: Math.min(inter.start.x, inter.current.x),
            y: Math.min(inter.start.y, inter.current.y),
            width,
            height,
          };
          const hits =
            state.doc?.elements
              .filter(
                (el) =>
                  el.pageId === inter.pageId &&
                  !el.hidden &&
                  !el.locked &&
                  rectsIntersect(rect, rotatedBounds(el)),
              )
              .map((el) => el.id) ?? [];
          const next = inter.additive
            ? Array.from(new Set([...state.selection, ...hits]))
            : hits;
          setSelection(next);
        }
        setMarquee(null);
      } else if (inter.kind === "pan") {
        setPanning(false);
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [clientToPage, clearSelection, setPan, setSelection]);

  // Attach the transformer to the selection. React-Konva commits new nodes
  // just after effects run, so retry on the next frame when a freshly added
  // element isn't findable yet.
  useEffect(() => {
    const attach = () => {
      const tr = trRef.current;
      const stage = stageRef.current;
      if (!tr || !stage) return;
      if (editingTextId || previewPlaying || dragging) {
        tr.nodes([]);
        tr.getLayer()?.batchDraw();
        return;
      }
      const nodes = selected
        .filter((el) => !el.locked && !el.hidden)
        .map((el) => stage.findOne(`#el-${el.id}`))
        .filter((n): n is Konva.Node => !!n);
      tr.nodes(nodes);
      const media =
        selected.length > 0 &&
        selected.every((el) => el.type === "image" || el.type === "icon" || el.type === "sticker");
      tr.keepRatio(media);
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    };
    attach();
    const raf = requestAnimationFrame(attach);
    return () => cancelAnimationFrame(raf);
  }, [selected, selection, editingTextId, previewPlaying, dragging, doc?.elements]);

  const startDrag = (
    elId: string,
    point: { x: number; y: number },
    evt: Konva.KonvaEventObject<PointerEvent>,
  ) => {
    const state = useEditor.getState();
    state.selectWithGroup(elId, evt.evt.shiftKey);
    const next = useEditor.getState();
    const docNow = next.doc;
    if (!docNow) return;
    const ids = next.selection;
    const selectedEls = docNow.elements.filter((e) => ids.includes(e.id));
    const targetEl = docNow.elements.find((e) => e.id === elId);
    if (!targetEl || targetEl.locked) return;
    const box = unionBounds(selectedEls);
    if (!box) return;
    const targets = docNow.elements
      .filter(
        (e) =>
          e.pageId === next.activePageId &&
          !ids.includes(e.id) &&
          !e.hidden &&
          !e.locked,
      )
      .map((e) => rotatedBounds(e));
    interaction.current = {
      kind: "drag",
      start: point,
      origins: Object.fromEntries(selectedEls.map((e) => [e.id, { x: e.x, y: e.y }])),
      ids,
      box,
      targets,
      moved: false,
      pageId: next.activePageId ?? "",
      startClient: { x: evt.evt.clientX, y: evt.evt.clientY },
    };
    dragOffsetRef.current = null;
    setDragIds(ids);
    setDragBox(box);
    setDragging(true);
    setGuides([]);
  };

  const onElementPointerDown = (
    el: import("@/lib/editor/types").DesignElement,
    evt: Konva.KonvaEventObject<PointerEvent>,
  ) => {
    if (evt.evt.button !== 0 || previewPlaying) return;
    evt.cancelBubble = true;
    const stage = stageRef.current;
    const point = stage?.getRelativePointerPosition();
    if (!point) return;
    const state = useEditor.getState();
    if (state.tool === "comment") {
      state.setCommentDraft({ x: point.x, y: point.y });
      return;
    }
    if (state.tool === "text") {
      const id = state.addTextAt(point.x, point.y);
      if (id) state.setEditingText(id);
      return;
    }
    if (spaceRef.current || state.tool === "hand") {
      interaction.current = {
        kind: "pan",
        startClient: { x: evt.evt.clientX, y: evt.evt.clientY },
        startPan: state.pan,
      };
      setPanning(true);
      return;
    }
    startDrag(el.id, point, evt);
  };

  const onElementDblClick = (
    el: import("@/lib/editor/types").DesignElement,
    evt: Konva.KonvaEventObject<MouseEvent>,
  ) => {
    evt.cancelBubble = true;
    if (el.type === "text") {
      setEditingText(el.id);
    }
  };

  const onStagePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (e.evt.button === 2 || previewPlaying) return;
    if (isTransformerNode(e.target)) return;
    const state = useEditor.getState();
    const stage = stageRef.current;
    if (!stage) return;
    const point = stage.getRelativePointerPosition();
    if (!point) return;

    if (state.tool === "comment") {
      state.setCommentDraft({ x: point.x, y: point.y });
      return;
    }
    if (state.tool === "text") {
      const id = state.addTextAt(point.x, point.y);
      if (id) state.setEditingText(id);
      return;
    }
    if (state.tool === "hand" || spaceRef.current || e.evt.button === 1) {
      interaction.current = {
        kind: "pan",
        startClient: { x: e.evt.clientX, y: e.evt.clientY },
        startPan: state.pan,
      };
      setPanning(true);
      return;
    }
    interaction.current = {
      kind: "marquee",
      start: point,
      current: point,
      additive: e.evt.shiftKey,
      pageId: state.activePageId ?? "",
    };
    setMarquee({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const state = useEditor.getState();
    const pointer = stageRef.current?.getPointerPosition();
    if (e.evt.ctrlKey || e.evt.metaKey) {
      if (!pointer) return;
      const factor = Math.exp(-e.evt.deltaY * 0.002);
      state.setZoom(clamp(state.zoom * factor, 0.05, 4), pointer);
    } else {
      state.setPan({
        x: state.pan.x - e.evt.deltaX,
        y: state.pan.y - e.evt.deltaY,
      });
    }
  };

  const onTransformEnd = () => {
    const tr = trRef.current;
    const state = useEditor.getState();
    if (!tr || !state.doc) return;
    const patches: { id: string; patch: Partial<import("@/lib/editor/types").DesignElement> }[] = [];
    tr.nodes().forEach((node) => {
      const id = node.id().replace(/^el-/, "");
      const el = state.doc?.elements.find((e) => e.id === id);
      if (!el) return;
      const sx = node.scaleX();
      const sy = node.scaleY();
      const width = Math.max(8, el.width * Math.abs(sx));
      const height = Math.max(8, el.height * Math.abs(sy));
      const patch: Partial<import("@/lib/editor/types").DesignElement> = {
        x: node.x() - width / 2,
        y: node.y() - height / 2,
        width,
        height,
        rotation: node.rotation(),
      };
      if (el.type === "text" && Math.abs(sy) !== 1) {
        (patch as { fontSize?: number }).fontSize = Math.max(6, el.fontSize * Math.abs(sy));
      }
      node.scale({ x: 1, y: 1 });
      patches.push({ id, patch });
    });
    if (patches.length) state.session?.updateElements(patches);
  };

  const offsets = useMemo(() => {
    if (!dragOffset || !dragIds.length) return undefined;
    return Object.fromEntries(dragIds.map((id) => [id, dragOffset]));
  }, [dragOffset, dragIds]);

  const displayBox = dragBox && dragOffset
    ? { ...dragBox, x: dragBox.x + dragOffset.dx, y: dragBox.y + dragOffset.dy }
    : null;

  const lockedSelected = selected.filter((el) => el.locked);
  const peerRects = useMemo(() => {
    if (!doc || !activePageId) return [];
    const result: { id: string; name: string; color: string; box: Box }[] = [];
    peers
      .filter((p) => p.pageId === activePageId)
      .forEach((peer) => {
        peer.selection.forEach((id) => {
          const el = doc.elements.find((e) => e.id === id && e.pageId === activePageId);
          if (el) result.push({ id: `${peer.id}-${id}`, name: peer.name, color: peer.color, box: rotatedBounds(el) });
        });
      });
    return result;
  }, [peers, doc, activePageId]);

  const hovered = hoveredId ? pageElements.find((el) => el.id === hoveredId) : null;

  if (!doc || !page) {
    return <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Loading canvas…</div>;
  }

  return (
    <div ref={containerRef} className="canvas-viewport" aria-label="Design canvas">
      <Stage
        ref={stageRef}
        width={viewport.width}
        height={viewport.height}
        x={pan.x}
        y={pan.y}
        scaleX={zoom}
        scaleY={zoom}
        onPointerDown={onStagePointerDown}
        onPointerMove={broadcastCursor}
        onWheel={onWheel}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={doc.width}
            height={doc.height}
            fill="#FFFFFF"
            shadowColor="#17161A"
            shadowBlur={36}
            shadowOpacity={0.18}
            shadowOffsetY={10}
            listening={false}
          />
          <Group clipX={0} clipY={0} clipWidth={doc.width} clipHeight={doc.height}>
            {showGrid ? (
              <Shape
                width={doc.width}
                height={doc.height}
                listening={false}
                sceneFunc={(ctx, shape) => {
                  const step = 40;
                  ctx.save();
                  ctx.strokeStyle = "rgba(23,22,26,0.09)";
                  ctx.lineWidth = 1 / zoom;
                  for (let x = step; x < shape.width(); x += step) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, shape.height());
                    ctx.stroke();
                  }
                  for (let y = step; y < shape.height(); y += step) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(shape.width(), y);
                    ctx.stroke();
                  }
                  ctx.restore();
                }}
              />
            ) : null}
            <PageContent
              page={page}
              elements={elements}
              width={doc.width}
              height={doc.height}
              time={previewPlaying ? previewTime : null}
              offsets={offsets}
              hiddenIds={editingTextId ? new Set([editingTextId]) : undefined}
              interactive={!previewPlaying}
              onElementPointerDown={onElementPointerDown}
              onElementDblClick={onElementDblClick}
              onElementHover={(id) => {
                setHoveredId(id);
                const container = stageRef.current?.container();
                if (container) {
                  container.style.cursor = id
                    ? tool === "comment"
                      ? "crosshair"
                      : "move"
                    : tool === "hand"
                      ? "grab"
                      : "default";
                }
              }}
            />
            <Rect
              x={0}
              y={0}
              width={doc.width}
              height={doc.height}
              stroke="#D9D4CC"
              strokeWidth={1 / zoom}
              listening={false}
            />
          </Group>
        </Layer>

        <Layer listening={false}>
          {hovered && !selection.includes(hovered.id) && !previewPlaying ? (
            <Rect
              x={rotatedBounds(hovered).x}
              y={rotatedBounds(hovered).y}
              width={rotatedBounds(hovered).width}
              height={rotatedBounds(hovered).height}
              stroke="#FF5A36"
              strokeWidth={1 / zoom}
              dash={[4 / zoom, 4 / zoom]}
              listening={false}
            />
          ) : null}

          {displayBox ? (
            <Rect
              x={displayBox.x}
              y={displayBox.y}
              width={displayBox.width}
              height={displayBox.height}
              stroke="#FF5A36"
              strokeWidth={1.5 / zoom}
              dash={[6 / zoom, 4 / zoom]}
              listening={false}
            />
          ) : null}

          {lockedSelected.map((el) => {
            const b = rotatedBounds(el);
            return (
              <Rect
                key={`locked-${el.id}`}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                stroke="#B08968"
                strokeWidth={1.5 / zoom}
                dash={[3 / zoom, 3 / zoom]}
                listening={false}
              />
            );
          })}

          {peerRects.map((r) => (
            <Rect
              key={r.id}
              x={r.box.x}
              y={r.box.y}
              width={r.box.width}
              height={r.box.height}
              stroke={r.color}
              strokeWidth={1.5 / zoom}
              dash={[5 / zoom, 3 / zoom]}
              listening={false}
            />
          ))}

          {showGuides &&
            guides.map((g, i) =>
              g.orientation === "v" ? (
                <Line
                  key={`guide-v-${i}`}
                  points={[g.position, -40, g.position, doc.height + 40]}
                  stroke="#FF5A36"
                  strokeWidth={1 / zoom}
                  dash={[5 / zoom, 4 / zoom]}
                  listening={false}
                />
              ) : (
                <Line
                  key={`guide-h-${i}`}
                  points={[-40, g.position, doc.width + 40, g.position]}
                  stroke="#FF5A36"
                  strokeWidth={1 / zoom}
                  dash={[5 / zoom, 4 / zoom]}
                  listening={false}
                />
              ),
            )}

          {marquee ? (
            <Rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.width}
              height={marquee.height}
              fill="rgba(255,90,54,0.08)"
              stroke="#FF5A36"
              strokeWidth={1 / zoom}
              listening={false}
            />
          ) : null}

          {peerRects.slice(0, 6).map((r) => (
            <KonvaText
              key={`peer-label-${r.id}`}
              x={r.box.x}
              y={r.box.y - 20 / zoom}
              text={r.name}
              fontSize={11 / zoom}
              fontFamily="Inter, sans-serif"
              fill={r.color}
              listening={false}
            />
          ))}
        </Layer>

        <Layer>
          <Transformer
            ref={trRef}
            rotateAnchorOffset={26}
            borderStroke="#FF5A36"
            borderStrokeWidth={1.5}
            anchorStroke="#FF5A36"
            anchorFill="#FFFFFF"
            anchorSize={coarse ? 20 : 9}
            anchorCornerRadius={2}
            padding={2}
            ignoreStroke
            flipEnabled={false}
            onTransformEnd={onTransformEnd}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>

      <TextEditorOverlay />
      <CommentPins />
      <RemoteCursors />
      <ZoomControls />

      <div className="canvas-hint">
        {previewPlaying
          ? "Animation preview · press Esc or click Stop"
          : tool === "comment"
            ? "Click anywhere to leave a comment"
            : tool === "text"
              ? "Click to add text"
              : "Space + drag to pan · ⌘/Ctrl + scroll to zoom"}
      </div>

      <ThumbnailStage stageRef={thumbRef} />
      <ExportStage />
    </div>
  );
}
