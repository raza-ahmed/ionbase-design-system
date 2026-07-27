import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon sizes that exist in the design.
 *
 * Deliberately only the two the Figma components actually use (Button renders
 * 16 at Small and 24 at Medium/Large). Adding a third is a design decision that
 * belongs in Figma as a token, not a number invented here — until then, pass a
 * CSS length to `size` for a one-off.
 */
const SIZE_TOKENS = {
  sm: 'var(--spacing-16)',
  md: 'var(--spacing-24)',
} as const;

export type IconSize = keyof typeof SIZE_TOKENS;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  /** The Lucide icon to render, e.g. `import { Plus } from 'lucide-react'`. */
  as: LucideIcon;
  /**
   * `sm` (16) or `md` (24), or any CSS length. Omit to inherit the surrounding
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
