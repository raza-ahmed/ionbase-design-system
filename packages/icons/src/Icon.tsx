import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * The `icon-size` ladder, verbatim.
 *
 * These map one-to-one onto the Semantics tokens `icon-size/xs...xl`, so `md`
 * here and `icon-size/md` in Figma are the same 20px. There is no separate
 * decision being made in this file.
 *
 * BREAKING, AND DELIBERATELY SO
 *
 * This used to be two sizes where `sm` was 16 and `md` was **24**. That made
 * `md` mean `icon-size/lg`, so the one word meant two different things
 * depending on whether you were reading code or Figma — the exact ambiguity the
 * ladder exists to remove. Callers who want the old `md` now ask for `lg`.
 *
 * Nothing inside the system depended on it: Button and Tabs size their icons in
 * CSS from `--icon-size-*`, never through this prop.
 */
const SIZE_TOKENS = {
  xs: 'var(--icon-size-xs)',
  sm: 'var(--icon-size-sm)',
  md: 'var(--icon-size-md)',
  lg: 'var(--icon-size-lg)',
  xl: 'var(--icon-size-xl)',
} as const;

export type IconSize = keyof typeof SIZE_TOKENS;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  /** The Lucide icon to render, e.g. `import { Plus } from 'lucide-react'`. */
  as: LucideIcon;
  /**
   * A rung on the `icon-size` ladder — `xs` 12, `sm` 16, `md` 20, `lg` 24,
   * `xl` 32 — or any CSS length for a one-off. Omit to inherit the surrounding
   * font size, which is what lets an icon sit correctly inside a Button without
   * the Button having to know anything about this component.
   */
  size?: IconSize | (string & {});
  /**
   * Accessible name. Provide it when the icon carries meaning on its own — an
   * icon-only button, a status marker. Omit it for decoration next to a visible
   * label, and the icon is hidden from assistive tech instead of read out twice.
   */
  label?: string;
}

/**
 * Wrapper around a Lucide icon that applies the design system's sizing and
 * accessibility defaults.
 *
 * Takes the icon as a prop rather than re-exporting all 1,753 of them: a barrel
 * that large defeats tree-shaking in several bundlers, so consumers import the
 * one icon they need straight from `lucide-react` and it is the only one bundled.
 */
export const Icon = forwardRef<SVGSVGElement, IconProps>(
  ({ as: Component, size, label, className, ...rest }, ref) => {
    const resolved =
      size === undefined ? '1em' : (SIZE_TOKENS[size as IconSize] ?? size);

    return (
      <Component
        ref={ref}
        width={resolved}
        height={resolved}
        // Lucide strokes scale with the box; currentColor keeps the icon tied to
        // whatever text colour it sits in, so it themes for free.
        color="currentColor"
        className={['ion-icon', className].filter(Boolean).join(' ')}
        {...(label
          ? { role: 'img', 'aria-label': label }
          : { 'aria-hidden': true, focusable: false })}
        {...rest}
      />
    );
  },
);

Icon.displayName = 'Icon';
