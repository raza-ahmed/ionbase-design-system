'use client';

import React, {
  Children,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button, type ButtonProps } from './Button.js';
import { Menu, MenuItem, MenuTrigger } from './Menu.js';

export type ButtonGroupAlign = 'start' | 'center' | 'end';
export type ButtonGroupOverflow = 'wrap' | 'menu';

export interface ButtonGroupProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /**
   * The actions, least important first and the primary last — the order
   * they are read and tabbed in, and the order they are drawn. Nothing is
   * reordered to put the primary on the right.
   */
  children: React.ReactNode;
  /**
   * Actions pinned to the start edge, apart from the rest: Back in a
   * wizard, a destructive "Delete" in an edit dialog. They never collapse.
   */
  start?: React.ReactNode;
  /** Where the actions sit. Default `end`, the dialog and form convention. */
  align?: ButtonGroupAlign;
  /**
   * `wrap` (default): actions that do not fit move to a second line.
   * `menu`: Buttons that do not fit move into a "More actions" menu at the
   * start of the row, the first Button first. The last child — the primary —
   * never moves, and neither does anything that is not a Button; the
   * Buttons after it still can.
   */
  overflow?: ButtonGroupOverflow;
  /**
   * Below 32rem of viewport, every action takes the full width, one per
   * line, still in reading order — so the primary is last, nearest the
   * thumb. For dialog and form footers.
   */
  stack?: boolean;
  /** The overflow trigger's name. Default "More actions" — pass the translation. */
  moreLabel?: string;
}

const Ellipsis = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

/** The label a collapsed Button is listed under: its text, or its aria-label. */
const labelOf = (props: ButtonProps & { 'aria-label'?: string }) =>
  typeof props.children === 'string' || typeof props.children === 'number'
    ? String(props.children)
    : props['aria-label'];

/**
 * ButtonGroup — a row of actions: a dialog's Cancel and Confirm, a form's
 * Back, Save and Next, the actions at the top of a record.
 *
 * WHAT IT OWNS, SO NO CALLER HAS TO
 *
 *   - Spacing: 8px between actions, everywhere. Before this, dialogs used
 *     12, drawers and page headers 8, and forms whatever their author chose.
 *   - Order: children are drawn in the order they are read. The primary
 *     goes last, so it lands at the end of the row in either direction —
 *     and at the bottom, nearest the thumb, when `stack` stacks them. There
 *     is no `row-reverse`: an order that differs on screen and in the Tab
 *     sequence fails WCAG 2.4.3.
 *   - Overflow, when asked: `overflow="menu"` measures the row and moves
 *     the Buttons that do not fit into a MenuTrigger, first Button first. A
 *     menu item presses the real Button, which stays in the page hidden —
 *     so its `onPress`, its `onClick` and a `type="submit"` all behave as
 *     if it had been clicked.
 *
 * NOT A TOOLBAR. Every action here is its own tab stop, which is what a
 * keyboard user expects of two or three buttons. A row of many controls on
 * one thing — formatting, a table's batch actions — is a Toolbar: one tab
 * stop, arrow keys inside.
 */
export function ButtonGroup({
  children,
  start,
  align = 'end',
  overflow = 'wrap',
  stack = false,
  moreLabel = 'More actions',
  className,
  ...rest
}: ButtonGroupProps) {
  const items = Children.toArray(children).filter(isValidElement);
  // The Buttons that may move into the menu, in the order they move: every
  // Button but the last child, first first. Anything else keeps its place.
  const collapsible = items
    .map((_, i) => i)
    .filter(
      (i) =>
        overflow === 'menu' && i < items.length - 1 && items[i].type === Button,
    );

  const rowRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const moreRef = useRef<HTMLSpanElement>(null);
  const [hidden, setHidden] = useState(0);

  /*
   * How many of the collapsible Buttons to hide. Every item stays
   * rendered, so its width can be read whether it is shown or not; a hidden
   * one is taken out of the flow, so it costs no room.
   */
  useLayoutEffect(() => {
    if (overflow !== 'menu') return;
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      // Stacked, one per line: everything fits, and widths do not add up.
      if (getComputedStyle(row).flexDirection === 'column') {
        row.style.width = '';
        setHidden(0);
        return;
      }
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const widths = itemRefs.current
        .slice(0, items.length)
        .map((el) => el?.getBoundingClientRect().width ?? 0);
      const more = moreRef.current?.getBoundingClientRect().width ?? 0;
      const total = (ws: number[]) =>
        ws.reduce((a, w) => a + w, 0) + gap * Math.max(ws.length - 1, 0);
      /*
       * The row asks for its full width — every action shown — and may
       * shrink below it. Asking only for what is shown would, in a parent
       * that sizes to its content (a PageHeader's actions), shrink the row as
       * actions hide and never let it grow back when there is room again.
       */
      row.style.width = `${Math.ceil(total(widths))}px`;
      const available = row.getBoundingClientRect().width + 0.5;
      // With `n` hidden, the row is the More button and the rest.
      const fits = (n: number) => {
        const gone = new Set(collapsible.slice(0, n));
        const shown = widths.filter((_, i) => !gone.has(i));
        return total(n ? [more, ...shown] : shown) <= available;
      };
      let n = 0;
      while (!fits(n) && n < collapsible.length) n++;
      setHidden((prev) => (prev === n ? prev : n));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  });

  const gone = new Set(collapsible.slice(0, hidden));

  return (
    <div
      {...rest}
      className={[
        'ion-button-group',
        `ion-button-group--${align}`,
        overflow === 'menu' ? 'ion-button-group--menu' : '',
        stack ? 'ion-button-group--stack' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {start && <div className="ion-button-group__start">{start}</div>}
      <div ref={rowRef} className="ion-button-group__actions">
        {overflow === 'menu' && (
          <span
            ref={moreRef}
            className={[
              'ion-button-group__more',
              hidden ? '' : 'ion-button-group__item--hidden',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={hidden ? undefined : true}
          >
            <MenuTrigger placement="bottom start">
              <Button
                variant="tertiary"
                size={(items[items.length - 1]?.props as ButtonProps)?.size}
                aria-label={moreLabel}
                startIcon={<Ellipsis />}
              />
              <Menu
                onAction={(key) =>
                  itemRefs.current[Number(key)]
                    ?.querySelector<HTMLElement>('button, a, [role="button"]')
                    ?.click()
                }
                disabledKeys={[...gone]
                  .filter((i) => (items[i].props as ButtonProps).isDisabled)
                  .map(String)}
              >
                {[...gone].map((i) => {
                  const p = items[i].props as ButtonProps;
                  return (
                    <MenuItem key={String(i)} icon={p.startIcon}>
                      {labelOf(p)}
                    </MenuItem>
                  );
                })}
              </Menu>
            </MenuTrigger>
          </span>
        )}
        {items.map((el, i) => (
          <span
            key={el.key ?? i}
            ref={(node) => {
              itemRefs.current[i] = node;
            }}
            className={[
              'ion-button-group__item',
              gone.has(i) ? 'ion-button-group__item--hidden' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={gone.has(i) || undefined}
          >
            {el}
          </span>
        ))}
      </div>
    </div>
  );
}

ButtonGroup.displayName = 'ButtonGroup';
