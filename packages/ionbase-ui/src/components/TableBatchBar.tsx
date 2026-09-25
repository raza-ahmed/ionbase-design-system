'use client';

import React from 'react';
import { useLocale } from 'react-aria';
import { Button } from './Button.js';
import { Toolbar } from './Toolbar.js';

export interface TableBatchBarLabels {
  /** "3 selected". Receives the count already formatted for the locale. */
  selected?: (count: string) => string;
  /** "All 128 selected", once every matching row is. */
  allSelected?: (total: string) => string;
  /** "Select all 128". */
  selectAll?: (total: string) => string;
  /** "Clear selection". */
  clear?: string;
  /** Names the actions Toolbar — "Actions for 3 selected rows". */
  actions?: (count: string) => string;
}

export interface TableBatchBarProps {
  /** How many rows are selected — `useTableSelection`'s `count`. */
  count: number;
  /** How many rows match, across every page. Needed to offer "select all". */
  total?: number;
  /** Whether every matching row is selected — `isAllMatching`. */
  isAllMatching?: boolean;
  /** Select every matching row. Leave it out to keep selection page-by-page. */
  onSelectAll?: () => void;
  /** Select nothing. */
  onClear: () => void;
  /**
   * The id on the Table this bar acts on. Clearing hands focus to that
   * table's select-all Checkbox, since the bar — and the button just pressed
   * — goes away with the selection.
   */
  tableId?: string;
  /** Every string the bar renders, for translation. English by default. */
  labels?: TableBatchBarLabels;
  /** The actions: Buttons and Dividers, placed in a Toolbar. */
  children?: React.ReactNode;
  className?: string;
}

const DEFAULTS: Required<TableBatchBarLabels> = {
  selected: (n) => `${n} selected`,
  allSelected: (n) => `All ${n} selected`,
  selectAll: (n) => `Select all ${n}`,
  clear: 'Clear selection',
  actions: (n) => `Actions for ${n} selected rows`,
};

/**
 * TableBatchBar — the count, "select all N", the bulk actions and "clear",
 * shown while any row of a table is selected.
 *
 * ALWAYS MOUNTED, EVEN WHEN NOTHING IS SELECTED
 *
 * The count is a `role="status"` live region, and a live region only speaks
 * about changes to content it already held: one inserted into the page along
 * with its first message is, in most screen readers, silent. So the bar is
 * rendered from the start, empty and visually hidden at zero, and the first
 * ticked box is announced as "1 selected" instead of nothing.
 *
 * WHY "SELECT ALL" IS A BUTTON HERE AND NOT THE HEADER CHECKBOX
 *
 * See `useTableSelection`: the header selects the rows you can see, and
 * reaching the ones you cannot is a separate press, offered only once the
 * whole page is ticked and more rows match than it holds.
 *
 * The actions go in a Toolbar — one tab stop, arrows between them — named
 * for what they act on.
 */
export function TableBatchBar({
  count,
  total,
  isAllMatching = false,
  onSelectAll,
  onClear,
  tableId,
  labels,
  children,
  className,
}: TableBatchBarProps) {
  const { locale } = useLocale();
  const l = { ...DEFAULTS, ...labels };
  const n = new Intl.NumberFormat(locale).format(count);
  const all =
    total === undefined ? '' : new Intl.NumberFormat(locale).format(total);

  const status =
    count === 0
      ? ''
      : isAllMatching && total !== undefined && count === total
        ? l.allSelected(all)
        : l.selected(n);

  // Offered whenever fewer than every matching row are selected — including
  // "all except the few just unticked", where it puts them back.
  const offerSelectAll =
    onSelectAll !== undefined &&
    total !== undefined &&
    count > 0 &&
    count < total;

  const clear = () => {
    onClear();
    if (!tableId) return;
    // After the bar has gone: the select-all box is what the user was
    // working from, and it is still there.
    requestAnimationFrame(() => {
      const box = document
        .getElementById(tableId)
        ?.querySelector<HTMLInputElement>('thead input[type="checkbox"]');
      box?.focus();
    });
  };

  return (
    <div
      className={[
        'ion-table-batch',
        count === 0 ? 'ion-table-batch--empty' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span role="status" className="ion-table-batch__count">
        {status}
      </span>
      {count > 0 && (
        <>
          {offerSelectAll && (
            <Button
              size="sm"
              variant="tertiary"
              onPress={onSelectAll}
              aria-controls={tableId}
            >
              {l.selectAll(all)}
            </Button>
          )}
          <Toolbar
            aria-label={l.actions(n)}
            className="ion-table-batch__actions"
          >
            {children}
          </Toolbar>
          <Button
            size="sm"
            variant="tertiary"
            onPress={clear}
            aria-controls={tableId}
            className="ion-table-batch__clear"
          >
            {l.clear}
          </Button>
        </>
      )}
    </div>
  );
}

TableBatchBar.displayName = 'TableBatchBar';
