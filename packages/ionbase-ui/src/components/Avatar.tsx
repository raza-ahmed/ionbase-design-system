'use client';

import React, { forwardRef, useState } from 'react';

export type AvatarSize = 'mini' | 'sm' | 'md' | 'lg';
export type AvatarShape = 'circle' | 'square';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Matches the Figma `Size` variant: Mini 24, Small 32, Medium 40, Large 48. */
  size?: AvatarSize;
  /** Matches the Figma `Shape` variant. */
  shape?: AvatarShape;
  /** Image source. Figma's `Type=Image`. */
  src?: string;
  /**
   * Describes the person, not the picture. Falls back to `initials` so the
   * avatar is never announced as an unlabelled image.
   */
  alt?: string;
  /** Figma's `Type=Character`. Rendered when there is no `src`, or when `src`
   *  fails to load. */
  initials?: string;
  /** Figma's `Type=Icon`. Rendered when there is neither `src` nor `initials`. */
  icon?: React.ReactNode;
}

/**
 * Avatar picks its content the way Figma's `Type` variant does, but by
 * precedence rather than by a prop: image, then initials, then icon. A caller
 * passing `src` and `initials` gets the image with the initials as its alt
 * fallback, which is what you want when the image 404s.
 *
 * A failed `src` falls through to initials (then icon) rather than leaving the
 * browser's broken-image glyph — that is why initials exist alongside `src`.
 *
 * It is a `<span>`, not a `<div>`, so it can sit inline beside text without the
 * caller fighting a block element.
 */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      size = 'md',
      shape = 'circle',
      src,
      alt,
      initials,
      icon,
      className,
      ...rest
    },
    ref,
  ) => {
    const [imgFailed, setImgFailed] = useState(false);
    // Reset failure when `src` changes — adjust state during render rather than
    // an effect, so a recovered URL shows the image on the same update.
    const [prevSrc, setPrevSrc] = useState(src);
    if (src !== prevSrc) {
      setPrevSrc(src);
      setImgFailed(false);
    }

    const showImage = Boolean(src) && !imgFailed;
    const classNames = [
      'ion-avatar',
      size !== 'md' ? `ion-avatar--${size}` : '',
      shape === 'circle' ? 'ion-avatar--circle' : '',
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
        // With no image there is no <img> to carry the name, so the box itself
        // does. Initials alone read as nonsense without it.
        {...(!showImage && label ? { role: 'img', 'aria-label': label } : {})}
      >
        {showImage ? (
          <img
            className="ion-avatar__image"
            src={src}
            alt={label ?? ''}
            onError={() => setImgFailed(true)}
          />
        ) : initials ? (
          <span aria-hidden="true">{initials}</span>
        ) : icon ? (
          <span className="ion-avatar__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </span>
    );
  },
);

Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
  /** Cap on avatars shown; the remainder becomes a `+N` overflow avatar. */
  max?: number;
  shape?: AvatarShape;
  children?: React.ReactNode;
}

/**
 * AvatarGroup overlaps its children by a quarter of the avatar size, matching
 * Figma's -6 / -8 / -10 / -12 gaps at Mini / Small / Medium / Large.
 *
 * Group defaults fill in `size` / `shape` only when a child Avatar has not set
 * them itself — an explicit child prop wins. Non-Avatar children are left
 * alone so `size`/`shape` are never pushed onto arbitrary DOM nodes.
 *
 * Children render in source order because that is Figma's stacking: each avatar
 * paints over the one before it, so the `+N` overflow ends up on top. Later
 * siblings paint later, so this needs no z-index.
 */
export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    { size = 'md', shape = 'circle', max, className, children, ...rest },
    ref,
  ) => {
    const items = React.Children.toArray(children).filter(React.isValidElement);
    const shown = max !== undefined ? items.slice(0, max) : items;
    const overflow = items.length - shown.length;

    const sized = shown.map((child, i) => {
      if (child.type !== Avatar) {
        return child.key != null
          ? child
          : React.cloneElement(child, { key: i });
      }

      const props = child.props as AvatarProps;
      return React.cloneElement(child as React.ReactElement<AvatarProps>, {
        size: props.size ?? size,
        shape: props.shape ?? shape,
        key: child.key ?? i,
      });
    });

    if (overflow > 0) {
      sized.push(
        <Avatar
          key="__overflow"
          size={size}
          shape={shape}
          initials={`+${overflow}`}
          alt={`${overflow} more`}
        />,
      );
    }

    return (
      <div
        {...rest}
        ref={ref}
        className={[
          'ion-avatar-group',
          `ion-avatar-group--${size}`,
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {sized}
      </div>
    );
  },
);

AvatarGroup.displayName = 'AvatarGroup';
