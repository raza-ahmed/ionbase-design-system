'use client';

import React, { useMemo, useRef } from 'react';
import {
  mergeProps,
  useButton,
  useFocusRing,
  useTree,
  useTreeItem,
  type AriaButtonProps,
} from 'react-aria';
import { Item, useTreeState, type TreeState } from 'react-stately';
import type { Key, Node, Selection } from '@react-types/shared';

export interface TreeViewItem {
  /** Unique across the whole tree, not only among siblings. */
  id: string;
  /** The row's text. */
  label: React.ReactNode;
  /** Typeahead and the accessible name when `label` is not a string. */
  textValue?: string;
  /** A second line, quieter: a count, a path, a type. */
  description?: React.ReactNode;
  /** A 16px Icon before the label — a folder, a team. */
  icon?: React.ReactNode;
  children?: readonly TreeViewItem[];
  isDisabled?: boolean;
}

export type TreeViewSelectionMode = 'none' | 'single' | 'multiple';

export interface TreeViewProps {
  items: readonly TreeViewItem[];
  /** Names the tree. Required unless `aria-labelledby` is given. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Rows that are open. Controlled. */
  expandedKeys?: Iterable<string>;
  /** Rows open at first. */
  defaultExpandedKeys?: Iterable<string>;
  onExpandedChange?: (keys: Set<string>) => void;
  /**
   * `none` (default): a row press opens or closes it, or fires `onAction`.
   * `single` / `multiple`: a press selects, and `multiple` draws a check.
   */
  selectionMode?: TreeViewSelectionMode;
  selectedKeys?: Iterable<string>;
  defaultSelectedKeys?: Iterable<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  /**
   * A row was activated — Enter, or a press when nothing is selectable. For
   * "open this": navigating to a folder, showing a record.
   */
  onAction?: (key: string) => void;
  id?: string;
  className?: string;
}

interface RowMeta {
  item: TreeViewItem;
  hasChildren: boolean;
  /** 1-based, among its siblings. */
  posInSet: number;
  setSize: number;
}

/** Keys to strings — every key in this tree is an item `id`. */
const toStrings = (keys: Selection | Set<Key>): Set<string> =>
  new Set([...(keys as Set<Key>)].map(String));

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

const CheckMark = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m5 13 4 4L19 7"
      stroke="currentColor"
      strokeWidth="3"
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
        'ion-tree-view__toggle',
        isExpanded ? 'ion-tree-view__toggle--expanded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Chevron />
    </button>
  );
}

function Row({
  node,
  state,
  meta,
  showCheck,
}: {
  node: Node<TreeViewItem>;
  state: TreeState<TreeViewItem>;
  meta: RowMeta;
  showCheck: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    rowProps,
    gridCellProps,
    expandButtonProps,
    descriptionProps,
    isSelected,
    isDisabled,
  } = useTreeItem({ node, hasChildItems: meta.hasChildren }, state, ref);
  const { focusProps, isFocusVisible } = useFocusRing();
  const isExpanded = meta.hasChildren && state.expandedKeys.has(node.key);
  const { item } = meta;

  /*
   * Position among siblings comes from the data, not the hook: React Aria
   * derives it from `collection.getChildren`, which the hooks-built
   * TreeCollection does not have, and without it every nested row reports
   * its place in the whole visible list and a set size of 0.
   */
  const position = {
    'aria-posinset': meta.posInSet,
    'aria-setsize': meta.setSize,
    'aria-describedby': item.description ? descriptionProps.id : undefined,
  };

  return (
    <div
      {...mergeProps(rowProps, focusProps, position)}
      ref={ref}
      className={[
        'ion-tree-view__row',
        isSelected ? 'ion-tree-view__row--selected' : '',
        isDisabled ? 'ion-tree-view__row--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-focus-visible={isFocusVisible || undefined}
      style={{ '--ion-tree-view-level': node.level } as React.CSSProperties}
    >
      <div {...gridCellProps} className="ion-tree-view__cell">
        {meta.hasChildren ? (
          <ExpandButton {...expandButtonProps} isExpanded={isExpanded} />
        ) : (
          <span className="ion-tree-view__spacer" aria-hidden="true" />
        )}
        {showCheck && (
          // Drawn, not a Checkbox: the row's aria-selected is the whole
          // announcement, and a real checkbox would be a second, competing one.
          <span className="ion-tree-view__check" aria-hidden="true">
            <CheckMark />
          </span>
        )}
        {item.icon && (
          <span className="ion-tree-view__icon" aria-hidden="true">
            {item.icon}
          </span>
        )}
        <span className="ion-tree-view__text">
          <span className="ion-tree-view__label">{item.label}</span>
          {item.description && (
            <span {...descriptionProps} className="ion-tree-view__description">
              {item.description}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * TreeView — a hierarchy you open level by level: folders, an org chart,
 * nested permissions.
 *
 * NOT FOR NAVIGATION. A site's own pages, nested, are Sidebar sections: links
 * with `aria-current`, reached by Tab. A tree is one tab stop that the arrow
 * keys move inside, which is right for data and wrong for a menu of pages.
 *
 * HOW IT IS BUILT
 *
 *   - React Aria's `useTree` and `useTreeItem`, over `useTreeState`: a
 *     `treegrid` of flat rows, each with `aria-level`, `aria-expanded` and
 *     its position among its siblings. One tab stop; ↑ ↓ move between visible
 *     rows, → opens a row, ← closes it or moves to its parent, Home and End
 *     go to the ends, and typing jumps to a label. A second → on an open row
 *     stays put: in a treegrid → moves into the row's cells, not its children
 *     — ↓ is the way down.
 *   - The chevron is a button out of the tab order, named "Expand" or
 *     "Collapse" in the user's locale, so a pointer can open a row that a
 *     press would select.
 *   - Only open rows are rendered. A closed branch's children are not in the
 *     DOM, and the keyboard cannot land on them.
 *   - `multiple` draws a check in each row — MultiSelect's box, for the same
 *     reason: "pick several" has to look like it. Selection does not cascade:
 *     a parent is an item of its own, and ticking it ticks only it.
 */
export function TreeView({
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
  id,
  className,
}: TreeViewProps) {
  const { meta, disabledKeys } = useMemo(() => {
    const meta = new Map<string, RowMeta>();
    const disabled: string[] = [];
    const walk = (list: readonly TreeViewItem[]) =>
      list.forEach((item, i) => {
        meta.set(item.id, {
          item,
          hasChildren: !!item.children?.length,
          posInSet: i + 1,
          setSize: list.length,
        });
        if (item.isDisabled) disabled.push(item.id);
        if (item.children) walk(item.children);
      });
    walk(items);
    return { meta, disabledKeys: disabled };
  }, [items]);

  const state = useTreeState<TreeViewItem>({
    items: items as TreeViewItem[],
    children: (item: TreeViewItem) => (
      <Item
        key={item.id}
        textValue={
          item.textValue ??
          (typeof item.label === 'string' ? item.label : item.id)
        }
        childItems={item.children as TreeViewItem[] | undefined}
      >
        {item.label}
      </Item>
    ),
    expandedKeys: expandedKeys ? new Set(expandedKeys) : undefined,
    defaultExpandedKeys: defaultExpandedKeys
      ? new Set(defaultExpandedKeys)
      : undefined,
    onExpandedChange: onExpandedChange
      ? (keys) => onExpandedChange(toStrings(keys))
      : undefined,
    selectionMode,
    selectedKeys: selectedKeys ? new Set(selectedKeys) : undefined,
    defaultSelectedKeys: defaultSelectedKeys
      ? new Set(defaultSelectedKeys)
      : undefined,
    onSelectionChange: onSelectionChange
      ? (keys) => onSelectionChange(toStrings(keys))
      : undefined,
    disabledKeys,
    disabledBehavior: 'all',
  });

  /*
   * React Aria's tree hooks were written for the react-aria-components
   * collection, which has `getChildren`; the one `useTreeState` builds does
   * not, and `useTreeItem` indexes into an empty sibling list without it —
   * a crash on the first nested row. This view adds it from each node's own
   * `childNodes` and changes nothing else: the prototype is the collection.
   */
  const treeState = useMemo<TreeState<TreeViewItem>>(() => {
    const collection = Object.create(state.collection, {
      getChildren: {
        value: (key: Key) => state.collection.getItem(key)?.childNodes ?? [],
      },
    });
    return {
      collection,
      disabledKeys: state.disabledKeys,
      expandedKeys: state.expandedKeys,
      toggleKey: state.toggleKey,
      setExpandedKeys: state.setExpandedKeys,
      selectionManager: state.selectionManager,
    };
  }, [state]);

  const ref = useRef<HTMLDivElement>(null);
  const { gridProps } = useTree(
    {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      id,
      onAction: onAction ? (key) => onAction(String(key)) : undefined,
    },
    treeState,
    ref,
  );

  const rows = [...state.collection.getKeys()]
    .map((k) => state.collection.getItem(k))
    .filter((n): n is Node<TreeViewItem> => n?.type === 'item');

  return (
    <div
      {...gridProps}
      ref={ref}
      className={['ion-tree-view', className || ''].filter(Boolean).join(' ')}
    >
      {rows.map((node) => (
        <Row
          key={node.key}
          node={node}
          state={treeState}
          meta={meta.get(String(node.key))!}
          showCheck={selectionMode === 'multiple'}
        />
      ))}
    </div>
  );
}

TreeView.displayName = 'TreeView';
