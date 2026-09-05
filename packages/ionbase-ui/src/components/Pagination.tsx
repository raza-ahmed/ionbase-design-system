'use client';

import React, { forwardRef, useRef } from 'react';
import { useHover, useFocusRing, mergeProps } from 'react-aria';
import { Select } from './Select.js';

export type PaginationType = 'numbered' | 'simple';
export type PaginationSize = 'sm' | 'md' | 'lg';

export interface PaginationProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'onChange'
> {
  /** The current page, 1-based. */
  page: number;
  /** Total number of pages. One or more. */
  pageCount: number;
  /** Called with the requested page. Not called for the current page. */
  onPageChange?: (page: number) => void;
  /** Matches the Figma `Type` variant. */
  type?: PaginationType;
  /** Matches the Figma `Size` variant. */
  size?: PaginationSize;
  /**
   * How many pages to show either side of the current one. The first and last
   * are always shown, so the widest run is `siblingCount * 2 + 5`.
   */
  siblingCount?: number;
  /** Renders the rows-per-page control. Matches the Figma `Show Page Size`. */
  showPageSize?: boolean;
  /** Current rows-per-page value. Required when `showPageSize`. */
  pageSize?: number;
  /** Options offered by the rows-per-page control. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

/**
 * Which page numbers to draw, and where the runs are broken.
 *
 * Module-scoped, deliberately not in the public barrel: it is this component's
 * internal logic, not API, and every public export owes an intent file. The
 * failure mode it guards is a pager that renders a gap marker with nothing behind it
 * — an ellipsis standing in for exactly one page, which is both a lie and a
 * cell the user cannot click to reach a page they can see the number of.
 *
 * The rule that prevents it: a gap is only drawn where it replaces TWO or more
 * pages. `left > 2` rather than `left > 1`, and the mirror on the right.
 */
export function pageItems(
  page: number,
  pageCount: number,
  siblingCount = 1,
): Array<number | 'gap'> {
  const total = Math.max(1, Math.floor(pageCount));
  const current = Math.min(Math.max(1, Math.floor(page)), total);
  const siblings = Math.max(0, Math.floor(siblingCount));

  // first + last + current + 2 siblings + 2 gap markers
  const widest = siblings * 2 + 5;
  if (total <= widest) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  // A gap must swallow at least two pages, or it is wider than what it hides.
  const gapLeft = left > 2;
  const gapRight = right < total - 1;

  const out: Array<number | 'gap'> = [1];
  if (gapLeft) out.push('gap');
  // Page 2 and page total-1 are drawn directly when no gap covers them.
  for (
    let p = gapLeft ? left : 2;
    p <= (gapRight ? right : total - 1);
    p += 1
  ) {
    if (p !== 1 && p !== total) out.push(p);
  }
  if (gapRight) out.push('gap');
  out.push(total);
  return out;
}

/**
 * One cell. `useHover` and `useFocusRing` rather than `:hover` / `:focus` for
 * the reason Button and Tabs give: native hover latches after a tap on touch,
 * and a focus ring must tell keyboard focus from pointer focus.
 */
function Cell({
  children,
  label,
  selected,
  disabled,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <button
      {...mergeProps(hoverProps, focusProps)}
      ref={ref}
      type="button"
      className="ion-pagination__item"
      aria-label={label}
      // The current page is announced by aria-current, not by aria-pressed:
      // this is navigation within a set, not a toggle.
      aria-current={selected ? 'page' : undefined}
      disabled={disabled}
      onClick={disabled ? undefined : onPress}
      data-selected={selected || undefined}
      data-hovered={isHovered || undefined}
      data-focused={isFocusVisible || undefined}
      data-disabled={disabled || undefined}
    >
      {children}
    </button>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      className="ion-pagination__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}

/**
 * Page navigation for a table or list.
 *
 * Geometry from the Figma `Pagination` (1291:503) and `Pagination Item`
 * (1283:289) components. The Figma item set is not exported — a caller places a
 * Pagination, never a cell.
 */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  function Pagination(
    {
      page,
      pageCount,
      onPageChange,
      type = 'numbered',
      size = 'md',
      siblingCount = 1,
      showPageSize = false,
      pageSize,
      pageSizeOptions = [10, 25, 50, 100],
      onPageSizeChange,
      className,
      ...rest
    },
    ref,
  ) {
    const total = Math.max(1, Math.floor(pageCount));
    const current = Math.min(Math.max(1, Math.floor(page)), total);
    const go = (p: number) => {
      if (p !== current && p >= 1 && p <= total) onPageChange?.(p);
    };

    const classes = [
      'ion-pagination',
      size !== 'md' ? `ion-pagination--${size}` : '',
      showPageSize ? '' : 'ion-pagination--no-page-size',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const prev = (
      <Cell
        label="Go to previous page"
        disabled={current <= 1}
        onPress={() => go(current - 1)}
      >
        <Chevron direction="left" />
      </Cell>
    );
    const next = (
      <Cell
        label="Go to next page"
        disabled={current >= total}
        onPress={() => go(current + 1)}
      >
        <Chevron direction="right" />
      </Cell>
    );

    return (
      <nav
        {...rest}
        ref={ref}
        className={classes}
        aria-label={rest['aria-label'] ?? 'Pagination'}
      >
        {showPageSize && (
          <div className="ion-pagination__page-size">
            {/*
             * Figma draws this as a bare Select reading "10 per page" — the
             * option text carries the unit, so there is no visible label to
             * place. `aria-label` supplies the accessible name that the missing
             * visible label would have. Select owns its own id wiring, which is
             * why this is the component and not a raw <select>: two pagers on
             * one page must not collide on a hardcoded id.
             */}
            <Select
              size={size}
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              options={pageSizeOptions.map((n) => ({
                value: String(n),
                label: `${n} per page`,
              }))}
            />
          </div>
        )}

        {type === 'simple' ? (
          <div className="ion-pagination__controls">
            {prev}
            {/*
             * A live region, because the page changes without the surrounding
             * document changing: a sighted user sees the table redraw, and this
             * is the only thing that tells a screen-reader user it happened.
             */}
            <span className="ion-pagination__summary" aria-live="polite">
              Page {current} of {total}
            </span>
            {next}
          </div>
        ) : (
          <ul className="ion-pagination__controls">
            <li>{prev}</li>
            {pageItems(current, total, siblingCount).map((item, i) =>
              item === 'gap' ? (
                <li
                  // Two gaps can coexist, and neither has a page number to key
                  // on. Index is the identity here, and the list is static.
                  key={`gap-${i}`}
                  className="ion-pagination__ellipsis"
                  aria-hidden="true"
                >
                  &hellip;
                </li>
              ) : (
                <li key={item}>
                  <Cell
                    label={`Go to page ${item}`}
                    selected={item === current}
                    onPress={() => go(item)}
                  >
                    {item}
                  </Cell>
                </li>
              ),
            )}
            <li>{next}</li>
          </ul>
        )}
      </nav>
    );
  },
);
