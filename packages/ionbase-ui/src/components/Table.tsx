'use client';

import React, {
  createContext,
  forwardRef,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { mergeRefs } from 'react-aria';
import { Checkbox } from './Checkbox.js';

export type TableDensity = 'compact' | 'default' | 'relaxed';

/**
 * Section context so `TableRow` / `TableCell` can tell head from body without
 * a prop the caller has to keep in sync with where the row actually sits.
 * `createContext` is client-only — see verify-client-boundaries.mjs.
 */
const TableSectionContext = createContext<'head' | 'body' | null>(null);

/*
 * Measured layout — the detail row's span, the sticky offsets — runs before
 * the first paint, and is a no-op on a server, where the first client render
 * fixes it.
 */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? () => {} : useLayoutEffect;

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Matches Figma's `Density` variant on `Table Cell` / `Table Row`. */
  density?: TableDensity;
  /** Alternating row background, read from the row's position, not a prop
   *  repeated on every `TableRow`. */
  isStriped?: boolean;
  /**
   * Scroll the rows inside the table past this height, with the header held
   * at the top — a number is pixels, a string any CSS length (`"60vh"`).
   * The header sticks to the table's own scroll region, not the page: that
   * region already scrolls sideways, and a sticky cell sticks to the nearest
   * scroller.
   */
  maxHeight?: number | string;
  /**
   * Hold the first column in place while the table scrolls sideways — with
   * the toggle and checkbox cells before it, when the rows have them. For a
   * table wider than its space whose rows are named by their first column.
   */
  stickyFirstColumn?: boolean;
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
 *
 * The scroll container is a keyboard-reachable region (WCAG 2.1.1): overflow
 * alone is not enough. `aria-label` / `aria-labelledby` on `Table` name that
 * region — the container accepts no props of its own, so the table's name is
 * the only place the label can live. Prefer a `<caption>` via
 * `aria-labelledby` when the name should also be visible.
 */
/** Leading cells that are controls, not content: they stick with the first column. */
const isControlCell = (cell: HTMLTableCellElement) =>
  cell.classList.contains('ion-table__expander') ||
  cell.classList.contains('ion-table__select');

/*
 * Sticky columns and the header need offsets only layout knows: each held
 * cell's `left` is the width of the held cells before it, and the scroll
 * padding that keeps a focused control out from under them is the header's
 * height and the held column's width. Measured after every render, and again
 * on a resize or when rows come and go — a page change, a row opening.
 */
function useStickyLayout(
  containerRef: React.RefObject<HTMLDivElement | null>,
  tableRef: React.RefObject<HTMLTableElement | null>,
  { column, header }: { column: boolean; header: boolean },
) {
  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const table = tableRef.current;
    if (!container || !table || (!column && !header)) return;

    const measure = () => {
      let held = 0;
      for (const row of table.rows) {
        if (row.classList.contains('ion-table__detail')) continue;
        let left = 0;
        let edge: HTMLTableCellElement | null = null;
        for (const cell of row.cells) {
          delete cell.dataset.sticky;
          delete cell.dataset.stickyEdge;
        }
        if (!column) continue;
        for (const cell of row.cells) {
          cell.dataset.sticky = '';
          cell.style.setProperty('--ion-table-sticky-left', `${left}px`);
          left += cell.getBoundingClientRect().width;
          edge = cell;
          if (!isControlCell(cell)) break;
        }
        if (edge) edge.dataset.stickyEdge = '';
        held = Math.max(held, left);
      }
      const head = header
        ? (table.tHead?.getBoundingClientRect().height ?? 0)
        : 0;
      container.style.setProperty('--ion-table-head-height', `${head}px`);
      container.style.setProperty('--ion-table-held-width', `${held}px`);
      // A column resized inside a full-width table leaves the table's size
      // alone, so its cells are watched too: every column has one in the
      // first row. Watching a cell twice is a no-op.
      const first = table.tHead?.rows[0] ?? table.rows[0];
      if (first) for (const cell of first.cells) resize.observe(cell);
    };

    // The shadow at the held column's edge shows only once something has
    // scrolled under it.
    const onScroll = () => {
      container.dataset.scrolledX = container.scrollLeft > 0 ? 'true' : 'false';
    };

    /*
     * A control half under the held header or column is "in view" to the
     * browser, which then does not scroll on focus. Scroll it clear here;
     * `nearest` honours the scroll padding, so it lands just past them.
     */
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target === container || target.closest('[data-sticky]')) return;
      const box = target.getBoundingClientRect();
      const region = container.getBoundingClientRect();
      const padTop =
        parseFloat(getComputedStyle(container).scrollPaddingTop) || 0;
      const padLeft =
        parseFloat(getComputedStyle(container).scrollPaddingLeft) || 0;
      if (box.top < region.top + padTop || box.left < region.left + padLeft)
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    const resize = new ResizeObserver(measure);
    measure();
    onScroll();
    resize.observe(table);
    const rows = new MutationObserver(measure);
    rows.observe(table, { childList: true, subtree: true });
    container.addEventListener('scroll', onScroll, { passive: true });
    container.addEventListener('focusin', onFocus);
    return () => {
      container.removeEventListener('focusin', onFocus);
      resize.disconnect();
      rows.disconnect();
      container.removeEventListener('scroll', onScroll);
      // Turned off: nothing stays held.
      for (const cell of table.querySelectorAll<HTMLElement>('[data-sticky]')) {
        delete cell.dataset.sticky;
        delete cell.dataset.stickyEdge;
      }
    };
  }, [column, header]);
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  (
    {
      density = 'default',
      isStriped,
      maxHeight,
      stickyFirstColumn,
      className,
      children,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      ...rest
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLTableElement>(null);
    const stickyHeader = maxHeight !== undefined;
    useStickyLayout(containerRef, tableRef, {
      column: !!stickyFirstColumn,
      header: stickyHeader,
    });

    return (
      <div
        ref={containerRef}
        className={[
          'ion-table-container',
          stickyHeader ? 'ion-table-container--sticky-header' : '',
          stickyFirstColumn ? 'ion-table-container--sticky-column' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="region"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        style={
          stickyHeader
            ? {
                maxHeight:
                  typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
              }
            : undefined
        }
      >
        <table
          {...rest}
          ref={mergeRefs(tableRef, ref)}
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
    );
  },
);
Table.displayName = 'Table';

export const TableHead = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ children, ...rest }, ref) => (
  <TableSectionContext.Provider value="head">
    <thead {...rest} ref={ref}>
      {children}
    </thead>
  </TableSectionContext.Provider>
));
TableHead.displayName = 'TableHead';

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ children, ...rest }, ref) => (
  <TableSectionContext.Provider value="body">
    <tbody {...rest} ref={ref}>
      {children}
    </tbody>
  </TableSectionContext.Provider>
));
TableBody.displayName = 'TableBody';

/**
 * Row selection checkboxes have no visible label by design, so an accessible
 * name is required — either `aria-label` or label `children` on the Checkbox.
 */
export type TableRowSelection = React.ComponentProps<typeof Checkbox> &
  ({ 'aria-label': string } | { children: React.ReactNode });

/**
 * A body row that opens to show more under it. The toggle is a real
 * disclosure button in the row's first cell, named for the row.
 */
export interface TableRowExpansion {
  /**
   * The toggle's accessible name. Name the row, not the action — "Details
   * for run 4821" — since every row has one and "Expand" twelve times says
   * nothing.
   */
  'aria-label': string;
  /** What opens under the row, in one cell across every column. */
  content: React.ReactNode;
  /** Controlled: whether it is open. */
  isExpanded?: boolean;
  /** Uncontrolled: whether it starts open. */
  defaultExpanded?: boolean;
  onExpandedChange?: (isExpanded: boolean) => void;
}

/** The head row's cell over the toggles. Its name is visually hidden. */
export interface TableHeadExpansion {
  /** Names the toggle column for a screen reader: "Details". */
  label: string;
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isSelected?: boolean;
  /**
   * Makes the row expandable — Figma's `Show Expander`. In `<tbody>`, a
   * `TableRowExpansion`: a leading toggle cell, and when open, a second row
   * under this one holding `content`. In `<thead>`, a `TableHeadExpansion`:
   * the header cell over the toggles, so the columns still line up.
   */
  expansion?: TableRowExpansion | TableHeadExpansion;
  /**
   * Renders a leading `Checkbox` cell — Figma's `Show Selection`. Takes the
   * checkbox's own props directly rather than a boolean, since a selectable
   * row needs `checked`/`onChange` wiring, not just a decorative box.
   *
   * Inside `<thead>` the cell is a `<th scope="col">` (select-all). Inside
   * `<tbody>` it is a `<td>`.
   */
  selection?: TableRowSelection;
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
const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m9 18 6-6-6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ isSelected, selection, expansion, className, children, ...rest }, ref) => {
    const section = useContext(TableSectionContext);
    const inHead = section === 'head';
    const rowRef = useRef<HTMLTableRowElement>(null);
    const detailId = useId();

    const body =
      expansion && 'content' in expansion && !inHead ? expansion : undefined;
    const [ownExpanded, setOwnExpanded] = useState(
      body?.defaultExpanded ?? false,
    );
    const isExpanded = body ? (body.isExpanded ?? ownExpanded) : false;
    const toggle = () => {
      const next = !isExpanded;
      // Harmless when controlled: `isExpanded` wins over it.
      setOwnExpanded(next);
      body?.onExpandedChange?.(next);
    };

    // The detail row spans every column: counted from the row's own cells,
    // colSpans included, rather than a prop kept in step with the columns.
    const [span, setSpan] = useState(1);
    useIsomorphicLayoutEffect(() => {
      if (!isExpanded || !rowRef.current) return;
      const cells = [...rowRef.current.cells].reduce(
        (n, cell) => n + cell.colSpan,
        0,
      );
      if (cells !== span) setSpan(cells);
    });

    const expanderCell = !expansion ? null : inHead ? (
      <th scope="col" className="ion-table__expander">
        <span className="ion-visually-hidden">
          {(expansion as TableHeadExpansion).label}
        </span>
      </th>
    ) : (
      <td className="ion-table__expander">
        {body && (
          // A real disclosure: the row keeps its row role, and the button
          // gets focus, Enter and Space, and says open or closed.
          <button
            type="button"
            className="ion-table__expander-button"
            aria-label={body['aria-label']}
            aria-expanded={isExpanded}
            aria-controls={isExpanded ? detailId : undefined}
            onClick={toggle}
          >
            <Chevron />
          </button>
        )}
      </td>
    );

    const row = (
      <tr
        {...rest}
        ref={mergeRefs(rowRef, ref)}
        data-selected={isSelected || undefined}
        data-expanded={isExpanded || undefined}
        className={['ion-table__row', className].filter(Boolean).join(' ')}
      >
        {expanderCell}
        {selection &&
          (inHead ? (
            <th scope="col" className="ion-table__select">
              <Checkbox {...selection} />
            </th>
          ) : (
            <td className="ion-table__select">
              <Checkbox {...selection} />
            </td>
          ))}
        {children}
      </tr>
    );

    if (!body || !isExpanded) return row;
    return (
      <>
        {row}
        <tr id={detailId} className="ion-table__detail">
          <td colSpan={span}>{body.content}</td>
        </tr>
      </>
    );
  },
);
TableRow.displayName = 'TableRow';

export type TableCellAlign = 'leading' | 'trailing' | 'center';
/**
 * A sortable column's state. `none` means sortable but not the current sort —
 * the column shows the neutral indicator and no `aria-sort`.
 */
export type TableSortDirection = 'ascending' | 'descending' | 'none';
export type TableCellScope = 'col' | 'row' | 'colgroup' | 'rowgroup';

export interface TableCellProps extends Omit<
  React.TdHTMLAttributes<HTMLTableCellElement>,
  'align'
> {
  /** Renders `<th>` instead of `<td>` — Figma's header cell, `surface/page`
   *  fill included. */
  header?: boolean;
  /**
   * `<th>` scope. Inferred when omitted: `col` in `<thead>`, `row` in
   * `<tbody>`. Pass explicitly when the inference is wrong (e.g. a column
   * header rendered outside `<thead>`).
   */
  scope?: TableCellScope;
  align?: TableCellAlign;
  /** Figma's `Type=Link` — recolours the content to `text/link` /
   *  `icon/primary` rather than the body defaults. */
  variant?: 'default' | 'link';
  /** Figma's per-cell `Show Divider` — a column rule, not a row rule. */
  showDivider?: boolean;
  /** Figma's `Leading Icon` / `Trailing Icon` slots on `Cell Text`. */
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /**
   * Makes a header cell a sort control. Set it on every sortable column:
   * `ascending` or `descending` on the one the rows are sorted by, `none` on
   * the rest. Header cells only — ignored on a body cell. `useTableSort`
   * returns this and `onSort` for each column.
   */
  sortDirection?: TableSortDirection;
  /**
   * Called when the header is activated. The table does not reorder rows:
   * sorting is the caller's, since only it knows whether the data is local
   * or paged from a server.
   */
  onSort?: () => void;
  /**
   * Makes a header cell's column resizable: a handle on its trailing edge,
   * dragged or moved with the arrow keys. Header cells only. `useTableColumns`
   * returns this for each column through `headerProps`.
   */
  resize?: TableCellResize;
  children?: React.ReactNode;
}

/** A resizable column's width, its limits, and what to do when it changes. */
export interface TableCellResize {
  /** In pixels; `undefined` sizes the column to its content. */
  width: number | undefined;
  minWidth: number;
  maxWidth: number;
  /** Called with the new width, or `undefined` on a double-click: back to
   *  the column's own width. */
  onResize: (width: number | undefined) => void;
  /** The handle's name: "Resize Agent". It names the column, since every
   *  resizable header has one. */
  'aria-label': string;
}

/** Arrow keys move a handle this far; with Shift, four times as far. */
const RESIZE_STEP = 16;

/**
 * The resize handle: a focusable vertical separator, the ARIA window-splitter
 * pattern, with the column's width as its value. A drag, the arrow keys,
 * Home and End, and a double-click to put the width back.
 */
function ResizeHandle({ resize }: { resize: TableCellResize }) {
  const { width, minWidth, maxWidth, onResize } = resize;
  const ref = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ x: number; width: number; rtl: boolean } | null>(null);
  // A column sized by its content still has a width to announce and to
  // step from: the one it was laid out at.
  const [measured, setMeasured] = useState<number>();
  useIsomorphicLayoutEffect(() => {
    const cell = ref.current?.parentElement;
    if (!cell) return;
    const read = () =>
      setMeasured(Math.round(cell.getBoundingClientRect().width));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(cell);
    return () => observer.disconnect();
  }, []);

  const current = width ?? measured ?? minWidth;
  const clamp = (w: number) =>
    Math.round(Math.min(maxWidth, Math.max(minWidth, w)));
  const isRtl = () =>
    !!ref.current && getComputedStyle(ref.current).direction === 'rtl';

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? RESIZE_STEP * 4 : RESIZE_STEP;
    // Toward the trailing edge widens, whichever way the text runs.
    const grow = isRtl() ? 'ArrowLeft' : 'ArrowRight';
    const shrink = isRtl() ? 'ArrowRight' : 'ArrowLeft';
    let next: number | undefined;
    if (e.key === grow) next = current + step;
    else if (e.key === shrink) next = current - step;
    else if (e.key === 'Home') next = minWidth;
    else if (e.key === 'End') next = maxWidth;
    else return;
    e.preventDefault();
    onResize(clamp(next));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    // No text selection while dragging, and the column's own width, not
    // the value, is where the drag starts.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    const cell = e.currentTarget.parentElement as HTMLElement;
    drag.current = {
      x: e.clientX,
      width: cell.getBoundingClientRect().width,
      rtl: isRtl(),
    };
    e.currentTarget.dataset.resizing = 'true';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const start = drag.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    onResize(clamp(start.width + (start.rtl ? -dx : dx)));
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!drag.current) return;
    drag.current = null;
    delete e.currentTarget.dataset.resizing;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <span
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={resize['aria-label']}
      aria-valuenow={current}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      className="ion-table__resizer"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      // A sibling of the sort button, not inside it: a press here never
      // sorts.
      onDoubleClick={() => onResize(undefined)}
    />
  );
}

const SortIcon = ({ direction }: { direction: TableSortDirection }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {direction === 'ascending' ? (
      <path d="m5 12 7-7 7 7M12 19V5" />
    ) : direction === 'descending' ? (
      <path d="M12 5v14m7-7-7 7-7-7" />
    ) : (
      <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
    )}
  </svg>
);

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
      scope: scopeProp,
      align = 'leading',
      variant = 'default',
      showDivider,
      icon,
      trailingIcon,
      sortDirection,
      onSort,
      resize: resizeProp,
      className,
      children,
      style,
      ...rest
    },
    ref,
  ) => {
    const section = useContext(TableSectionContext);
    const Tag = header ? 'th' : 'td';
    const resize = header ? resizeProp : undefined;
    const labelId = useId();
    const isSortable = header && sortDirection !== undefined;
    // `scope` is only valid on `<th>` — never put it on a `<td>`.
    const scope = header
      ? (scopeProp ?? (section === 'body' ? 'row' : 'col'))
      : undefined;
    const contentClassNames = [
      'ion-table__cell-content',
      variant === 'link' ? 'ion-table__cell-content--link' : '',
      isSortable ? 'ion-table__sort' : '',
      isSortable && sortDirection !== 'none' ? 'ion-table__sort--active' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const content = (
      <>
        {icon && (
          <span className="ion-table__cell-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
        {isSortable ? (
          <span
            className="ion-table__cell-icon ion-table__cell-icon--trailing ion-table__sort-icon"
            aria-hidden="true"
          >
            <SortIcon direction={sortDirection} />
          </span>
        ) : (
          trailingIcon && (
            <span
              className="ion-table__cell-icon ion-table__cell-icon--trailing"
              aria-hidden="true"
            >
              {trailingIcon}
            </span>
          )
        )}
      </>
    );

    return (
      <Tag
        {...rest}
        ref={ref}
        {...(scope ? { scope } : {})}
        // Only the sorted column carries aria-sort: the WAI-ARIA sortable
        // table puts it on one header at a time, and `none` on the rest is
        // noise a screen reader reads out on every column.
        aria-sort={
          isSortable && sortDirection !== 'none'
            ? sortDirection
            : rest['aria-sort']
        }
        data-align={align !== 'leading' ? align : undefined}
        data-divider={showDivider || undefined}
        data-resizable={resize ? 'true' : undefined}
        // Named by its label alone: named from its content, the header would
        // read the handle's name too — "Agent Resize Agent".
        aria-labelledby={
          resize
            ? (rest['aria-labelledby'] ?? labelId)
            : rest['aria-labelledby']
        }
        className={className}
        // The header's width is the column's: a table lays every cell in a
        // column out at the widest of them. `width` alone gives way when the
        // other columns fill the table; `min-width` counts toward the
        // column's floor, so the table scrolls sideways instead.
        style={
          resize?.width !== undefined
            ? { ...style, width: resize.width, minWidth: resize.width }
            : style
        }
      >
        {isSortable ? (
          // A real button inside the <th>, not a clickable <th>: the header
          // keeps its column-header role and the button gets focus, Enter
          // and Space for free.
          <button
            type="button"
            id={resize ? labelId : undefined}
            className={contentClassNames}
            onClick={onSort}
          >
            {content}
          </button>
        ) : (
          <span id={resize ? labelId : undefined} className={contentClassNames}>
            {content}
          </span>
        )}
        {resize && <ResizeHandle resize={resize} />}
      </Tag>
    );
  },
);
TableCell.displayName = 'TableCell';
