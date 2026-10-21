"use client";

import { useEffect, useState } from "react";

import { ChevronDown } from "lucide-react";

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="inspector-section">
      <div className="section-label">
        <span>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[10px] leading-snug text-[var(--muted-2)]">{hint}</p> : null}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  unit,
  disabled,
}: {
  label: string;
  value?: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  unit?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(Math.round(value * 100) / 100));
  useEffect(() => {
    setDraft(value == null ? "" : String(Math.round(value * 100) / 100));
  }, [value]);
  return (
    <div className="number-field" title={label}>
      <span>{suffix ?? label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={value == null ? "—" : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          const next = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(next)) {
            let clamped = next;
            if (min != null) clamped = Math.max(min, clamped);
            if (max != null) clamped = Math.min(max, clamped);
            onChange(clamped);
          }
        }}
        onBlur={() => setDraft(value == null ? "" : String(Math.round(value * 100) / 100))}
        aria-label={label}
      />
      {unit ? <span className="number-unit">{unit}</span> : null}
    </div>
  );
}

export const SWATCHES = [
  "#17161A", "#3D3A42", "#78747F", "#B8B4BC", "#FFFFFF", "#F6EFE4",
  "#E9DCC9", "#B08968", "#FFE066", "#FF5A36", "#FF8A5C", "#FF8FB1",
  "#E5484D", "#8B5CF6", "#2F6FED", "#57C4E5", "#0E7C66", "#22A06B",
  "#D7F75B", "#9BD4C3", "#D9D2FF", "#F2C4CE", "#C7E8F5", "#101828",
];

export function ColorField({
  label,
  value,
  onChange,
  allowTransparent = false,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
}) {
  const isTransparent = !value || value === "transparent";
  const color = isTransparent ? "#000000" : value.startsWith("#") ? value : "#000000";
  const [hexDraft, setHexDraft] = useState(isTransparent ? "transparent" : color);
  useEffect(() => {
    setHexDraft(isTransparent ? "transparent" : color.toUpperCase());
  }, [color, isTransparent]);
  return (
    <div className="field">
      <label className="label">{label}</label>
      <div className="color-control">
        <label
          className="color-swatch"
          style={{
            backgroundImage: isTransparent
              ? "linear-gradient(45deg,#e5e1da 25%,transparent 25%,transparent 75%,#e5e1da 75%),linear-gradient(45deg,#e5e1da 25%,transparent 25%,transparent 75%,#e5e1da 75%)"
              : undefined,
            backgroundSize: isTransparent ? "8px 8px" : undefined,
            backgroundPosition: isTransparent ? "0 0, 4px 4px" : undefined,
          }}
          title="Pick a color"
        >
          <span
            className="color-swatch-inner"
            style={{ background: isTransparent ? "transparent" : color }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label={`${label} color`}
          />
        </label>
        <input
          className="color-hex"
          value={hexDraft}
          onChange={(e) => {
            const next = e.target.value;
            setHexDraft(next);
            const trimmed = next.trim();
            if (/^#[0-9a-fA-F]{3}$/.test(trimmed) || /^#[0-9a-fA-F]{6}$/.test(trimmed)) {
              onChange(trimmed.toUpperCase());
            } else if (trimmed.toLowerCase() === "transparent") {
              onChange("transparent");
            }
          }}
          onBlur={() => setHexDraft(isTransparent ? "transparent" : color.toUpperCase())}
          aria-label={`${label} hex value`}
        />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {allowTransparent ? (
          <button
            type="button"
            className={`swatch ${isTransparent ? "is-active" : ""}`}
            style={{ background: "repeating-linear-gradient(45deg,#ddd 0 4px,#fff 4px 8px)" }}
            onClick={() => onChange("transparent")}
            title="No fill"
          />
        ) : null}
        {SWATCHES.slice(0, 18).map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${value?.toUpperCase() === c ? "is-active" : ""}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value?: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? min}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="slider-value">{format ? format(value ?? min) : Math.round((value ?? min) * 100) / 100}</span>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value?: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div className="field">
      {label ? <label className="label">{label}</label> : null}
      <div className="segmented">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            title={o.title}
            className={value === o.value ? "is-active" : ""}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <div className="relative">
        <select
          className="select appearance-none pr-8"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
        />
      </div>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-1.5 text-left"
    >
      <span className="text-[12px] font-medium">{label}</span>
      <span
        className={`relative h-[18px] w-[32px] rounded-full transition-colors ${
          checked ? "bg-[var(--ink)]" : "bg-[var(--line-strong)]"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all ${
            checked ? "left-[16px]" : "left-[2px]"
          }`}
        />
      </span>
    </button>
  );
}

export function ColorSwatchesInline({
  value,
  onChange,
  colors = SWATCHES,
}: {
  value?: string;
  onChange: (c: string) => void;
  colors?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className={`swatch ${value?.toUpperCase() === c.toUpperCase() ? "is-active" : ""}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          title={c}
        />
      ))}
    </div>
  );
}
