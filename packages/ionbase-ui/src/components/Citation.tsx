import React, { forwardRef } from 'react';

export interface CitationProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'children'
> {
  /** The marker shown inline — usually a number matching the footer list. */
  index: number | string;
  /**
   * What is being cited. Required: it is the link's accessible name, and a
   * citation a reader cannot identify without following it is not attribution.
   */
  source: string;
  /** Where it goes. Omit for a source with no address — a document, a call. */
  href?: string;
}

export interface CitationListProps extends React.OlHTMLAttributes<HTMLOListElement> {
  children?: React.ReactNode;
  /** Heading above the list. Rendered as plain text, not a heading element. */
  label?: React.ReactNode;
}

export interface CitationListItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  index: number | string;
  source: string;
  href?: string;
  /** The quoted or summarised passage this citation supports. */
  children?: React.ReactNode;
}

/**
 * Citation — the inline marker.
 *
 * THE MARKER IS NOT THE NAME. Rendered naively, a superscript "1" announces as
 * "link, 1", which tells a screen-reader user nothing about whether to follow
 * it. The visible marker stays a number; the accessible name is
 * "Source 1: <source>". The number is for the sighted reader's eye and the
 * sentence is for everyone.
 *
 * NOT A TOOLTIP. A tooltip cannot be reached on touch and closes on the way to
 * it; attribution has to survive both. It is a real link, or a real
 * non-interactive marker when there is nowhere to go.
 *
 * WITHOUT `href` IT IS NOT A LINK. A citation to a phone call or an internal
 * document has no address, and rendering a dead anchor for it puts an
 * unfollowable link in the page's link list. It becomes a plain marked-up
 * reference instead.
 */
export const Citation = forwardRef<HTMLAnchorElement, CitationProps>(
  ({ index, source, href, className, ...rest }, ref) => {
    const name = `Source ${index}: ${source}`;
    const classes = ['ion-citation', className].filter(Boolean).join(' ');

    if (!href) {
      return (
        <span className={classes} role="note" aria-label={name}>
          <span aria-hidden="true">{index}</span>
        </span>
      );
    }

    return (
      <a {...rest} ref={ref} href={href} className={classes} aria-label={name}>
        <span aria-hidden="true">{index}</span>
      </a>
    );
  },
);

Citation.displayName = 'Citation';

/**
 * The footer list. An `<ol>` so the numbering is structural rather than typed
 * into each row, and so a screen reader can say how many sources there are
 * before the reader commits to hearing them.
 */
export const CitationList = forwardRef<HTMLOListElement, CitationListProps>(
  ({ children, label = 'Sources', className, ...rest }, ref) => (
    <div className="ion-citation-list">
      {label && <p className="ion-citation-list__label">{label}</p>}
      <ol
        {...rest}
        ref={ref}
        className={['ion-citation-list__items', className]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </ol>
    </div>
  ),
);

CitationList.displayName = 'CitationList';

export const CitationListItem = forwardRef<
  HTMLLIElement,
  CitationListItemProps
>(({ index, source, href, children, className, ...rest }, ref) => (
  <li
    {...rest}
    ref={ref}
    className={['ion-citation-list__item', className].filter(Boolean).join(' ')}
  >
    <span className="ion-citation-list__marker" aria-hidden="true">
      {index}
    </span>
    <span className="ion-citation-list__body">
      {href ? (
        <a className="ion-citation-list__source" href={href}>
          {source}
        </a>
      ) : (
        <span className="ion-citation-list__source">{source}</span>
      )}
      {children && (
        <span className="ion-citation-list__passage">{children}</span>
      )}
    </span>
  </li>
));

CitationListItem.displayName = 'CitationListItem';
