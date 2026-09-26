'use client';

import React, {
  cloneElement,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DismissButton,
  Overlay,
  mergeProps,
  useMenu,
  useMenuItem,
  useMenuSection,
  useMenuTrigger,
  usePopover,
  useSeparator,
  useSubmenuTrigger,
  type AriaMenuOptions,
  type AriaMenuProps,
  type Placement,
} from 'react-aria';
import {
  useMenuTriggerState,
  useSubmenuTriggerState,
  useTreeState,
  type RootMenuTriggerState,
  type TreeState,
} from 'react-stately';
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

export interface MenuItemProps<T extends object = object> extends ItemProps<T> {
  /**
   * Only on a row that opens a submenu: the row's label. Its children are then
   * the submenu's MenuItems rather than its label. Submenus open only inside a
   * MenuTrigger — a standalone Menu has nothing to open them from.
   */
  title?: React.ReactNode;
  /** Figma's `Show Leading Icon` + `Leading Icon` swap. */
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

/** Figma draws no submenu row; this is Button's chevron, turned to point
 *  where the submenu opens. Mirrored in right-to-left layouts by the CSS. */
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

/**
 * What MenuTrigger hands the Menu it opens: the ARIA wiring from
 * `useMenuTrigger` (the label, autofocus and close-on-action), and the root
 * state every submenu's state is derived from.
 */
const MenuTriggerContext = createContext<{
  rootState: RootMenuTriggerState;
  menuProps: AriaMenuOptions<object>;
} | null>(null);

/**
 * What a menu hands the submenus beneath it. `onAction` is the ROOT menu's:
 * an action chosen three levels down is still one of the actions the caller
 * listed, and it reaches the one handler the caller wrote.
 */
const MenuTreeContext = createContext<{
  rootState: RootMenuTriggerState;
  onAction?: (key: Key) => void;
} | null>(null);

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

interface RowProps<T extends object> {
  item: Node<T>;
  state: TreeState<T>;
  menuRef: React.RefObject<HTMLUListElement | null>;
}

function MenuRow<T extends object>(props: RowProps<T>) {
  const tree = useContext(MenuTreeContext);
  return props.item.hasChildNodes && tree ? (
    <SubmenuRow {...props} tree={tree} />
  ) : (
    <ActionRow {...props} />
  );
}

function ActionRow<T extends object>({ item, state }: RowProps<T>) {
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

/**
 * A row that opens a submenu. Right arrow, Enter or Space opens it with focus
 * on its first row; hovering opens it after a short delay; left arrow or
 * Escape closes it and puts focus back on this row.
 *
 * The submenu is NOT modal: the parent menu stays on screen and hoverable, so
 * the pointer can move between the two. react-aria makes that choice, and it
 * is the right one — a submenu that trapped focus would make moving back up a
 * level a keyboard-only act.
 */
function SubmenuRow<T extends object>({
  item,
  state,
  menuRef,
  tree,
}: RowProps<T> & {
  tree: NonNullable<React.ContextType<typeof MenuTreeContext>>;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const submenuState = useSubmenuTriggerState(
    { triggerKey: item.key },
    tree.rootState,
  );
  const { submenuTriggerProps, submenuProps, popoverProps } = useSubmenuTrigger(
    { parentMenuRef: menuRef, submenuRef, type: 'menu' },
    submenuState,
    ref,
  );
  // `isOpen` describes the trigger, it is not a menu-item option.
  const { isOpen, ...triggerOptions } = submenuTriggerProps;
  const { menuItemProps, labelProps, isFocused, isFocusVisible, isDisabled } =
    useMenuItem({ ...triggerOptions, key: item.key }, state, ref);
  const icon = (item.props as MenuItemProps<T> | undefined)?.icon;

  return (
    <li
      {...menuItemProps}
      ref={ref}
      className="ion-menu__item ion-menu__item--submenu"
      data-focused={isFocused || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-disabled={isDisabled || undefined}
      data-open={isOpen || undefined}
    >
      {icon && (
        <span className="ion-menu__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span {...labelProps} className="ion-menu__label">
        {item.rendered}
      </span>
      <span className="ion-menu__chevron" aria-hidden="true">
        <Chevron />
      </span>
      {submenuState.isOpen && (
        <MenuPopover
          state={submenuState}
          triggerRef={ref}
          popoverRef={submenuRef}
          placement="end top"
          isNonModal={popoverProps.isNonModal}
          shouldCloseOnInteractOutside={
            popoverProps.shouldCloseOnInteractOutside
          }
          disableFocusManagement={popoverProps.disableFocusManagement}
        >
          <MenuList
            {...(submenuProps as unknown as MenuProps<object>)}
            onAction={tree.onAction}
          >
            {(item.props as MenuItemProps<T>).children as never}
          </MenuList>
        </MenuPopover>
      )}
    </li>
  );
}

interface MenuPopoverProps {
  state: { isOpen: boolean; close: () => void };
  triggerRef: React.RefObject<Element | null>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  placement: Placement;
  isNonModal?: boolean;
  shouldCloseOnInteractOutside?: (element: Element) => boolean;
  disableFocusManagement?: boolean;
  children: React.ReactNode;
}

/**
 * The floating surface a menu opens on. Mounted only while open, for the
 * reason AGENTS.md gives about overlay hooks: `usePopover` has to be called in
 * the component that mounts with the overlay.
 *
 * Figma's Menu already IS the surface — border, radius, Shadow/lg — so this
 * wrapper paints nothing. It positions, and it carries the underlay that makes
 * an outside click close the root menu. A submenu has no underlay: it is
 * non-modal, and an underlay would swallow the pointer on its way back to the
 * parent.
 */
function MenuPopover({
  state,
  triggerRef,
  popoverRef,
  placement,
  isNonModal,
  shouldCloseOnInteractOutside,
  disableFocusManagement,
  children,
}: MenuPopoverProps) {
  const { popoverProps, underlayProps } = usePopover(
    {
      triggerRef,
      popoverRef,
      placement,
      offset: isNonModal ? 0 : 4,
      // Line the submenu's first row up with the row that opened it: the
      // menu's own padding plus its border.
      crossOffset: isNonModal ? -7 : 0,
      isNonModal,
      shouldCloseOnInteractOutside,
    },
    state as never,
  );

  return (
    <Overlay disableFocusManagement={disableFocusManagement}>
      {!isNonModal && (
        <div {...underlayProps} className="ion-menu-popover__underlay" />
      )}
      <div {...popoverProps} ref={popoverRef} className="ion-menu-popover">
        {/* iOS VoiceOver has no Escape key; these bracket the menu and close
            it. Same reason as Combobox's. */}
        {!isNonModal && <DismissButton onDismiss={state.close} />}
        {children}
        {!isNonModal && <DismissButton onDismiss={state.close} />}
      </div>
    </Overlay>
  );
}

function MenuSectionGroup<T extends object>({
  section,
  state,
  isFirst,
  menuRef,
}: {
  section: Node<T>;
  state: TreeState<T>;
  isFirst: boolean;
  menuRef: React.RefObject<HTMLUListElement | null>;
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
            <MenuRow
              key={node.key}
              item={node}
              state={state}
              menuRef={menuRef}
            />
          ))}
        </ul>
      </li>
    </>
  );
}

/**
 * The list itself, shared by the root menu and every submenu. It knows nothing
 * about triggers: whatever opened it has already put its wiring into `props`.
 */
const MenuList = forwardRef(function MenuList<T extends object>(
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
            menuRef={ref}
          />
        ) : (
          <MenuRow key={node.key} item={node} state={state} menuRef={ref} />
        ),
      )}
    </ul>
  );
}) as <T extends object>(
  props: MenuProps<T> & { ref?: React.Ref<HTMLUListElement> },
) => React.ReactElement;

/**
 * Menu — Figma `Menu` (82:306), `Menu Item` and `Menu Section Title`.
 *
 * A real ARIA menu: `role="menu"`, one tab stop, arrow keys, Home and End,
 * typeahead, and disabled rows listed but skipped. Figma's `Type` is
 * `selectionMode` — Single draws one check, Multi draws several — and with
 * a selection mode the rows become `menuitemradio` / `menuitemcheckbox` and
 * announce their checked state.
 *
 * On its own it is the surface only, rendered in flow. Inside a MenuTrigger it
 * floats, opens and closes, is named by its trigger, and can open submenus.
 */
export const Menu = forwardRef(function Menu<T extends object>(
  props: MenuProps<T>,
  forwardedRef: React.Ref<HTMLUListElement>,
) {
  const trigger = useContext(MenuTriggerContext);
  if (!trigger) return <MenuList {...props} ref={forwardedRef} />;

  /*
   * The trigger names the menu through aria-labelledby. An aria-label the
   * caller passed is kept and wins, because a trigger reading "⋯" or "Options"
   * is often a worse name than the one the caller wrote.
   */
  const { 'aria-labelledby': labelledBy, ...wiring } = trigger.menuProps;
  const named = props['aria-label'] || props['aria-labelledby'];
  const merged = mergeProps(
    wiring,
    named ? {} : { 'aria-labelledby': labelledBy },
    props,
  ) as MenuProps<T>;

  return (
    <MenuTreeContext.Provider
      value={{
        rootState: trigger.rootState,
        onAction: props.onAction as ((key: Key) => void) | undefined,
      }}
    >
      <MenuList {...merged} ref={forwardedRef} />
    </MenuTreeContext.Provider>
  );
}) as <T extends object>(
  props: MenuProps<T> & { ref?: React.Ref<HTMLUListElement> },
) => React.ReactElement;

export type MenuTriggerPlacement =
  'bottom start' | 'bottom end' | 'top start' | 'top end';

export interface MenuTriggerProps {
  /**
   * Exactly two children: the Button that opens the menu, then the Menu. The
   * Button must accept a ref and react-aria press props — IonBase's Button
   * does; a plain `<button>` does not.
   */
  children: [React.ReactElement, React.ReactElement];
  /**
   * Where the menu opens, relative to the trigger. A preference, not a
   * guarantee: it flips when there is no room.
   */
  placement?: MenuTriggerPlacement;
  /** Whether the trigger is disabled. */
  isDisabled?: boolean;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * MenuTrigger — a Button that opens a Menu.
 *
 * The "⋯" overflow menu is this with an icon-only Button; there is no separate
 * component for it, because the only difference is the Button's content and
 * its required aria-label.
 *
 * `useMenuTrigger` does what a Popover wrapped round a Menu could not: the
 * trigger announces `aria-haspopup="menu"` and `aria-expanded`, the menu is
 * named by the trigger, ArrowDown and ArrowUp open it with focus on the first
 * or last row, and choosing an action closes it and returns focus to the
 * trigger.
 */
export function MenuTrigger({
  children,
  placement = 'bottom start',
  isDisabled,
  ...stateProps
}: MenuTriggerProps) {
  const [trigger, menu] = React.Children.toArray(children) as [
    React.ReactElement,
    React.ReactElement,
  ];
  const rootState = useMenuTriggerState(stateProps);
  const triggerRef = useRef<HTMLElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const { menuTriggerProps, menuProps } = useMenuTrigger(
    { isDisabled },
    rootState,
    triggerRef,
  );

  return (
    <>
      {cloneElement(
        trigger,
        mergeProps(trigger.props as Record<string, unknown>, {
          ...menuTriggerProps,
          isDisabled,
          ref: triggerRef,
        }),
      )}
      {rootState.isOpen && (
        <MenuPopover
          state={rootState}
          triggerRef={triggerRef}
          popoverRef={popoverRef}
          placement={placement as Placement}
        >
          <MenuTriggerContext.Provider
            value={{
              rootState,
              menuProps: menuProps as AriaMenuOptions<object>,
            }}
          >
            {menu}
          </MenuTriggerContext.Provider>
        </MenuPopover>
      )}
    </>
  );
}

MenuTrigger.displayName = 'MenuTrigger';

export interface ContextMenuProps {
  /**
   * The thing the menu is for — a table row, a card, a file. One element; it
   * receives the right-click and keyboard handlers, and keeps its own. It
   * must pass `onContextMenu` and `onKeyDown` through to the DOM, as
   * IonBase's TableRow and any host element do.
   */
  children: React.ReactElement;
  /** The Menu to open, with its MenuItems and `onAction`. */
  menu: React.ReactElement;
  /**
   * The menu's name, since no button names it: "Actions for Invoice
   * reconciler". Required.
   */
  'aria-label': string;
  /** Leaves the browser's own menu in place. */
  isDisabled?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * A keyboard-opened contextmenu event — the Menu key. Chromium sends it with
 * `button` -1 (a right-click is 2), and a position of its own choosing near
 * the element, so the position cannot be trusted; others send 0,0 and button
 * 0. A Mac's Ctrl-click is also button 0, but at a real position.
 */
const fromKeyboard = (e: React.MouseEvent) =>
  e.button === -1 ||
  (e.button === 0 && !e.ctrlKey && e.clientX === 0 && e.clientY === 0);

/**
 * ContextMenu — the menu a right-click opens on a thing: a row's actions, a
 * file's. Shift+F10 and the Menu key open it from the keyboard, anchored to
 * the thing rather than to a pointer that is not there.
 *
 * A SHORTCUT, NEVER THE ONLY WAY. Nothing on the page says a right-click
 * does anything, touch screens have no right-click, and on iOS a long press
 * opens the browser's callout instead. Every action in a context menu must
 * also be reachable without it — the row's own actions menu, a button, a
 * toolbar. The menu is the same Menu, so it can be the same items.
 *
 * HOW IT OPENS
 *
 *   - Right-click: at the pointer, as a desktop app's does. The browser's own
 *     menu is prevented, and only on this element.
 *   - Shift+F10 or the Menu key, with focus on the element or anything in it:
 *     under the element, at its start edge. Focus moves to the first item.
 *   - Escape, an outside click or choosing an item closes it and returns focus
 *     to where it was — the row's link, the card.
 *
 * A second right-click on the element moves the open menu there, rather than
 * opening the browser's menu over it; one elsewhere closes ours.
 */
export function ContextMenu({
  children,
  menu,
  'aria-label': ariaLabel,
  isDisabled,
  onOpenChange,
}: ContextMenuProps) {
  /*
   * Where focus was when the menu opened. The overlay's own restore returns
   * focus to what it saw focused when it mounted, which for a menu moved by a
   * second right-click is a row of the menu it replaced — gone. So focus goes
   * back here, if nothing else took it.
   */
  const returnTo = useRef<HTMLElement | null>(null);
  const rootState = useMenuTriggerState({
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        const el = returnTo.current;
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (el?.isConnected && (!active || active === document.body))
            el.focus();
        });
      }
      onOpenChange?.(isOpen);
    },
  });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<Element | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // The pointer's position, or null when the element itself is the anchor.
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  /*
   * A second right-click while the menu is open. The modal overlay makes the
   * rest of the page ignore the pointer, so the event lands on <body>, not on
   * the element: it is caught here instead. On the element, the menu moves to
   * the new point and the browser's menu is prevented; on the menu itself,
   * nothing happens; anywhere else, ours closes and the browser's is left to
   * open, as it would have with ours shut.
   */
  useEffect(() => {
    if (!rootState.isOpen) return;
    const onContextMenu = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as globalThis.Node)) {
        e.preventDefault();
        return;
      }
      const r = targetRef.current?.getBoundingClientRect();
      const inside =
        r &&
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (inside) {
        e.preventDefault();
        setPoint({ x: e.clientX, y: e.clientY });
      } else rootState.close();
    };
    document.addEventListener('contextmenu', onContextMenu, true);
    return () =>
      document.removeEventListener('contextmenu', onContextMenu, true);
  }, [rootState, rootState.isOpen]);

  const open = (target: Element, at: { x: number; y: number } | null) => {
    targetRef.current = target;
    if (!rootState.isOpen) {
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement ? active : null;
    }
    setPoint(at);
    rootState.open('first');
  };

  const child = children as React.ReactElement<
    React.HTMLAttributes<HTMLElement>
  >;
  const target = isDisabled
    ? child
    : cloneElement(child, {
        onContextMenu: (e: React.MouseEvent<HTMLElement>) => {
          child.props.onContextMenu?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          open(
            e.currentTarget,
            fromKeyboard(e) ? null : { x: e.clientX, y: e.clientY },
          );
        },
        onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
          child.props.onKeyDown?.(e);
          if (e.defaultPrevented) return;
          /*
           * Shift+F10 is caught as a key: not every browser turns it into a
           * contextmenu event (Chromium on macOS does not). The Menu key needs
           * no handler — the browser fires a keyboard contextmenu for it,
           * which onContextMenu above anchors to the element.
           */
          if (e.shiftKey && e.key === 'F10') {
            // Prevented, so a browser that would also fire contextmenu does not.
            e.preventDefault();
            open(e.currentTarget, null);
          }
        },
      });

  return (
    <>
      {target}
      {rootState.isOpen && (
        <>
          {/* A zero-size point for the popover to anchor to, where the
              pointer was. Fixed, so a scrolled page does not move it. */}
          {point && (
            <span
              ref={anchorRef}
              aria-hidden="true"
              className="ion-context-menu__anchor"
              style={{ left: point.x, top: point.y }}
            />
          )}
          {/* Keyed by the point, so a menu moved by a second right-click is
              placed afresh rather than left where the first one was. */}
          <MenuPopover
            key={point ? `${point.x},${point.y}` : 'element'}
            state={rootState}
            triggerRef={
              point ? anchorRef : (targetRef as React.RefObject<Element | null>)
            }
            popoverRef={popoverRef}
            placement="bottom start"
          >
            <MenuTriggerContext.Provider
              value={{
                rootState,
                menuProps: {
                  'aria-label': ariaLabel,
                  autoFocus: rootState.focusStrategy || 'first',
                  onClose: rootState.close,
                } as AriaMenuOptions<object>,
              }}
            >
              {menu}
            </MenuTriggerContext.Provider>
          </MenuPopover>
        </>
      )}
    </>
  );
}

ContextMenu.displayName = 'ContextMenu';
