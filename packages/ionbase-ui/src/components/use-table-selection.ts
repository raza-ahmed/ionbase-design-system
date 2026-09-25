'use client';

import { useCallback, useMemo, useState } from 'react';
import type { TableRowSelection } from './Table.js';

/**
 * Which rows are selected.
 *
 * Two shapes, because "every row that matches" cannot be a list of keys: the
 * rows may be one page of thousands on a server, and the ones not yet fetched
 * have no keys to hold. So selecting everything is stored as `all`, minus the
 * rows unticked since — the caller sends that to the server as "all matching
 * the current filters, except these".
 */
export type TableSelection<Key extends string = string> =
  | { mode: 'keys'; keys: ReadonlySet<Key> }
  | { mode: 'all'; except: ReadonlySet<Key> };

export interface UseTableSelectionOptions {
  /**
   * How many rows match the current filters, across every page. Needed to
   * count an `all` selection and to offer "select all"; leave it out and the
   * selection stays page-by-page.
   */
  total?: number;
}

export interface UseTableSelectionResult<Key extends string> {
  selection: TableSelection<Key>;
  setSelection: (selection: TableSelection<Key>) => void;
  isSelected: (key: Key) => boolean;
  /** How many rows are selected, `all` included. */
  count: number;
  /** `true` once "select all" has been chosen and not undone by a clear. */
  isAllMatching: boolean;
  /** Select every row that matches, on every page. */
  selectAllMatching: () => void;
  /** Select nothing. Call it when the filters or the sort change, too. */
  clear: () => void;
  /**
   * Props for the select-all Checkbox in the head row — pass to TableRow's
   * `selection`. Ticks, unticks or completes the rows on THIS page only; the
   * rest of the matching rows are TableBatchBar's "select all" offer.
   */
  headSelection: (
    pageKeys: readonly Key[],
    label?: string,
  ) => TableRowSelection;
  /** Props for one row's Checkbox — pass to TableRow's `selection`. */
  rowSelection: (key: Key, label: string) => TableRowSelection;
}

const EMPTY: TableSelection<never> = { mode: 'keys', keys: new Set() };

/**
 * The selection state of a table: the rows ticked, the header's tri-state,
 * and "all N matching" across pages.
 *
 * The companion to `useTableSort`, and like it the hook does no data work: it
 * never fetches or filters. It keeps which keys are selected, and returns the
 * props that wire each Checkbox to them.
 *
 * THE HEADER IS PAGE-SCOPED, ON PURPOSE
 *
 * Ticking the header selects the rows you can see. Selecting rows you cannot
 * see is a second, deliberate step — TableBatchBar's "Select all N" — because
 * a bulk delete that silently reached 4,000 rows behind the first page of 25
 * is how bulk actions destroy data. Gmail, Carbon and Lightning all make the
 * same two-step split.
 */
export function useTableSelection<Key extends string = string>(
  options: UseTableSelectionOptions = {},
): UseTableSelectionResult<Key> {
  const { total } = options;
  const [selection, setSelection] = useState<TableSelection<Key>>(
    EMPTY as TableSelection<Key>,
  );

  const isSelected = useCallback(
    (key: Key) =>
      selection.mode === 'all'
        ? !selection.except.has(key)
        : selection.keys.has(key),
    [selection],
  );

  const count =
    selection.mode === 'all'
      ? Math.max(0, (total ?? 0) - selection.except.size)
      : selection.keys.size;

  /*
   * Set or unset a batch of keys in either shape. An `all` selection that has
   * had every row unticked is nothing, not "all except everything": it drops
   * back to an empty key set, so the bar goes and the header reads unticked.
   */
  const apply = useCallback(
    (keys: readonly Key[], on: boolean) => {
      setSelection((current) => {
        if (current.mode === 'all') {
          const except = new Set(current.except);
          for (const k of keys) {
            if (on) except.delete(k);
            else except.add(k);
          }
          if (total !== undefined && except.size >= total) return EMPTY;
          return { mode: 'all', except };
        }
        const next = new Set(current.keys);
        for (const k of keys) {
          if (on) next.add(k);
          else next.delete(k);
        }
        return { mode: 'keys', keys: next };
      });
    },
    [total],
  );

  const clear = useCallback(
    () => setSelection(EMPTY as TableSelection<Key>),
    [],
  );
  const selectAllMatching = useCallback(
    () => setSelection({ mode: 'all', except: new Set() }),
    [],
  );

  const headSelection = useCallback(
    (
      pageKeys: readonly Key[],
      label = 'Select all rows on this page',
    ): TableRowSelection => {
      const onPage = pageKeys.filter(isSelected).length;
      return {
        'aria-label': label,
        isSelected: pageKeys.length > 0 && onPage === pageKeys.length,
        isIndeterminate: onPage > 0 && onPage < pageKeys.length,
        isDisabled: pageKeys.length === 0,
        // Partial ticks to full, the way every header checkbox does: the
        // first press completes the page rather than clearing it.
        onSelectionChange: () => apply(pageKeys, onPage < pageKeys.length),
      };
    },
    [apply, isSelected],
  );

  const rowSelection = useCallback(
    (key: Key, label: string): TableRowSelection => ({
      'aria-label': label,
      isSelected: isSelected(key),
      onSelectionChange: (on) => apply([key], on),
    }),
    [apply, isSelected],
  );

  return useMemo(
    () => ({
      selection,
      setSelection,
      isSelected,
      count,
      isAllMatching: selection.mode === 'all',
      selectAllMatching,
      clear,
      headSelection,
      rowSelection,
    }),
    [
      selection,
      isSelected,
      count,
      selectAllMatching,
      clear,
      headSelection,
      rowSelection,
    ],
  );
}
