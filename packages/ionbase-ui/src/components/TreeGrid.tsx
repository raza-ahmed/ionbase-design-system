'use client';

import React, { useMemo, useRef } from 'react';
import {
  mergeProps,
  useButton,
  useFocusRing,
  useTable,
  useTableCell,
  useTableColumnHeader,
  useTableHeaderRow,
  useTableRow,
  useTableRowGroup,
  useTableSelectAllCheckbox,
  useTableSelectionCheckbox,
  type AriaButtonProps,
} from 'react-aria';
import { Cell, Column, Row, TableBody, TableHeader } from 'react-stately';
/*
 * React Aria's tree-table state ships in 3.50 behind a flag and on a private
 * path — see AGENTS.md. The flag gates this hook and nothing else.
 */
import { enableTableNestedRows } from 'react-stately/private/flags/flags';
import {
  UNSTABLE_useTreeGridState,
  type TreeGridState,
} from 'react-stately/private/table/useTreeGridState';
import type { TableState } from 'react-stately';
import type { Key, Node, Selection } from '@react-types/shared';
import { Checkbox } from './Checkbox.js';

export interface TreeGridItem {
  /** Unique across the whole tree, not only among siblings. */
  id: string;
  /** Rows under this one, opened by → or the chevron. */
  children?: readonly TreeGridItem[];
  /**
   * Typeahead and the row's name when the first column's cell is not a
   * string.
   */
  textValue?: string;
  /**
   * Cannot be selected: its checkbox is disabled, and Space passes it by. It
   * can still be opened, read and activated — its rows may not be disabled.
   */
  isDisabled?: boolean;
}

export type TreeGridColumnAlign = 'start' | 'end';

export interface TreeGridColumn<T extends TreeGridItem = TreeGridItem> {
  id: string;
  /** The header's text. */
  header: React.ReactNode;
  /** The row's cell in this column. */
  cell: (item: T) => React.ReactNode;
  /** `end` for numbers, so their digits line up. */
  align?: TreeGridColumnAlign;
  /** A number is pixels, a string any CSS length. */
  width?: number | string;
}

export type TreeGridSelectionMode = 'none' | 'single' | 'multiple';
export type TreeGridDensity = 'compact' | 'default' | 'relaxed';

export interface TreeGridProps<T extends TreeGridItem = TreeGridItem> {
  /**
   * The columns, in order. The first holds the tree — the indent, the
   * chevron — and names each row.
   */
  columns: readonly TreeGridColumn<T>[];
  items: readonly T[];
  /** Names the grid. Required unless `aria-labelledby` is given. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Rows that are open. Controlled. */
  expandedKeys?: Iterable<string>;
  /** Rows open at first. */
  defaultExpandedKeys?: Iterable<string>;
  onExpandedChange?: (keys: Set<string>) => void;
  /**
   * `none` (default). `single`: Space or a press selects one row.
   * `multiple`: a Checkbox in each row and one in the header for every row.
   */
  selectionMode?: TreeGridSelectionMode;
  selectedKeys?: Iterable<string>;
  defaultSelectedKeys?: Iterable<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** A row was activated — Enter, or a press when nothing is selectable. */
  onAction?: (key: string) => void;
  /** Matches Table's density: vertical padding only. */
  density?: TreeGridDensity;
  /** Shown, in a row of its own, when `items` is empty. */
  renderEmptyState?: () => React.ReactNode;
  id?: string;
  className?: string;
}

/*
 * The cell, header and checkbox hooks are typed for a flat table's state. The
 * tree state is that state with `expandedKeys` widened to allow `'all'`, which
 * this grid never passes.
 */
const flat = <T,>(state: TreeGridState<T>) => state as unknown as TableState<T>;

/** A cell node knows its column. */
type CellNode<T> = Node<T> & { column?: Node<T> };

/** Keys to strings — every key in this grid is an item `id`. */
const toStrings = (keys: Iterable<Key>): Set<string> =>
  new Set([...keys].map(String));

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

function ExpandButton(props: AriaButtonProps & { isExpanded: boolean }) {
  const { isExpanded, ...aria } = props;
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(aria, ref);
  return (
    <button
      {...buttonProps}
      ref={ref}
      type="button"
      className={[
        'ion-tree-grid__toggle',
        isExpanded ? 'ion-tree-grid__toggle--expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Chevron />
    </button>
  );
}

/*
 * The box's visible square is a `<label>`, which is not focusable, so a click
 * on it would reach the row as a press as well — see AGENTS.md on grid-list
 * rows. Stopped here, the checkbox is the only thing a click on it changes.
 */
const stop = (e: React.SyntheticEvent) => e.stopPropagation();

function SelectAllCell<T>({
  column,
  state,
}: {
  column: Node<T>;
  state: TreeGridState<T>;
}) {
  const ref = useRef<HTMLTableCellElement>(null);
  const { columnHeaderProps } = useTableColumnHeader(
    { node: column },
    flat(state),
    ref,
  );
  const { checkboxProps } = useTableSelectAllCheckbox(flat(state));
  return (
    <th
      {...columnHeaderProps}
      ref={ref}
      className="ion-table__select ion-tree-grid__select"
    >
      <span onPointerDown={stop} onMouseDown={stop} onClick={stop}>
        <Checkbox
          size="sm"
          aria-label={checkboxProps['aria-label']}
          isSelected={checkboxProps.isSelected}
          isIndeterminate={checkboxProps.isIndeterminate}
          onSelectionChange={checkboxProps.onChange}
          isDisabled={checkboxProps.isDisabled}
        />
      </span>
    </th>
  );
}

function ColumnHeader<T>({
  column,
  state,
  spec,
}: {
  column: Node<T>;
  state: TreeGridState<T>;
  spec: TreeGridColumn<TreeGridItem> | undefined;
}) {
  const ref = useRef<HTMLTableCellElement>(null);
  const { columnHeaderProps } = useTableColumnHeader(
    { node: column },
    flat(state),
    ref,
  );
  const { focusProps, isFocusVisible } = useFocusRing();
  return (
    <th
      {...mergeProps(columnHeaderProps, focusProps)}
      ref={ref}
      data-align={spec?.align === 'end' ? 'trailing' : undefined}
      data-focus-visible={isFocusVisible || undefined}
      style={spec?.width != null ? { width: spec.width } : undefined}
    >
      {column.rendered}
    </th>
  );
}

function SelectionCell<T>({
  cell,
  state,
}: {
  cell: Node<T>;
  state: TreeGridState<T>;
}) {
  const ref = useRef<HTMLTableCellElement>(null);
  const { gridCellProps } = useTableCell({ node: cell }, flat(state), ref);
  const { checkboxProps } = useTableSelectionCheckbox(
    { key: cell.parentKey! },
    flat(state),
  );
  return (
    <td
      {...gridCellProps}
      ref={ref}
      className="ion-table__select ion-tree-grid__select"
    >
      <span onPointerDown={stop} onMouseDown={stop} onClick={stop}>
        <Checkbox
          size="sm"
          id={checkboxProps.id}
          aria-label={checkboxProps['aria-label']}
          aria-labelledby={checkboxProps['aria-labelledby']}
          isSelected={checkboxProps.isSelected}
          onSelectionChange={checkboxProps.onChange}
          isDisabled={checkboxProps.isDisabled}
        />
      </span>
    </td>
  );
}

function DataCell<T>({
  cell,
  state,
  spec,
  tree,
}: {
  cell: Node<T>;
  state: TreeGridState<T>;
  spec: TreeGridColumn<TreeGridItem> | undefined;
  /** Only on the first column's cell: the indent and the chevron. */
  tree?: {
    level: number;
    hasChildren: boolean;
    isExpanded: boolean;
    expandButtonProps: AriaButtonProps;
  };
}) {
  const ref = useRef<HTMLTableCellElement>(null);
  const { gridCellProps } = useTableCell({ node: cell }, flat(state), ref);
  const { focusProps, isFocusVisible } = useFocusRing();
  /*
   * The row, its checkbox and its chevron are all named by the first cell's
   * id. On the cell itself that name would take in the chevron's own —
   * "Collapse Support triage" for the row — so the id is the label's.
   */
  const { id: labelId, ...cellProps } = gridCellProps;
  return (
    <td
      {...mergeProps(tree ? cellProps : gridCellProps, focusProps)}
      ref={ref}
      data-align={spec?.align === 'end' ? 'trailing' : undefined}
      data-focus-visible={isFocusVisible || undefined}
      className={tree ? 'ion-tree-grid__tree-cell' : undefined}
      style={
        tree
          ? ({ '--ion-tree-grid-level': tree.level } as React.CSSProperties)
          : undefined
      }
    >
      {tree ? (
        <span className="ion-tree-grid__tree">
          {tree.hasChildren ? (
            <ExpandButton
              {...tree.expandButtonProps}
              isExpanded={tree.isExpanded}
            />
          ) : (
            <span className="ion-tree-grid__spacer" aria-hidden="true" />
          )}
          <span id={labelId} className="ion-tree-grid__label">
            {cell.rendered}
          </span>
        </span>
      ) : (
        cell.rendered
      )}
    </td>
  );
}

function BodyRow<T>({
  row,
  state,
  specs,
  treeColumn,
  hasChildren,
}: {
  row: Node<T>;
  state: TreeGridState<T>;
  specs: Map<string, TreeGridColumn<TreeGridItem>>;
  treeColumn: Key | null;
  hasChildren: boolean;
}) {
  const ref = useRef<HTMLTableRowElement>(null);
  const { rowProps, expandButtonProps, isSelected } = useTableRow(
    { node: row },
    state,
    ref,
  );
  const { focusProps, isFocusVisible } = useFocusRing();
  const isExpanded =
    hasChildren &&
    (state.expandedKeys === 'all' || state.expandedKeys.has(row.key));
  const cells = [...row.childNodes].filter(
    (n): n is CellNode<T> => n.type === 'cell',
  );

  return (
    <tr
      {...mergeProps(rowProps, focusProps)}
      ref={ref}
      className="ion-table__row ion-tree-grid__row"
      data-selected={isSelected || undefined}
      data-focus-visible={isFocusVisible || undefined}
    >
      {cells.map((cell) =>
        cell.props?.isSelectionCell ? (
          <SelectionCell key={cell.key} cell={cell} state={state} />
        ) : (
          <DataCell
            key={cell.key}
            cell={cell}
            state={state}
            spec={specs.get(String(cell.column?.key))}
            tree={
              cell.column?.key === treeColumn
                ? {
                    level: row.level,
                    hasChildren,
                    isExpanded,
                    expandButtonProps,
                  }
                : undefined
            }
          />
        ),
      )}
    </tr>
  );
}

function RowGroup({
  type,
  children,
}: {
  type: 'thead' | 'tbody';
  children: React.ReactNode;
}) {
  const { rowGroupProps } = useTableRowGroup();
  const Element = type;
  return <Element {...rowGroupProps}>{children}</Element>;
}

function HeaderRow<T>({
  item,
  state,
  children,
}: {
  item: Node<T>;
  state: TreeGridState<T>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLTableRowElement>(null);
  const { rowProps } = useTableHeaderRow({ node: item }, flat(state), ref);
  return (
    <tr {...rowProps} ref={ref}>
      {children}
    </tr>
  );
}

/**
 * TreeGrid — rows that open to show the rows under them, in columns compared
 * down: a cost broken down by agent and run, a budget by team and person, a
 * folder listing with size and owner.
 *
 * HOW IT IS BUILT
 *
 *   - React Aria's table hooks over its tree-table state
 *     (`UNSTABLE_useTreeGridState`): a `<table>` with `role="treegrid"`.
 *     Only open rows are rendered, flat, each with `aria-level`,
 *     `aria-posinset`, `aria-setsize`, and `aria-expanded` when it has
 *     children.
 *   - One tab stop. ↑ ↓ move between rows, or between cells in a column; →
 *     opens a closed row and, on an open one or a leaf, moves into its cells;
 *     ← moves back out to the row, closes an open row, and on a closed one
 *     moves to its parent. Home and End go to the first and last row, and
 *     typing jumps to a row by its first column.
 *   - The first column holds the tree and names the row: each row is indented
 *     by its level, and a chevron, out of the tab order and named "Expand" or
 *     "Collapse" in the user's locale, opens it with a pointer.
 *   - It draws as a Table does — the same density, header, rules and
 *     selected tint — and its selection is Table's: a Checkbox per row and a
 *     select-all in the header. Selection does not cascade: a parent is a row
 *     of its own.
 */
export function TreeGrid<T extends TreeGridItem>({
  columns,
  items,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  expandedKeys,
  defaultExpandedKeys,
  onExpandedChange,
  selectionMode = 'none',
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  onAction,
  density = 'default',
  renderEmptyState,
  id,
  className,
}: TreeGridProps<T>) {
  enableTableNestedRows();

  const { parents, allKeys, disabledKeys } = useMemo(() => {
    const parents = new Set<string>();
    const all: string[] = [];
    const disabled: string[] = [];
    const walk = (list: readonly TreeGridItem[]) =>
      list.forEach((item) => {
        all.push(item.id);
        if (item.isDisabled) disabled.push(item.id);
        if (item.children?.length) {
          parents.add(item.id);
          walk(item.children);
        }
      });
    walk(items);
    return { parents, allKeys: all, disabledKeys: disabled };
  }, [items]);

  const specs = useMemo(
    () =>
      new Map(
        columns.map((c) => [
          c.id,
          c as unknown as TreeGridColumn<TreeGridItem>,
        ]),
      ),
    [columns],
  );
  const first = columns[0]?.id;

  /*
   * "Select all" is `'all'` to React Aria: every row, open or not. Handed on
   * as the ids it stands for, less the disabled ones, so `onSelectionChange`
   * always gets a Set of ids.
   */
  const handleSelection = (keys: Selection) => {
    if (!onSelectionChange) return;
    if (keys === 'all') {
      const off = new Set(disabledKeys);
      onSelectionChange(new Set(allKeys.filter((k) => !off.has(k))));
    } else onSelectionChange(toStrings(keys));
  };

  const state = UNSTABLE_useTreeGridState<T>({
    children: [
      <TableHeader key="header" columns={columns as TreeGridColumn<T>[]}>
        {(column) => (
          // The first column is the row header without being told: React
          // Aria takes it when no column claims to be.
          <Column key={column.id}>{column.header}</Column>
        )}
      </TableHeader>,
      <TableBody key="body" items={items as T[]}>
        {(item) => (
          <Row
            key={item.id}
            // An empty list is no children: React Aria reads any array as
            // "has rows under it" and would mark the row expandable.
            UNSTABLE_childItems={
              item.children?.length ? (item.children as T[]) : undefined
            }
          >
            {(columnKey) => {
              const content = specs.get(String(columnKey))?.cell(item);
              return (
                <Cell
                  textValue={
                    columnKey === first
                      ? (item.textValue ??
                        (typeof content === 'string' ? content : item.id))
                      : typeof content === 'string'
                        ? content
                        : undefined
                  }
                >
                  {content}
                </Cell>
              );
            }}
          </Row>
        )}
      </TableBody>,
    ],
    UNSTABLE_expandedKeys: expandedKeys ? [...expandedKeys] : undefined,
    UNSTABLE_defaultExpandedKeys: defaultExpandedKeys
      ? [...defaultExpandedKeys]
      : undefined,
    UNSTABLE_onExpandedChange: onExpandedChange
      ? (keys) => onExpandedChange(toStrings(keys))
      : undefined,
    selectionMode,
    showSelectionCheckboxes: selectionMode === 'multiple',
    selectedKeys: selectedKeys ? [...selectedKeys] : undefined,
    defaultSelectedKeys: defaultSelectedKeys
      ? [...defaultSelectedKeys]
      : undefined,
    onSelectionChange: handleSelection,
    disabledKeys,
    disabledBehavior: 'selection',
  });

  const ref = useRef<HTMLTableElement>(null);
  const { gridProps } = useTable(
    {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      id,
      onRowAction: onAction ? (key) => onAction(String(key)) : undefined,
    },
    state,
    ref,
  );

  // Filled only for a sort, which this grid does not have; empty, it points
  // at nothing.
  if (!gridProps['aria-describedby']) delete gridProps['aria-describedby'];

  const { collection } = state;
  const rows = [...collection.body.childNodes];

  return (
    <div className="ion-table-container ion-tree-grid-container">
      <table
        {...gridProps}
        ref={ref}
        className={[
          'ion-table',
          `ion-table--${density}`,
          'ion-tree-grid',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <RowGroup type="thead">
          {collection.headerRows.map((headerRow) => (
            <HeaderRow key={headerRow.key} item={headerRow} state={state}>
              {[...headerRow.childNodes].map((column) =>
                column.props?.isSelectionCell ? (
                  <SelectAllCell
                    key={column.key}
                    column={column}
                    state={state}
                  />
                ) : (
                  <ColumnHeader
                    key={column.key}
                    column={column}
                    state={state}
                    spec={specs.get(String(column.key))}
                  />
                ),
              )}
            </HeaderRow>
          ))}
        </RowGroup>
        <RowGroup type="tbody">
          {rows.length === 0 && renderEmptyState ? (
            <tr role="row">
              <td
                role="rowheader"
                colSpan={collection.columnCount}
                className="ion-tree-grid__empty"
              >
                {renderEmptyState()}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <BodyRow
                key={row.key}
                row={row}
                state={state}
                specs={specs}
                treeColumn={state.treeColumn}
                hasChildren={parents.has(String(row.key))}
              />
            ))
          )}
        </RowGroup>
      </table>
    </div>
  );
}

TreeGrid.displayName = 'TreeGrid';
