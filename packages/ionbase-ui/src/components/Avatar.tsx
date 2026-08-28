'use client';

import React, { forwardRef, useState } from 'react';

export type AvatarSize = 'mini' | 'sm' | 'md' | 'lg';
export type AvatarShape = 'circle' | 'square';

/**
 * The intents Figma's `Status Indicator` draws. Same six words as `BadgeIntent`
 * and `AlertIntent`, and deliberately so — an indicator is the smallest way this
 * system says "success", and it should not say it differently here.
 */
export type AvatarIndicatorIntent =
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'information';

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
  /** Figma's `Show Ring` — a 1px/2px brand ring drawn inside the avatar's edge. */
  ring?: boolean;
  /**
   * Figma's `Show Top Indicator`, as the intent of the `Status Indicator`
   * instance it holds. Top-right, and it carries a glyph: this is the corner
   * that says something was verified or requested, not who is online.
   */
  topIndicator?: AvatarIndicatorIntent;
  /** Replaces the top indicator's default check glyph. */
  topIndicatorIcon?: React.ReactNode;
  /** Names the top indicator for assistive tech. Without it the mark is decorative. */
  topIndicatorLabel?: string;
  /**
   * Figma's `Show Bottom Indicator`. Bottom-right and glyphless — the presence
   * dot.
   */
  bottomIndicator?: AvatarIndicatorIntent;
  /** Names the bottom indicator for assistive tech. Colour alone is not a status. */
  bottomIndicatorLabel?: string;
}

/**
 * Figma's check, from the `Status Indicator` icon slot. Inlined for the same
 * reason as Checkbox's mark: it is part of the indicator, not a slot a caller
 * fills — and a caller who wants a different glyph passes `topIndicatorIcon`.
 */
const IndicatorCheck = () => (
  <svg viewBox="0 0 11 11" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M8.53878 2.70544C8.7015 2.54272 8.96525 2.54272 9.12797 2.70544C9.29063 2.86816 9.29067 3.13193 9.12797 3.29463L4.54464 7.87796C4.38194 8.04065 4.11817 8.04061 3.95545 7.87796L1.87211 5.79463C1.7094 5.63192 1.70941 5.36816 1.87211 5.20544C2.03483 5.04272 2.29859 5.04272 2.46131 5.20544L4.25004 6.99417L8.53878 2.70544Z"
      fill="currentColor"
    />
  </svg>
);

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
 *
 * THE MEDIA IS A CHILD, AND IT HAS TO BE
 *
 * The box that clips the image is `.ion-avatar__media`, not the root. The root
 * cannot clip: a corner indicator sits outside a circle's clip path and would
 * be sliced in half by the `overflow: hidden` that crops the photo. Figma
 * draws exactly this — an unclipped frame holding a clipped `Media` child and
 * the indicators as its siblings.
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
      ring = false,
      topIndicator,
      topIndicatorIcon,
      topIndicatorLabel,
      bottomIndicator,
      bottomIndicatorLabel,
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
      // Figma's Image variant sits on surface/placeholder behind a border/subtle
      // rather than the muted surface the other two use. It follows what is
      // actually painted, so a 404 that falls back to initials looks like the
      // Character variant it became.
      showImage ? 'ion-avatar--image' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    const name = alt ?? initials;
    const indicatorNames = [topIndicatorLabel, bottomIndicatorLabel].filter(
      Boolean,
    );

    /*
     * WHERE THE INDICATOR'S NAME GOES DEPENDS ON WHETHER THERE IS AN IMAGE, AND
     * THAT IS NOT AN INCONSISTENCY.
     *
     * With no image the root takes `role="img"`, which makes it a leaf: nothing
     * inside it is exposed, so hidden text in an indicator would be announced
     * to nobody. The names have to be folded into the root's own label.
     *
     * With an image the root has no role and the `<img>` carries the name, so
     * the indicators can say their own piece as visually hidden text.
     */
    const rootLabel = [name, ...indicatorNames].filter(Boolean).join(', ');

    const renderIndicator = (
      place: 'top' | 'bottom',
      intent: AvatarIndicatorIntent,
      label: string | undefined,
      children: React.ReactNode,
    ) => (
      <span
        className={`ion-avatar__indicator ion-avatar__indicator--${place} ion-avatar__indicator--${intent}`}
        {...(label && showImage ? {} : { 'aria-hidden': true })}
      >
        {children}
        {label && showImage ? (
          <span className="ion-visually-hidden">{label}</span>
        ) : null}
      </span>
    );

    return (
      <span
        {...rest}
        ref={ref}
        className={classNames}
        // With no image there is no <img> to carry the name, so the box itself
        // does. Initials alone read as nonsense without it.
        {...(!showImage && rootLabel
          ? { role: 'img', 'aria-label': rootLabel }
          : {})}
      >
        <span className="ion-avatar__media">
          {showImage ? (
            <img
              className="ion-avatar__image"
              src={src}
              alt={name ?? ''}
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

        {ring ? <span className="ion-avatar__ring" aria-hidden="true" /> : null}

        {topIndicator
          ? renderIndicator(
              'top',
              topIndicator,
              topIndicatorLabel,
              topIndicatorIcon ?? <IndicatorCheck />,
            )
          : null}

        {bottomIndicator
          ? renderIndicator(
              'bottom',
              bottomIndicator,
              bottomIndicatorLabel,
              null,
            )
          : null}
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
