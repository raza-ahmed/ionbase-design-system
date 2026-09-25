import React, { Children, cloneElement, isValidElement } from 'react';

export type DescriptionListLayout = 'horizontal' | 'stacked' | 'row';

export interface DescriptionListProps extends Omit<
  React.HTMLAttributes<HTMLDListElement>,
  'children'
> {
  /**
   * `horizontal` (default): term beside its value, for a record's details —
   * it stacks when the list is narrower than 24rem. `stacked`: term above
   * value, one pair per line, for a narrow column. `row`: stacked pairs side
   * by side at their own width, wrapping when out of room — a strip of
   * short facts under a heading.
   */
  layout?: DescriptionListLayout;
  /**
   * What an empty value is read as. It is shown as "—", which a screen
   * reader reads as "dash" or not at all. Default "Not set" — pass the
   * translation.
   */
  emptyText?: string;
  /** DescriptionListItem children. */
  children: React.ReactNode;
}

export interface DescriptionListItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** The label — "Owner", "Started". Rendered as the `<dt>`. */
  term: React.ReactNode;
  /**
   * The value, rendered as the `<dd>`. `null`, `undefined`, `false` or ''
   * render as an empty value: "—" to the eye, `emptyText` to a reader.
   */
  children?: React.ReactNode;
  /** Set by the DescriptionList; pass it here only to override one item. */
  emptyText?: string;
}

const isEmpty = (v: React.ReactNode) =>
  v === null || v === undefined || v === false || v === '';

/**
 * DescriptionList — label–value pairs: a record's details, a settings
 * summary, a review step.
 *
 * WHY `<dl>` AND NOT A TABLE OR A GRID OF DIVS
 *
 * A `<dl>` is the element for name–value groups, and a screen reader says
 * so: it announces a list with its count, and reads each term with its
 * value. A two-column table claims rows and columns that nobody compares
 * down; a grid of `<div>`s says nothing at all, so "Owner" and "Priya Shah"
 * arrive as two unrelated lines. Each pair is wrapped in a `<div>`, which
 * HTML allows inside a `<dl>`, so the layouts can style a pair as a unit.
 *
 * EMPTY IS SAID, NOT DRAWN ONLY
 *
 * An unset value is shown as an em dash — the convention every record page
 * uses — but "—" is read as "dash", or skipped, depending on the reader.
 * The dash is hidden from assistive technology and `emptyText` is read in
 * its place, so "Last run: Not set" is heard where "Last run: —" is seen.
 */
export function DescriptionList({
  layout = 'horizontal',
  emptyText = 'Not set',
  className,
  children,
  ...rest
}: DescriptionListProps) {
  return (
    <dl
      {...rest}
      className={[
        'ion-description-list',
        `ion-description-list--${layout}`,
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/*
          Handed to each item as a prop, not through context: context would
          make this a client component, and a list of values has no reason
          to be one. Items are direct children, as the contract requires.
        */}
      {Children.map(children, (child) =>
        isValidElement<DescriptionListItemProps>(child) &&
        child.props.emptyText === undefined
          ? cloneElement(child, { emptyText })
          : child,
      )}
    </dl>
  );
}

DescriptionList.displayName = 'DescriptionList';

export function DescriptionListItem({
  term,
  children,
  emptyText = 'Not set',
  className,
  ...rest
}: DescriptionListItemProps) {
  const empty = isEmpty(children);
  return (
    <div
      {...rest}
      className={['ion-description-list__item', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <dt className="ion-description-list__term">{term}</dt>
      <dd
        className={[
          'ion-description-list__value',
          empty ? 'ion-description-list__value--empty' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {empty ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="ion-visually-hidden">{emptyText}</span>
          </>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}

DescriptionListItem.displayName = 'DescriptionListItem';
