import React, { forwardRef } from 'react';

export type FullCardAlignment = 'right' | 'left';

/**
 * Which heading element the headline renders as.
 *
 * `h1` is deliberately absent: a full card is a section within a page, never
 * the page's own title.
 */
export type FullCardHeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface FullCardProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'title'
> {
  /**
   * Which side the media panel sits on. Matches Figma's `Alignment` variant,
   * whose `Right` / `Left` name the media, not the text.
   */
  alignment?: FullCardAlignment;
  /** Figma's `Eyebrow` slot — a Badge in the design, but any node works. */
  eyebrow?: React.ReactNode;
  /** Figma's `Headline`. Required: a card with no headline has no accessible name. */
  headline: React.ReactNode;
  /** Figma's `Description`. */
  description?: React.ReactNode;
  /** Figma's `Actions` slot — a secondary Button in the design. */
  actions?: React.ReactNode;
  /**
   * Figma's `Media` slot. Rendered inside the framed screen holder, so pass
   * the screenshot or embed itself, not the frame.
   */
  media?: React.ReactNode;
  /**
   * Heading element for the headline. Defaults to `h3`, matching the `Type/H3`
   * text style Figma applies — but the level is a document-outline decision
   * only the page knows, so it is a prop rather than a constant.
   */
  headingLevel?: FullCardHeadingLevel;
  children?: React.ReactNode;
}

/**
 * Full Card — the full-bleed case study row from Figma `Full Card` (592:857).
 *
 * A text column beside a framed media panel, split down the middle, mirrored
 * by the `Alignment` variant.
 *
 * The split holds from 1080 and stacks below it, media above content in BOTH
 * alignments — `Alignment` names a horizontal side and
 * stops meaning anything once there is one column, so it does not get to
 * decide the vertical order too. Size is a media query, not a prop, the same
 * call Header makes about Device.
 *
 * WHY THE `show*` BOOLEANS ARE GONE
 *
 * Figma carries `Show Eyebrow`, `Show Description` and `Show Actions` beside
 * the slots they gate, because a Figma component instance always holds every
 * layer and needs a switch to hide one. React has no such constraint — an
 * absent prop is the switch. Badge made the same call with `Show Dot`, and
 * keeping both would have let `showActions` and `actions` disagree.
 *
 * `headline` is required, and it is the only required prop. The heading is
 * what makes this a section rather than a decorated div, and every other part
 * of the card is optional in Figma too.
 *
 * No `'use client'`: nothing here is stateful or interactive. The interactive
 * parts arrive through `actions`, and they carry their own boundary.
 */
export const FullCard = forwardRef<HTMLElement, FullCardProps>(
  (
    {
      alignment = 'right',
      eyebrow,
      headline,
      description,
      actions,
      media,
      headingLevel = 3,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const Heading = `h${headingLevel}` as const;

    return (
      <section
        {...rest}
        ref={ref}
        className={[
          'ion-full-card',
          `ion-full-card--media-${alignment}`,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/*
         * Content is first in the DOM in every layout. CSS reverses the row for
         * `media-left` and the column when stacked, so reading and focus order
         * stay headline → actions → media whichever way the card is arranged —
         * which is the order the content actually means.
         */}
        <div className="ion-full-card__content">
          <div className="ion-full-card__body">
            {eyebrow && <div className="ion-full-card__eyebrow">{eyebrow}</div>}
            <Heading className="ion-full-card__headline">{headline}</Heading>
            {description && (
              <p className="ion-full-card__description">{description}</p>
            )}
            {actions && <div className="ion-full-card__actions">{actions}</div>}
            {children}
          </div>
        </div>

        {/*
         * Three nested elements because the design frames the media three
         * times: the half-width column, the sunken 8px mat with the 32 radius,
         * and the white screen holder with the 24 radius inside it. Collapsing
         * any two loses the double-radius inset that gives the panel its depth.
         */}
        <div className="ion-full-card__media">
          <div className="ion-full-card__media-mat">
            <div className="ion-full-card__media-frame">
              <div className="ion-full-card__media-screen">{media}</div>
            </div>
          </div>
        </div>
      </section>
    );
  },
);

FullCard.displayName = 'FullCard';
