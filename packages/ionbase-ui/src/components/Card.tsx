import React, { forwardRef, useId } from 'react';

/**
 * Which heading element the title renders as.
 *
 * `h1` is deliberately absent: a card is a section of a page, never the page's
 * own title.
 */
export type CardHeadingLevel = 2 | 3 | 4 | 5 | 6;

/** `danger` marks a card whose actions cannot be undone. */
export type CardIntent = 'default' | 'danger';

export interface CardProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'title'
> {
  /**
   * The card's heading. With a title the card is a `<section>` named by it;
   * without one it is a plain surface — a `<div>`, for skeletons and for
   * content that already has its own heading.
   */
  title?: React.ReactNode;
  /**
   * Heading element for the title. Defaults to `h2`: most cards are the
   * first level of section under the page's `h1`. The outline is the page's
   * decision, so it is a prop, not a constant.
   */
  headingLevel?: CardHeadingLevel;
  /** One line under the title — what the card holds or when changes apply. */
  description?: React.ReactNode;
  /**
   * One control at the end of the title row: a standalone Link ("All runs")
   * or a small Button. More than one belongs in the body.
   */
  action?: React.ReactNode;
  /** `danger` for a card of irreversible actions — the danger zone. */
  intent?: CardIntent;
  /**
   * Whether a titled card is a landmark. Defaults to `true`. Set `false`
   * when the card's only content is itself a landmark named by the same
   * words — a Table's scroll region — or the page gets two regions with one
   * name. The heading still renders; only the `<section>` becomes a `<div>`.
   */
  isRegion?: boolean;
  children?: React.ReactNode;
}

/**
 * Card — a bordered surface that groups one part of a page.
 *
 * Promoted from the demo app, where the same surface was hand-written as
 * `.demo-panel` in nine screens: a settings group, a chart panel, a runs log,
 * the danger zone. For a feature row with media use FullCard; for one
 * headline figure use StatTile.
 *
 * THE TITLE DECIDES THE ELEMENT
 *
 * A titled card is a `<section aria-labelledby>` — a named region, so a
 * screen reader user can jump between cards the way a sighted one scans
 * them. An untitled card is a `<div>`: a `<section>` with no name is not a
 * landmark at all, and pretending otherwise only adds noise.
 *
 * No `'use client'`: `useId` resolves on the server, and nothing here is
 * interactive. Interactive parts arrive through `action` and `children`.
 */
export const Card = forwardRef<HTMLElement, CardProps>(
  (
    {
      title,
      headingLevel = 2,
      description,
      action,
      intent = 'default',
      isRegion = true,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const titleId = useId();
    const Heading = `h${headingLevel}` as const;
    const hasTitle = title != null && title !== false;
    const Root = hasTitle && isRegion ? 'section' : 'div';

    return (
      <Root
        {...rest}
        ref={ref as React.Ref<HTMLDivElement>}
        aria-labelledby={
          Root === 'section'
            ? (rest['aria-labelledby'] ?? titleId)
            : rest['aria-labelledby']
        }
        className={[
          'ion-card',
          intent === 'danger' && 'ion-card--danger',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {(hasTitle || action) && (
          <div className="ion-card__header">
            {hasTitle && (
              <div className="ion-card__heading">
                <Heading id={titleId} className="ion-card__title">
                  {title}
                </Heading>
                {description && (
                  <p className="ion-card__description">{description}</p>
                )}
              </div>
            )}
            {action && <div className="ion-card__action">{action}</div>}
          </div>
        )}
        {children}
      </Root>
    );
  },
);

Card.displayName = 'Card';
