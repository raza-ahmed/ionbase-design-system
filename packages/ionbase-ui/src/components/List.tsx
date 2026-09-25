'use client';

import React, { useRef } from 'react';
import {
  mergeProps,
  useFocusRing,
  useGridList,
  useGridListItem,
  useGridListSelectionCheckbox,
} from 'react-aria';
import { Item, useListState, type ListState } from 'react-stately';
import type { Key, Node, Selection } from '@react-types/shared';
import { Checkbox } from './Checkbox.js';

export interface ListItem {
  /** Unique within the list. Selection is held by id. */
  id: string;
  /** The row's text — a task, a file name, a person. */
  label: React.ReactNode;
  /** Typeahead and the row's name when `label` is not a string. */
  textValue?: string;
  /** A second line, quieter: an agent and a time, a path, a preview. */
  description?: React.ReactNode;
  /** Before the text: an Avatar, or a 16px Icon. Decorative. */
  leading?: React.ReactNode;
  /** After the text, not interactive: a Badge, a time, a size. */
  meta?: React.ReactNode;
  /** The row opens this — a record's page. Takes the place of `onAction`. */
  href?: string;
  isDisabled?: boolean;
}

export type ListSelectionMode = 'none' | 'single' | 'multiple';

export interface ListProps {
  items: readonly ListItem[];
  /** Names the list. Required unless `aria-labelledby` is given. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /**
   * `none` (default): a press opens the row — `href` or `onAction`.
   * `single`: a press selects one; Enter or a double click opens it.
   * `multiple`: each row has a checkbox. A press opens the row while nothing
   * is selected, and toggles it once something is.
   */
  selectionMode?: ListSelectionMode;
  selectedKeys?: Iterable<string>;
  defaultSelectedKeys?: Iterable<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /** A row was opened — "show this run". Rows with an `href` follow it instead. */
  onAction?: (key: string) => void;
  /**
   * Buttons at the end of a row — archive, a Menu of more. Reached with → from
   * the row, and each needs a name that says which row it acts on.
   */
  renderActions?: (item: ListItem) => React.ReactNode;
  /** Shown, in a row of its own, when `items` is empty. */
  renderEmptyState?: () => React.ReactNode;
  id?: string;
  className?: string;
}

/** Keys to strings — every key in this list is an item `id`. */
const toStrings = (keys: Selection): Set<string> =>
  new Set([...(keys as Set<Key>)].map(String));

function SelectionBox({
  node,
  state,
}: {
  node: Node<ListItem>;
  state: ListState<ListItem>;
}) {
  const { checkboxProps } = useGridListSelectionCheckbox(
    { key: node.key },
    state,
  );
  /*
   * The row ignores presses on its focusable children, but the box's visible
   * square is a `<label>`, which is not focusable: a click on it would reach
   * the row as a press too, and the row would toggle once for the press and
   * once for the label's click. Stopped here, the checkbox is the only thing
   * a click on it changes.
   */
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <span
      className="ion-list__check"
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={stop}
    >
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
  );
}

function Row({
  node,
  state,
  showCheck,
  actions,
}: {
  node: Node<ListItem>;
  state: ListState<ListItem>;
  showCheck: boolean;
  actions: React.ReactNode;
}) {
  const item = node.value!;
  const ref = useRef<HTMLDivElement>(null);
  const {
    rowProps,
    gridCellProps,
    descriptionProps,
    isSelected,
    isDisabled,
    hasAction,
  } = useGridListItem({ node }, state, ref);
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <div
      {...mergeProps(rowProps, focusProps)}
      ref={ref}
      className={[
        'ion-list__row',
        isSelected ? 'ion-list__row--selected' : '',
        isDisabled ? 'ion-list__row--disabled' : '',
        hasAction ? 'ion-list__row--actionable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-focus-visible={isFocusVisible || undefined}
    >
      <div {...gridCellProps} className="ion-list__cell">
        {showCheck && <SelectionBox node={node} state={state} />}
        {item.leading && (
          <span className="ion-list__leading" aria-hidden="true">
            {item.leading}
          </span>
        )}
        <span className="ion-list__text">
          <span className="ion-list__label">{item.label}</span>
          {item.description && (
            <span {...descriptionProps} className="ion-list__description">
              {item.description}
            </span>
          )}
        </span>
        {item.meta && <span className="ion-list__meta">{item.meta}</span>}
        {actions && <span className="ion-list__actions">{actions}</span>}
      </div>
    </div>
  );
}

/**
 * List — rows of records to open, pick or act on: an approval inbox, a list
 * of files, "choose one of these" that is not a form field.
 *
 * NOT A TABLE, NOT A LISTBOX, NOT A <ul>
 *
 *   - A Table is for columns that are compared down. A List row is one thing
 *     read across — a label, a line under it, a badge — with no header.
 *   - A listbox (Select, Combobox) holds values for a form and nothing
 *     inside its options can be focused. A List row can hold buttons.
 *   - A `<ul>` of links is right for a short static list. It is a tab stop
 *     per row, and it has no selection; past a handful of rows, or once rows
 *     are picked, it wants this.
 *
 * HOW IT IS BUILT
 *
 *   - React Aria's `useGridList` and `useGridListItem` over `useListState`: a
 *     `grid` of `row`s, each one `gridcell`. One tab stop; ↑ ↓ move between
 *     rows, Home and End go to the ends, typing jumps to a label. → moves into
 *     a row's own buttons and ← back out, so a row's actions are reachable
 *     without a tab stop each.
 *   - `href` rows are links: a press follows them, and a modified click opens
 *     a new tab, through React Aria's router.
 *   - `multiple` gives each row a real Checkbox, named "Select" and the row's
 *     label. Not drawn, as TreeView's is: here a press opens the row, so the
 *     box is the only way a pointer can select one without opening it.
 *   - An empty list keeps its name and says why it is empty, in a row, so a
 *     screen reader landing on it hears more than "grid, 0 rows".
 */
export function List({
  items,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  selectionMode = 'none',
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  onAction,
  renderActions,
  renderEmptyState,
  id,
  className,
}: ListProps) {
  const state = useListState<ListItem>({
    items: items as ListItem[],
    children: (item: ListItem) => (
      <Item
        key={item.id}
        textValue={
          item.textValue ??
          (typeof item.label === 'string' ? item.label : item.id)
        }
        href={item.href}
      >
        {item.label}
      </Item>
    ),
    selectionMode,
    // Single: a press picks, Enter opens — a file list. Multiple: the box
    // picks, a press opens until something is picked — an inbox.
    selectionBehavior: selectionMode === 'single' ? 'replace' : 'toggle',
    selectedKeys: selectedKeys ? new Set(selectedKeys) : undefined,
    defaultSelectedKeys: defaultSelectedKeys
      ? new Set(defaultSelectedKeys)
      : undefined,
    onSelectionChange: onSelectionChange
      ? (keys) => onSelectionChange(toStrings(keys))
      : undefined,
    disabledKeys: items.filter((i) => i.isDisabled).map((i) => i.id),
    disabledBehavior: 'all',
  });

  const ref = useRef<HTMLDivElement>(null);
  const { gridProps } = useGridList(
    {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      id,
      onAction: onAction ? (key) => onAction(String(key)) : undefined,
    },
    state,
    ref,
  );

  const rows = [...state.collection];

  return (
    <div
      {...gridProps}
      ref={ref}
      className={['ion-list', className || ''].filter(Boolean).join(' ')}
    >
      {rows.length === 0 && renderEmptyState ? (
        <div role="row" className="ion-list__empty">
          <div role="gridcell">{renderEmptyState()}</div>
        </div>
      ) : (
        rows.map((node) => (
          <Row
            key={node.key}
            node={node}
            state={state}
            showCheck={selectionMode === 'multiple'}
            actions={renderActions?.(node.value!)}
          />
        ))
      )}
    </div>
  );
}

List.displayName = 'List';
