import React, { forwardRef } from 'react';
import type { AvatarSize } from './Avatar.js';

/**
 * Figma's `Color` axis. Seven hues plus `light`, and every one of them is a
 * `--color-<hue>-500` -> `--color-<hue>-600` pair — the gradient needed no new
 * token, which is the tell that it was drawn from the palette rather than
 * beside it.
 */
export type AvatarGradientColor =
  'slate' | 'blue' | 'violet' | 'pink' | 'orange' | 'green' | 'red' | 'light';

export interface AvatarGradientProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Matches the Figma `Size` variant: Mini 24, Small 32, Medium 40, Large 48. */
  size?: AvatarSize;
  /** Matches the Figma `Color` variant. */
  color?: AvatarGradientColor;
  /** The two letters. Figma's `Initials`. */
  initials?: string;
  /**
   * Describes the person, not the picture — "Ada Lovelace", not "avatar".
   * Without it the initials are announced as the letters they are, which is
   * not a name.
   */
  alt?: string;
}

/**
 * AvatarGradient is Avatar's initials-only sibling: a lit, bevelled disc for
 * people who have no photo.
 *
 * IT IS A SEPARATE COMPONENT BECAUSE FIGMA DRAWS A SEPARATE COMPONENT, AND THE
 * AXES ARE THE ARGUMENT
 *
 * It has `Color`, which Avatar does not. It has no `Shape`, because a gradient
 * this directional only reads on a circle. It has no `Type`, because there is
 * no image and no icon to fall back to — the initials are the whole content.
 * Folding it into Avatar would mean a `color` prop that does nothing on three
 * of Avatar's four states and a `shape` prop that this one has to reject.
 *
 * There is no `icon` and no `src` fallback here on purpose. If you have a
 * photo, or nothing at all to put in the circle, that is `Avatar`.
 */
export const AvatarGradient = forwardRef<HTMLSpanElement, AvatarGradientProps>(
  (
    { size = 'md', color = 'slate', initials, alt, className, ...rest },
    ref,
  ) => {
    const classNames = [
      'ion-avatar-gradient',
      size !== 'md' ? `ion-avatar-gradient--${size}` : '',
      `ion-avatar-gradient--${color}`,
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    const label = alt ?? initials;

    return (
      <span
        {...rest}
        ref={ref}
        className={classNames}
        // Same call Avatar makes: there is no <img> to carry the name, so the
        // box does. Initials alone read as nonsense to a screen reader.
        {...(label ? { role: 'img', 'aria-label': label } : {})}
      >
        {initials ? <span aria-hidden="true">{initials}</span> : null}
      </span>
    );
  },
);

AvatarGradient.displayName = 'AvatarGradient';
