/**
 * What the Foundations pages share: reading a token's value as the browser
 * resolves it, in either theme, and measuring contrast between two of them.
 *
 * Nothing on those pages is typed out by hand. The token names come from
 * `tokens` in ionbase-ui, which is generated from the Figma variables, and
 * the values are read from the live stylesheet. A token added in Figma shows
 * up on its page at the next build, and a value changed there shows its new
 * value; neither can drift.
 */
import React, { useLayoutEffect, useRef, useState } from 'react';

export type Theme = 'light' | 'dark';
export const THEMES: Theme[] = ['light', 'dark'];

/** `var(--text-default)` → `--text-default`. */
export const cssVar = (reference: string) => reference.slice(4, -1);

export type Resolved = Record<Theme, Record<string, string>>;

/**
 * The value each custom property resolves to in each theme, read from two
 * hidden elements, one per theme, that the page renders (`probes`). Read
 * after layout, so `values` is null on the first render.
 */
export function useTokenValues(properties: string[]) {
  const light = useRef<HTMLSpanElement>(null);
  const dark = useRef<HTMLSpanElement>(null);
  const [values, setValues] = useState<Resolved | null>(null);
  const key = properties.join(' ');
  useLayoutEffect(() => {
    const read = (el: HTMLElement) => {
      const style = getComputedStyle(el);
      return Object.fromEntries(
        properties.map((p) => [p, style.getPropertyValue(p).trim()]),
      );
    };
    setValues({ light: read(light.current!), dark: read(dark.current!) });
  }, [key]);
  const probes = (
    <>
      <span ref={light} data-theme="light" hidden />
      <span ref={dark} data-theme="dark" hidden />
    </>
  );
  return { values, probes };
}

/* ---------------------------------------------------------------- contrast */

type RGBA = [number, number, number, number];

/** `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` and `rgba()`, as the tokens write them. */
export function parseColour(value: string): RGBA | null {
  const v = value.trim().toLowerCase();
  if (v === 'transparent') return [0, 0, 0, 0];
  const hex = v.match(/^#([0-9a-f]{3,8})$/)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    const n = (i: number) => parseInt(full.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), full.length === 8 ? n(6) / 255 : 1];
  }
  const fn = v.match(/^rgba?\(([^)]+)\)$/)?.[1];
  if (fn) {
    const parts = fn.split(/[\s,/]+/).filter(Boolean);
    const alpha = parts[3]
      ? parts[3].endsWith('%')
        ? parseFloat(parts[3]) / 100
        : parseFloat(parts[3])
      : 1;
    return [+parts[0], +parts[1], +parts[2], alpha];
  }
  return null;
}

/** A translucent colour as it shows on an opaque one. */
const over = ([r, g, b, a]: RGBA, [R, G, B]: RGBA): RGBA => [
  r * a + R * (1 - a),
  g * a + G * (1 - a),
  b * a + B * (1 - a),
  1,
];

const luminance = ([r, g, b]: RGBA) => {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/** WCAG 2 contrast of a foreground on a background, or null if either is unreadable. */
export function contrast(foreground: string, background: string) {
  const fg = parseColour(foreground);
  const bg = parseColour(background);
  if (!fg || !bg) return null;
  const solid = over(fg, bg);
  const [hi, lo] = [luminance(solid), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------------------------------------------------------------- layout */

/** A page section: a heading and a sentence on what the group is for. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = `section-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section
      aria-labelledby={id}
      style={{ marginBlockEnd: 'var(--spacing-48)' }}
    >
      <h2
        id={id}
        className="ion-text-h5"
        style={{ marginBlockEnd: 'var(--spacing-8)' }}
      >
        {title}
      </h2>
      {description && (
        <p
          className="ion-text-body-sm"
          style={{
            color: 'var(--text-secondary)',
            marginBlockEnd: 'var(--spacing-16)',
            maxInlineSize: '44rem',
          }}
        >
          {description}
        </p>
      )}
      {children}
    </section>
  );
}

/** A token's CSS name, in the code face, as it is written in a stylesheet. */
export function TokenName({ children }: { children: string }) {
  return (
    <code
      style={{
        fontFamily: 'var(--font-family-mono)',
        fontSize: 'var(--font-size-12)',
      }}
    >
      {children}
    </code>
  );
}

/** A value, quieter than the name. */
export function Value({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily: 'var(--font-family-mono)',
        fontSize: 'var(--font-size-12)',
        color: 'var(--text-tertiary)',
      }}
    >
      {children}
    </code>
  );
}
