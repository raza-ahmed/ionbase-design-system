'use client';

import { useCallback, useMemo, useState } from 'react';
import type { TableCellResize } from './Table.js';

/** One column a person can hide, show or resize. */
export interface TableColumn<Key extends string = string> {
  key: Key;
  /** Its name — the header, and its row in `TableColumnsMenu`. */
  label: string;
  /**
   * Whether it can be hidden. `false` for the column that names each row: a
   * table of statuses with no names says nothing. Defaults to `true`.
   */
  canHide?: boolean;
  /** Starts hidden: detail most people do not need, one choice away. */
  defaultHidden?: boolean;
  /** Whether its header has a resize handle. Defaults to `false`. */
  canResize?: boolean;
  /** Its width in pixels until resized; left out, it fits its content. */
  defaultWidth?: number;
  /** The narrowest a resize takes it. Defaults to 80. */
  minWidth?: number;
  /** The widest a resize takes it. Defaults to 640. */
  maxWidth?: number;
}

export interface UseTableColumnsOptions<Key extends string = string> {
  /**
   * A saved view to start from — what `hidden` and `widths` held when it was
   * stored. Read once, on the first render; the columns' own defaults fill
   * whatever it leaves out.
   */
  initial?: {
    hidden?: Key[];
    widths?: Partial<Record<Key, number>>;
  };
  /** The resize handle's name, from the column's label. "Resize Agent" by
   *  default; pass one for translation. */
  resizeLabel?: (label: string) => string;
}

export interface UseTableColumnsResult<Key extends string> {
  /** Every column, in order, shown or not — for `TableColumnsMenu`. */
  columns: readonly TableColumn<Key>[];
  /** The columns shown, in order: render the headers and cells from these. */
  visibleColumns: TableColumn<Key>[];
  isVisible: (key: Key) => boolean;
  /** The hidden columns' keys. */
  hidden: Key[];
  /** Hide exactly these — from a saved view, a reset. A column that cannot
   *  be hidden stays. */
  setHidden: (keys: Key[]) => void;
  /** Widths people have set, by key. A column not in it has its own. */
  widths: Partial<Record<Key, number>>;
  /** Set every width at once — from a saved view; `{}` resets them. */
  setWidths: (widths: Partial<Record<Key, number>>) => void;
  /** Spread onto a column's header `TableCell`: its resize handle, if it
   *  has one. */
  headerProps: (key: Key) => { resize?: TableCellResize };
}

const MIN_WIDTH = 80;
const MAX_WIDTH = 640;

/**
 * The state of a table whose columns people choose and size: which are
 * shown, how wide the resized ones are, and the props that wire each header
 * and the columns menu to it.
 *
 * It renders nothing and hides nothing: the caller renders the headers and
 * cells of `visibleColumns`, so a hidden column's cells are not in the table
 * at all rather than there and invisible. The state is plain data, so a
 * saved view is `hidden` and `widths` stored, and restored with the setters.
 */
export function useTableColumns<Key extends string>(
  columns: readonly TableColumn<Key>[],
  {
    initial,
    resizeLabel = (label) => `Resize ${label}`,
  }: UseTableColumnsOptions<Key> = {},
): UseTableColumnsResult<Key> {
  const [hiddenSet, setHiddenSet] = useState<ReadonlySet<Key>>(() => {
    const hideable = columns.filter((c) => c.canHide !== false);
    // A key the saved view names that is no longer a column is dropped.
    return new Set(
      initial?.hidden
        ? hideable
            .filter((c) => initial.hidden!.includes(c.key))
            .map((c) => c.key)
        : hideable.filter((c) => c.defaultHidden).map((c) => c.key),
    );
  });
  const [widths, setWidths] = useState<Partial<Record<Key, number>>>(
    () => initial?.widths ?? {},
  );

  const setHidden = useCallback(
    (keys: Key[]) => {
      const hideable = new Set(
        columns.filter((c) => c.canHide !== false).map((c) => c.key),
      );
      setHiddenSet(new Set(keys.filter((k) => hideable.has(k))));
    },
    [columns],
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenSet.has(c.key)),
    [columns, hiddenSet],
  );

  const headerProps = useCallback(
    (key: Key): { resize?: TableCellResize } => {
      const column = columns.find((c) => c.key === key);
      if (!column?.canResize) return {};
      return {
        resize: {
          width: widths[key] ?? column.defaultWidth,
          minWidth: column.minWidth ?? MIN_WIDTH,
          maxWidth: column.maxWidth ?? MAX_WIDTH,
          'aria-label': resizeLabel(column.label),
          onResize: (width) =>
            setWidths((current) => {
              const next = { ...current };
              if (width === undefined) delete next[key];
              else next[key] = width;
              return next;
            }),
        },
      };
    },
    [columns, widths, resizeLabel],
  );

  return {
    columns,
    visibleColumns,
    isVisible: (key) => !hiddenSet.has(key),
    hidden: [...hiddenSet],
    setHidden,
    widths,
    setWidths,
    headerProps,
  };
}
