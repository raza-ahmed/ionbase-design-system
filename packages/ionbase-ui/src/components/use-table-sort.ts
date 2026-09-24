'use client';

import { useCallback, useState } from 'react';
import type { TableSortDirection } from './Table.js';

/** Which column the rows are sorted by, and which way. */
export interface TableSort<Column extends string = string> {
  column: Column;
  direction: Exclude<TableSortDirection, 'none'>;
}

export interface TableSortProps {
  sortDirection: TableSortDirection;
  onSort: () => void;
}

export interface UseTableSortResult<Column extends string> {
  /** The current sort; `null` until a column is chosen when no `initial` is given. */
  sort: TableSort<Column> | null;
  /** Set the sort directly — from a URL, a saved view, a reset. */
  setSort: (sort: TableSort<Column> | null) => void;
  /**
   * Spread onto a header `TableCell`. `firstDirection` is where a column
   * starts when it is chosen: `descending` for dates and amounts, where the
   * newest or largest is what people look for first.
   */
  sortProps: (
    column: Column,
    options?: { firstDirection?: TableSort['direction'] },
  ) => TableSortProps;
}

/**
 * The state of a sortable table: which column, which way, and the props that
 * wire each header to it.
 *
 * Choosing a new column sorts it in its `firstDirection` (ascending unless
 * given); choosing the current column again reverses it. There is no third
 * "unsorted" click: a table that silently returns to server order on the
 * third press loses the reader's place for no reason they can see.
 *
 * It does not sort rows. The rows may be one page of thousands on a server,
 * so ordering them is the caller's — with `sort` as the input.
 */
export function useTableSort<Column extends string>(
  initial: TableSort<Column> | null = null,
): UseTableSortResult<Column> {
  const [sort, setSort] = useState<TableSort<Column> | null>(initial);

  const sortProps = useCallback(
    (
      column: Column,
      options?: { firstDirection?: TableSort['direction'] },
    ): TableSortProps => ({
      sortDirection: sort?.column === column ? sort.direction : 'none',
      onSort: () =>
        setSort((current) =>
          current?.column === column
            ? {
                column,
                direction:
                  current.direction === 'ascending'
                    ? 'descending'
                    : 'ascending',
              }
            : {
                column,
                direction: options?.firstDirection ?? 'ascending',
              },
        ),
    }),
    [sort],
  );

  return { sort, setSort, sortProps };
}
