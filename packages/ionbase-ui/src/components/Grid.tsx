import React, { forwardRef } from 'react';
import type { StackElement, StackGap } from './Stack.js';

/** The spacing scale — the same steps as Stack's gap. */
export type GridGap = StackGap;

/** Equal columns: how many. Twelve is the layout grid's own count. */
export type GridColumnCount = 1 | 2 | 3 | 4 | 5 | 6 | 12;

/** One column's share of the row, as in `2fr`. */
export type GridFraction = 1 | 2 | 3 | 4;

/**
 * The narrowest a column may be before the grid drops one — for tiles and
 * cards, whose count per row follows the space rather than a breakpoint.
 */
export type GridMinColumnWidth = 160 | 200 | 240 | 280 | 320 | 360;

/**
 * At which of the layout breakpoints a grid of fixed columns falls to one:
 * `tablet` at 1023px and below, `mobile` at 767px and below, `never` keeps
 * its columns on every screen.
 */
export type GridCollapse = 'tablet' | 'mobile' | 'never';

export type GridAlign = 'start' | 'center' | 'end' | 'stretch';

export interface GridProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * The columns: a count of equal ones (`3`), or each column's share
   * (`[2, 1]` — a main column twice its aside). Ignored when
   * `minColumnWidth` is set. Defaults to 2.
   */
  columns?: GridColumnCount | readonly GridFraction[];
  /**
   * Fill each row with as many columns as fit at this width or more, each
   * the same width. The count follows the space, so it needs no `collapse`.
   */
  minColumnWidth?: GridMinColumnWidth;
  /** Where fixed columns fall to one. Defaults to `mobile`. */
  collapse?: GridCollapse;
  /** Space between the columns and the rows, from the spacing scale. Defaults to 16. */
  gap?: GridGap;
  /** Space between the rows alone, when it differs from `gap`. */
  rowGap?: GridGap;
  /**
   * How a cell sits in its row. `stretch`, the default, makes every card in a
   * row the same height; `start` lets each keep its own.
   */
  align?: GridAlign;
  /** The element — a `ul` for a list of cards. Grid is layout only. */
  as?: StackElement;
  children?: React.ReactNode;
}

const track = (columns: GridProps['columns']) =>
  typeof columns === 'number'
    ? `repeat(${columns}, minmax(0, 1fr))`
    : (columns ?? [1, 1]).map((f) => `minmax(0, ${f}fr)`).join(' ');

/**
 * Grid — columns that line up across rows, gaps from the spacing scale.
 *
 * Where Stack lays things along one line, Grid keeps every row's columns
 * the same width: cards, stat tiles, a main column and its aside, a form in
 * two columns. Every track is `minmax(0, …)`, so one wide child — a table, a
 * long ID — cannot push the page sideways.
 *
 * LAYOUT ONLY. It has no role and adds none; pass `as` for the element that
 * means something. It renders on a server.
 */
export const Grid = forwardRef<HTMLElement, GridProps>(
  (
    {
      columns = 2,
      minColumnWidth,
      collapse = 'mobile',
      gap = 16,
      rowGap,
      align,
      as: Tag = 'div',
      className,
      style,
      children,
      ...rest
    },
    ref,
  ) => (
    <Tag
      ref={ref as React.Ref<never>}
      {...rest}
      className={[
        'ion-grid',
        minColumnWidth ? 'ion-grid--fill' : `ion-grid--collapse-${collapse}`,
        `ion-grid--gap-${gap}`,
        // Always set: a custom property inherits, so a nested grid would
        // otherwise take its parent's row gap.
        `ion-grid--row-gap-${rowGap ?? gap}`,
        align ? `ion-grid--align-${align}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        {
          ...(minColumnWidth
            ? { '--ion-grid-min': `${minColumnWidth}px` }
            : { '--ion-grid-columns': track(columns) }),
          ...style,
        } as React.CSSProperties
      }
    >
      {children}
    </Tag>
  ),
);

Grid.displayName = 'Grid';
