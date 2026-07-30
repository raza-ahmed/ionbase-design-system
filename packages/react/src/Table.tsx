import React, { forwardRef } from 'react';
import { Checkbox } from './Checkbox.js';

export type TableDensity = 'compact' | 'default' | 'relaxed';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Matches Figma's `Density` variant on `Table Cell` / `Table Row`. */
  density?: TableDensity;
  /** Alternating row background, read from the row's position, not a prop
   *  repeated on every `TableRow`. */
  isStriped?: boolean;
}

/**
 * `Table` owns the scroll container and the density class; everything else
 * is composed from `TableHead` / `TableBody` / `TableRow` / `TableCell`,
 * matching how Figma actually layers `Table Row` > `Table Cell` > `Cell Text`
 * rather than one component with a wall of props.
 *
 * Density has no React state to thread: it only ever changes vertical cell
 * padding, which `.ion-table--compact td` and friends apply through the CSS
 * cascade from this one class. A context provider for a value nothing in JS
 * ever reads would be infrastructure with no consumer.
 */
export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ density = 'default', isStriped, className, children, ...rest }, ref) => (
    <div className="ion-table-container">
      <table
        {...rest}
        ref={ref}
        className={[
          'ion-table',
          density !== 'default' ? `ion-table--${density}` : '',
          isStriped ? 'ion-table--striped' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </table>
    </div>
  ),
);
Table.displayName = 'Table';

export const TableHead = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>((props, ref) => <thead {...props} ref={ref} />);
TableHead.displayName = 'TableHead';

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>((props, ref) => <tbody {...props} ref={ref} />);
TableBody.displayName = 'TableBody';

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isSelected?: boolean;
  /**
   * Renders a leading `Checkbox` cell — Figma's `Show Selection`. Takes the
   * checkbox's own props directly rather than a boolean, since a selectable
   * row needs `checked`/`onChange` wiring, not just a decorative box.
   */
  selection?: React.ComponentProps<typeof Checkbox>;
}

/**
 * A plain `<tr>`. Hover is CSS-only (`:hover` plus a `data-hovered` escape
 * hatch, matching the rest of the system) rather than React Aria's
 * `useHover`: a row is not itself an interactive element — nothing about it
 * takes focus or fires a click — so there is no keyboard-vs-pointer
 * distinction to track. A clickable row is a link or button inside a cell,
 * the same accessible pattern Menu and Table Cell's own link variant use;
 * nesting an interactive role on `<tr>` itself is not valid HTML.
 */
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ isSelected, selection, className, children, ...rest }, ref) => (
    <tr
      {...rest}
      ref={ref}
      data-selected={isSelected || undefined}
      className={['ion-table__row', className].filter(Boolean).join(' ')}
    >
      {selection && (
        <td>
          <Checkbox {...selection} />
        </td>
      )}
      {children}
    </tr>
  ),
);
TableRow.displayName = 'TableRow';

export type TableCellAlign = 'leading' | 'trailing' | 'center';

export interface TableCellProps extends Omit<
  React.TdHTMLAttributes<HTMLTableCellElement>,
  'align'
> {
  /** Renders `<th>` instead of `<td>` — Figma's header cell, `surface/page`
   *  fill included. */
  header?: boolean;
  align?: TableCellAlign;
  /** Figma's `Type=Link` — recolours the content to `text/link` /
   *  `icon/primary` rather than the body defaults. */
  variant?: 'default' | 'link';
  /** Figma's per-cell `Show Divider` — a column rule, not a row rule. */
  showDivider?: boolean;
  /** Figma's `Leading Icon` / `Trailing Icon` slots on `Cell Text`. */
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * One component covers Figma's `Table Cell` + `Cell Text`: the two are never
 * used apart in the design (`Table Cell` always wraps exactly one `Cell
 * Text`), so splitting them into two exported components would only add API
 * surface for a composition nothing ever varies independently.
 *
 * `header` decides `<th>` vs `<td>` directly rather than a `type` prop that
 * could disagree with where the cell actually sits — a `<th>` rendered inside
 * `<tbody>` is still a header cell to the browser and to CSS either way.
 */
export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  (
    {
      header,
      align = 'leading',
      variant = 'default',
      showDivider,
      icon,
      trailingIcon,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const Tag = header ? 'th' : 'td';
    const contentClassNames = [
      'ion-table__cell-content',
      variant === 'link' ? 'ion-table__cell-content--link' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Tag
        {...rest}
        ref={ref}
        data-align={align !== 'leading' ? align : undefined}
        data-divider={showDivider || undefined}
        className={className}
      >
        <span className={contentClassNames}>
          {icon && (
            <span className="ion-table__cell-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          {children}
          {trailingIcon && (
            <span
              className="ion-table__cell-icon ion-table__cell-icon--trailing"
              aria-hidden="true"
            >
              {trailingIcon}
            </span>
          )}
        </span>
      </Tag>
    );
  },
);
TableCell.displayName = 'TableCell';
