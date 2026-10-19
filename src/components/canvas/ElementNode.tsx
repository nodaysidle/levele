"use client";

import {
  Arrow,
  Ellipse,
  Group,
  Image as KonvaImage,
  Line,
  Path,
  Rect,
  RegularPolygon,
  Star,
  Text,
} from "react-konva";
import type Konva from "konva";
import type {
  DesignElement,
  IconElement,
  ImageElement,
  ShapeElement,
  StickerElement,
  TextElement,
} from "@/lib/editor/types";
import { fontStack } from "@/lib/editor/defaults";
import { shadowProps } from "./BackgroundNode";
import { containSize, coverCrop, useCanvasImage } from "./media";
import { useIconImage } from "./icon-image";

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

function TextNode({ el, fontVersion }: { el: TextElement; fontVersion?: number }) {
  const fontStyle = `${el.italic ? "italic " : ""}${el.fontWeight}`;
  return (
    <Group>
      {el.backgroundColor ? (
        <Rect
          width={el.width}
          height={el.height}
          fill={el.backgroundColor}
          cornerRadius={el.backgroundRadius ?? 0}
          {...shadowProps(el.shadow)}
        />
      ) : null}
      <Text
        key={`font-${fontVersion ?? 0}`}
        text={el.uppercase ? el.text.toUpperCase() : el.text}
        width={el.width}
        height={el.height}
        fontFamily={fontStack(el.fontFamily)}
        fontSize={el.fontSize}
        fontStyle={fontStyle}
        fill={el.color}
        align={el.align}
        verticalAlign={el.verticalAlign}
        lineHeight={el.lineHeight}
        letterSpacing={el.letterSpacing}
        textDecoration={el.underline ? "underline" : ""}
        wrap="word"
        padding={el.backgroundColor ? Math.min(24, el.fontSize * 0.35) : 0}
        {...shadowProps(el.shadow)}
      />
    </Group>
  );
}

function ShapeNode({ el }: { el: ShapeElement }) {
  const common = {
    fill: el.gradient ? undefined : el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    dash: el.dash,
    strokeScaleEnabled: false,
    ...shadowProps(el.shadow),
  };
  const gradient = el.gradient
    ? (() => {
        const radians = (el.gradient.angle * Math.PI) / 180;
        const length =
          Math.abs(el.width * Math.cos(radians)) + Math.abs(el.height * Math.sin(radians));
        const dx = (Math.cos(radians) * length) / 2;
        const dy = (Math.sin(radians) * length) / 2;
        return {
          fillLinearGradientStartPoint: { x: el.width / 2 - dx, y: el.height / 2 - dy },
          fillLinearGradientEndPoint: { x: el.width / 2 + dx, y: el.height / 2 + dy },
          fillLinearGradientColorStops: [0, el.gradient.from, 1, el.gradient.to],
        };
      })()
    : {};

  switch (el.shape) {
    case "rect":
      return <Rect width={el.width} height={el.height} {...common} {...gradient} />;
    case "roundRect":
      return (
        <Rect
          width={el.width}
          height={el.height}
          cornerRadius={el.cornerRadius}
          {...common}
          {...gradient}
        />
      );
    case "ellipse":
      return (
        <Ellipse
          x={el.width / 2}
          y={el.height / 2}
          radiusX={el.width / 2}
          radiusY={el.height / 2}
          {...common}
          {...gradient}
        />
      );
    case "triangle":
      return (
        <Line
          points={[el.width / 2, 0, el.width, el.height, 0, el.height]}
          closed
          {...common}
          {...gradient}
        />
      );
    case "diamond":
      return (
        <Line
          points={[el.width / 2, 0, el.width, el.height / 2, el.width / 2, el.height, 0, el.height / 2]}
          closed
          {...common}
          {...gradient}
        />
      );
    case "star":
      return (
        <Star
          x={el.width / 2}
          y={el.height / 2}
          numPoints={5}
          innerRadius={Math.min(el.width, el.height) * 0.21}
          outerRadius={Math.min(el.width, el.height) / 2}
          scaleX={el.width / Math.min(el.width, el.height)}
          scaleY={el.height / Math.min(el.width, el.height)}
          {...common}
          {...gradient}
        />
      );
    case "burst":
      return (
        <Star
          x={el.width / 2}
          y={el.height / 2}
          numPoints={12}
          innerRadius={Math.min(el.width, el.height) * 0.39}
          outerRadius={Math.min(el.width, el.height) / 2}
          scaleX={el.width / Math.min(el.width, el.height)}
          scaleY={el.height / Math.min(el.width, el.height)}
          {...common}
          {...gradient}
        />
      );
    case "line":
      return (
        <Line
          points={[0, el.height / 2, el.width, el.height / 2]}
          stroke={el.stroke === "transparent" ? el.fill : el.stroke}
          strokeWidth={el.strokeWidth || 6}
          dash={el.dash}
          lineCap="round"
          {...shadowProps(el.shadow)}
        />
      );
    case "arrow":
      return (
        <Arrow
          points={[0, el.height / 2, el.width - 2, el.height / 2]}
          stroke={el.stroke === "transparent" ? el.fill : el.stroke}
          fill={el.fill}
          strokeWidth={el.strokeWidth || 6}
          pointerLength={Math.max(16, el.height * 0.7)}
          pointerWidth={Math.max(16, el.height * 0.7)}
          lineCap="round"
          {...shadowProps(el.shadow)}
        />
      );
    case "heart":
      return (
        <Path
          data="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
          scaleX={el.width / 24}
          scaleY={el.height / 24}
          {...common}
          {...gradient}
        />
      );
    case "blob":
      return (
        <Path
          data="M50 3C74 3 97 17 97 48C97 79 76 97 50 97C24 97 3 79 3 48C3 17 26 3 50 3Z"
          scaleX={el.width / 100}
          scaleY={el.height / 100}
          {...common}
          {...gradient}
        />
      );
    default:
      return <Rect width={el.width} height={el.height} {...common} />;
  }
}

function IconNode({ el }: { el: IconElement }) {
  const image = useIconImage(el.icon, el.color, el.strokeWidth);
  if (!image) {
    return <Rect width={el.width} height={el.height} fill="rgba(0,0,0,0.04)" cornerRadius={8} />;
  }
  return (
    <KonvaImage
      image={image}
      width={el.width}
      height={el.height}
      {...shadowProps(el.shadow)}
    />
  );
}

function ImageNode({ el }: { el: ImageElement }) {
  const image = useCanvasImage(el.src);
  if (!image) {
    return (
      <Rect
        width={el.width}
        height={el.height}
        fill="#E9E4DB"
        cornerRadius={el.cornerRadius}
      />
    );
  }
  if (el.fit === "contain") {
    const size = containSize(image, el.width, el.height);
    return (
      <Group
        clipFunc={(ctx) =>
          roundedRectPath(
            ctx as unknown as CanvasRenderingContext2D,
            0,
            0,
            el.width,
            el.height,
            el.cornerRadius,
          )
        }
      >
        <Rect width={el.width} height={el.height} fill="transparent" />
        <KonvaImage
          image={image}
          x={(el.width - size.width) / 2}
          y={(el.height - size.height) / 2}
          width={size.width}
          height={size.height}
          {...shadowProps(el.shadow)}
        />
        {el.overlay ? (
          <Rect
            width={el.width}
            height={el.height}
            fill={el.overlay}
            opacity={el.overlayOpacity ?? 0.3}
          />
        ) : null}
      </Group>
    );
  }
  return (
    <Group
      clipFunc={(ctx) =>
        roundedRectPath(
          ctx as unknown as CanvasRenderingContext2D,
          0,
          0,
          el.width,
          el.height,
          el.cornerRadius,
        )
      }
    >
      <KonvaImage
        image={image}
        width={el.width}
        height={el.height}
        crop={coverCrop(image, el.width, el.height)}
        {...shadowProps(el.shadow)}
      />
      {el.overlay ? (
        <Rect
          width={el.width}
          height={el.height}
          fill={el.overlay}
          opacity={el.overlayOpacity ?? 0.3}
        />
      ) : null}
    </Group>
  );
}

function StickerNode({ el }: { el: StickerElement }) {
  return (
    <Text
      text={el.emoji}
      width={el.width}
      height={el.height}
      fontSize={Math.min(el.width, el.height) * 0.86}
      align="center"
      verticalAlign="middle"
      fontFamily='"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
      {...shadowProps(el.shadow)}
    />
  );
}

export default function ElementNode({
  el,
  listening = true,
  fontVersion,
}: {
  el: DesignElement;
  listening?: boolean;
  fontVersion?: number;
}) {
  return (
    <Group listening={listening}>
      {el.type === "text" ? <TextNode el={el} fontVersion={fontVersion} /> : null}
      {el.type === "shape" ? <ShapeNode el={el} /> : null}
      {el.type === "icon" ? <IconNode el={el} /> : null}
      {el.type === "image" ? <ImageNode el={el} /> : null}
      {el.type === "sticker" ? <StickerNode el={el} /> : null}
    </Group>
  );
}

export { roundedRectPath };
export type { Konva };
