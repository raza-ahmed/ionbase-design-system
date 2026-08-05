import React, { forwardRef } from 'react';

/**
 * Any component that renders an SVG element and accepts SVG props.
 *
 * Typed structurally rather than as lucide-react's `LucideIcon`, so the icon
 * set is the consumer's choice: lucide, heroicons, react-icons, a hand-rolled
 * SVG component. Naming one library in the type would have made it a
 * dependency of every install for the sake of a type that is erased at build
 * time.
 */
export type IconComponent = React.ComponentType<
  React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>
>;

/**
 * The `icon-size` ladder, verbatim.
 *
 * These map one-to-one onto the Semantics tokens `icon-size/2xs...xl`, so `md`
 * here and `icon-size/md` in Figma are the same 20px. There is no separate
 * decision being made in this file.
 *
 * BREAKING, AND DELIBERATELY SO — 2026-08-06
 *
 * A 14px rung was inserted, because the small Button's 16px icon out-weighted
 * its 14px label. 14 sits between the old `xs` 12 and `sm` 16, and this ladder
 * is indexed by value — a rung cannot be appended out of order without the
 * names ceasing to mean anything. So the ladder shifted down at the bottom:
 *
 *     2xs   12   <- was `xs`
 *     xs    14   <- new; the small Button reads this
 *     sm    16   unchanged
 *     md    20   unchanged
 *     lg    24   unchanged
 *     xl    32   unchanged
 *
 * `<Icon size="xs" />` therefore renders 14px where it used to render 12.
 * **This raises no type error** — `xs` is still a valid rung — so it will not
 * fail loudly anywhere. Callers who meant 12 now ask for `2xs`.
 *
 * `2xs` is not a new convention: `radius/2xs` already existed in Semantics.
 *
 * BREAKING, AND DELIBERATELY SO — the first time
 *
 * This used to be two sizes where `sm` was 16 and `md` was **24**. That made
 * `md` mean `icon-size/lg`, so the one word meant two different things
 * depending on whether you were reading code or Figma — the exact ambiguity the
 * ladder exists to remove. Callers who want the old `md` now ask for `lg`.
 *
 * Note what has changed since that entry was written: it said "nothing inside
 * the system depended on it", which held because Button and Tabs size their
 * icons in CSS from `--icon-size-*` rather than through this prop. That is
 * still true of the prop — but the CSS variables are now load-bearing in both
 * directions, so `avatar.css` had to move to `--icon-size-2xs` to stay at 12.
 */
const SIZE_TOKENS = {
  '2xs': 'var(--icon-size-2xs)',
  xs: 'var(--icon-size-xs)',
  sm: 'var(--icon-size-sm)',
  md: 'var(--icon-size-md)',
  lg: 'var(--icon-size-lg)',
  xl: 'var(--icon-size-xl)',
} as const;

export type IconSize = keyof typeof SIZE_TOKENS;

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  /**
   * The icon component to render, e.g. `import { Plus } from 'lucide-react'`.
   * Any SVG component works — the design system does not ship an icon set.
   */
  as: IconComponent;
  /**
   * A rung on the `icon-size` ladder — `2xs` 12, `xs` 14, `sm` 16, `md` 20,
   * `lg` 24, `xl` 32 — or any CSS length for a one-off. Omit to inherit the surrounding
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
 * Wrapper that applies the design system's icon sizing and accessibility
 * defaults to whatever icon component you hand it.
 *
 *   import { Plus } from 'lucide-react';
 *   <Icon as={Plus} size="sm" />
 *   <Icon as={Plus} label="Add item" />   // meaningful, gets an a11y name
 *
 * Takes the icon as a prop rather than re-exporting a set: a barrel of a
 * thousand-plus icons defeats tree-shaking in several bundlers, and pinning one
 * icon library would force it on every consumer. You import the one icon you
 * need, from whichever library you use, and it is the only one bundled.
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
