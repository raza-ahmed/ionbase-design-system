'use client';

import React, { forwardRef, useMemo, useRef } from 'react';
import {
  useMenu,
  useMenuItem,
  useMenuSection,
  useSeparator,
  type AriaMenuProps,
} from 'react-aria';
import { useTreeState, type TreeState } from 'react-stately';
import {
  CollectionBuilder,
  Item,
  Section,
  getChildNodes,
} from '@react-stately/collections';
import type { ItemProps, Key, Node, Selection } from '@react-types/shared';
import { resolveDisabled } from './resolve-disabled.js';

export interface MenuProps<T extends object> extends AriaMenuProps<T> {
  className?: string;
  style?: React.CSSProperties;
}

export interface MenuItemProps<T extends object = object> extends Omit<
  ItemProps<T>,
  'title'
> {
  /** Figma's `Show Icon` + `Select Icon` swap. */
  icon?: React.ReactNode;
  /** Whether the item is disabled. Listed, skipped by the arrow keys. */
  isDisabled?: boolean;
  /**
   * @deprecated Use `isDisabled`. Accepted as an alias for one minor version.
   */
  disabled?: boolean;
  /**
   * @deprecated Put the item's key in Menu's `selectedKeys`. Accepted for one
   * minor version: when no item's key is in `selectedKeys` and Menu is given
   * neither `selectedKeys` nor `defaultSelectedKeys`, the items passing this
   * become the selection.
   */
  isSelected?: boolean;
}

/**
 * One row of a Menu. A collection element, like TabItem: it renders nothing
 * itself — Menu reads its props and draws the row — so it only means anything
 * as a direct child of Menu or MenuSection. Give it a `key`; that key is what
 * `onAction` and `selectedKeys` speak in.
 */
export function MenuItem<T extends object>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _props: MenuItemProps<T>,
): React.ReactElement | null {
  return null;
}

/*
 * The collection builder asks the element's TYPE how to turn it into a node.
 * Borrowing Item's answer is what makes MenuItem a collection element while
 * keeping its own prop type: the builder copies every prop onto `node.props`,
 * which is where Menu reads `icon` and `isDisabled` back from.
 */
(MenuItem as unknown as { getCollectionNode: unknown }).getCollectionNode = (
  Item as unknown as { getCollectionNode: unknown }
).getCollectionNode;

MenuItem.displayName = 'MenuItem';

/**
 * A named group of MenuItems. `title` is Figma's `Menu Section Title`; without
 * one, pass `aria-label` and the group is set off by a rule instead.
 */
export { Section as MenuSection };

/** Figma's trailing check. Always occupies its slot so rows never reflow as the
 *  selection moves; only its visibility changes. */
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m5 13 4 4L19 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type ItemFlags = {
  disabled: Key[];
  selected: Key[];
  hasLegacySelected: boolean;
};

/**
 * Reads the two deprecated item props before the menu's state exists.
 *
 * `isDisabled` needs nothing here: react-stately's SelectionManager reads an
 * item's own `isDisabled` off `node.props`, and the arrow keys skip it. The
 * `disabled` alias it has never heard of, so that one has to reach
 * `useTreeState` as a key — a row that only LOOKED disabled would still take
 * focus and fire `onAction`. `isSelected` has to become `selectedKeys` for the
 * same reason. Building the collection once more is the price of the aliases,
 * and a menu is small enough that the price is nothing. Delete this with them.
 */
function readItemFlags<T extends object>(props: MenuProps<T>): ItemFlags {
  const flags: ItemFlags = {
    disabled: [],
    selected: [],
    hasLegacySelected: false,
  };
  const visit = (nodes: Iterable<Node<T>>) => {
    for (const node of nodes) {
      if (node.type === 'section') {
        visit(node.childNodes);
        continue;
      }
      const p = node.props as MenuItemProps<T> | undefined;
      if (!p) continue;
      if (
        p.isDisabled === undefined &&
        resolveDisabled(p.isDisabled, p.disabled)
      )
        flags.disabled.push(node.key);
      if (p.isSelected !== undefined) {
        flags.hasLegacySelected = true;
        if (p.isSelected) flags.selected.push(node.key);
      }
    }
  };
  visit(new CollectionBuilder<T>().build(props));
  return flags;
}

function MenuRow<T extends object>({
  item,
  state,
}: {
  item: Node<T>;
  state: TreeState<T>;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const {
    menuItemProps,
    labelProps,
    isFocused,
    isFocusVisible,
    isSelected,
    isDisabled,
  } = useMenuItem({ key: item.key }, state, ref);
  const icon = (item.props as MenuItemProps<T> | undefined)?.icon;

  return (
    <li
      {...menuItemProps}
      ref={ref}
      className={[
        'ion-menu__item',
        isSelected ? 'ion-menu__item--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-focused={isFocused || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-disabled={isDisabled || undefined}
    >
      {icon && (
        <span className="ion-menu__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span {...labelProps} className="ion-menu__label">
        {item.rendered}
      </span>
      {state.selectionManager.selectionMode !== 'none' && (
        <span className="ion-menu__check" aria-hidden="true">
          <Check />
        </span>
      )}
    </li>
  );
}

function MenuSectionGroup<T extends object>({
  section,
  state,
  isFirst,
}: {
  section: Node<T>;
  state: TreeState<T>;
  isFirst: boolean;
}) {
  const { itemProps, headingProps, groupProps } = useMenuSection({
    heading: section.rendered,
    'aria-label': section['aria-label'],
  });
  const { separatorProps } = useSeparator({ elementType: 'li' });

  return (
    <>
      {/* A titled section draws its own rule beside the title, which is Figma's
          Menu Section Title. An untitled one needs a separator to be seen as a
          group at all — except the first, which has nothing above it. */}
      {!isFirst && !section.rendered && (
        <li {...separatorProps} className="ion-menu__separator" />
      )}
      <li {...itemProps} className="ion-menu__section">
        {section.rendered && (
          <span {...headingProps} className="ion-menu__section-title">
            {section.rendered}
          </span>
        )}
        <ul {...groupProps} className="ion-menu__group">
          {[...getChildNodes(section, state.collection)].map((node) => (
            <MenuRow key={node.key} item={node} state={state} />
          ))}
        </ul>
      </li>
    </>
  );
}

/**
 * Menu — Figma `Menu` (82:306), `Menu Item` and `Menu Section Title`.
 *
 * A real ARIA menu: `role="menu"`, one tab stop, arrow keys, Home and End,
 * typeahead, and disabled rows listed but skipped. Figma's `Type` is
 * `selectionMode` — Single draws one check, Multi draws several — and with
 * a selection mode the rows become `menuitemradio` / `menuitemcheckbox` and
 * announce their checked state.
 *
 * Before 0.82.0 this was an honest `<ul>` of buttons that did NOT claim the
 * role, because it could not keep the role's promises. It now keeps them, so it
 * claims it. It is still the surface only: what opens it, and where it sits,
 * belong to the caller until MenuTrigger exists.
 */
export const Menu = forwardRef(function Menu<T extends object>(
  props: MenuProps<T>,
  forwardedRef: React.Ref<HTMLUListElement>,
) {
  const { className, style } = props;

  const flags = useMemo(
    () => readItemFlags(props),
    // Only the collection's inputs matter here; the rest of `props` changes on
    // every render and would rebuild the collection for nothing.
    [props.children, props.items],
  );

  const disabledKeys = useMemo(
    () => new Set<Key>([...(props.disabledKeys ?? []), ...flags.disabled]),
    [props.disabledKeys, flags.disabled],
  );

  const usesLegacySelection =
    flags.hasLegacySelected &&
    props.selectedKeys === undefined &&
    props.defaultSelectedKeys === undefined;

  const stateProps: MenuProps<T> = {
    ...props,
    disabledKeys,
    ...(usesLegacySelection && {
      selectedKeys: new Set(flags.selected) as Selection,
      selectionMode:
        props.selectionMode ??
        (flags.selected.length > 1 ? 'multiple' : 'single'),
    }),
  };

  const state = useTreeState(stateProps);
  const ref = useRef<HTMLUListElement>(null);
  const { menuProps } = useMenu(stateProps, state, ref);

  const setRef = (el: HTMLUListElement | null) => {
    ref.current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  };

  const nodes = [...state.collection];

  return (
    <ul
      {...menuProps}
      ref={setRef}
      style={style}
      className={['ion-menu', className].filter(Boolean).join(' ')}
    >
      {nodes.map((node, i) =>
        node.type === 'section' ? (
          <MenuSectionGroup
            key={node.key}
            section={node}
            state={state}
            isFirst={i === 0}
          />
        ) : (
          <MenuRow key={node.key} item={node} state={state} />
        ),
      )}
    </ul>
  );
}) as <T extends object>(
  props: MenuProps<T> & { ref?: React.Ref<HTMLUListElement> },
) => React.ReactElement;
