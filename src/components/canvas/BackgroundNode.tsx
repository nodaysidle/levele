"use client";

import { Group, Image as KonvaImage, Rect, Shape } from "react-konva";
import type Konva from "konva";
import type { Background } from "@/lib/editor/types";
import { coverCrop, useCanvasImage } from "./media";

const gradientPoints = (width: number, height: number, angle: number) => {
  const rad = (angle * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const length = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
  const dx = (Math.cos(rad) * length) / 2;
  const dy = (Math.sin(rad) * length) / 2;
  return {
    start: { x: cx - dx, y: cy - dy },
    end: { x: cx + dx, y: cy + dy },
  };
};

const seeded = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

function PatternShape({
  variant,
  color,
  width,
  height,
}: {
  variant: string;
  color: string;
  width: number;
  height: number;
}) {
  return (
    <Shape
      width={width}
      height={height}
      listening={false}
      sceneFunc={(ctx, shape) => {
        const w = shape.width();
        const h = shape.height();
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        if (variant === "dots") {
          const step = 54;
          for (let y = step / 2; y < h + step; y += step) {
            for (let x = step / 2; x < w + step; x += step) {
              ctx.beginPath();
              ctx.arc(x, y, 4.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (variant === "grid") {
          ctx.lineWidth = 1.5;
          const step = 72;
          for (let x = step; x < w; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
          for (let y = step; y < h; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
        } else if (variant === "lines") {
          ctx.lineWidth = 10;
          ctx.globalAlpha = 0.16;
          const step = 54;
          for (let x = -h; x < w + h; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + h, h);
            ctx.stroke();
          }
        } else if (variant === "waves") {
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.3;
          for (let y = 40; y < h + 80; y += 100) {
            ctx.beginPath();
            for (let x = 0; x <= w; x += 8) {
              const py = y + Math.sin((x / w) * Math.PI * 5) * 24;
              if (x === 0) ctx.moveTo(x, py);
              else ctx.lineTo(x, py);
            }
            ctx.stroke();
          }
        } else if (variant === "confetti") {
          const rand = seeded(42);
          for (let i = 0; i < 90; i++) {
            const x = rand() * w;
            const y = rand() * h;
            const size = 8 + rand() * 18;
            ctx.globalAlpha = 0.25 + rand() * 0.4;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rand() * Math.PI);
            if (i % 3 === 0) {
              ctx.beginPath();
              ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillRect(-size / 2, -size / 4, size, size / 2);
            }
            ctx.restore();
          }
        } else if (variant === "checker") {
          const size = 72;
          ctx.globalAlpha = 0.12;
          for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
              if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
                ctx.fillRect(x, y, size, size);
              }
            }
          }
        } else if (variant === "arches") {
          const size = 180;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.35;
          for (let y = size; y < h + size; y += size) {
            for (let x = 0; x < w + size; x += size) {
              ctx.beginPath();
              ctx.arc(x, y, size / 2, Math.PI, 0);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }}
    />
  );
}

export default function BackgroundNode({
  background,
  width,
  height,
}: {
  background: Background;
  width: number;
  height: number;
}) {
  const image = useCanvasImage(background.type === "image" ? background.src : undefined);

  if (background.type === "solid") {
    return <Rect width={width} height={height} fill={background.color} listening={false} />;
  }

  if (background.type === "gradient") {
    const points = gradientPoints(width, height, background.angle);
    return (
      <Rect
        width={width}
        height={height}
        fillLinearGradientStartPoint={points.start}
        fillLinearGradientEndPoint={points.end}
        fillLinearGradientColorStops={[0, background.from, 1, background.to]}
        listening={false}
      />
    );
  }

  if (background.type === "pattern") {
    return (
      <Group listening={false}>
        <Rect width={width} height={height} fill={background.bg} />
        <PatternShape
          variant={background.variant}
          color={background.color}
          width={width}
          height={height}
        />
      </Group>
    );
  }

  if (!image) {
    return <Rect width={width} height={height} fill="#E9E4DB" listening={false} />;
  }

  const crop = coverCrop(image, width, height);
  return (
    <Group listening={false}>
      <KonvaImage
        image={image}
        width={width}
        height={height}
        crop={crop}
        opacity={1}
        listening={false}
      />
      {background.overlay ? (
        <Rect
          width={width}
          height={height}
          fill={background.overlay}
          opacity={background.overlayOpacity ?? 0.3}
          listening={false}
        />
      ) : null}
    </Group>
  );
}

export const backgroundPreviewStyle = (bg: Background): React.CSSProperties => {
  if (bg.type === "solid") return { background: bg.color };
  if (bg.type === "gradient")
    return { background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` };
  if (bg.type === "pattern") return { background: bg.bg };
  return { background: "#E9E4DB" };
};

export const shadowProps = (shadow: import("@/lib/editor/types").ElementShadow | undefined) => {
  if (!shadow?.enabled) return {};
  return {
    shadowColor: shadow.color,
    shadowBlur: shadow.blur,
    shadowOffsetX: shadow.offsetX,
    shadowOffsetY: shadow.offsetY,
    shadowOpacity: shadow.opacity,
  };
};

export type KonvaShadow = ReturnType<typeof shadowProps>;

export const NOOP = {} as KonvaShadow;
