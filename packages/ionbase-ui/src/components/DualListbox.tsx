'use client';

import React, {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useListBox, useLocale, useOption } from 'react-aria';
import { Item, useListState } from 'react-stately';
import type { ListState } from 'react-stately';
import type { Key, Node, Selection } from '@react-types/shared';
import { Button } from './Button.js';

/** One choice. The same shape as Combobox's and MultiSelect's options. */
export interface DualListboxOption {
  value: string;
  label: string;
  /** Second line in the row, read with the label. */
  description?: string;
  /** Cannot be picked or moved — it stays on whichever side it starts. */
  isDisabled?: boolean;
}

export interface DualListboxLabels {
  /** Names the list of what is not chosen. "Available". */
  available?: string;
  /** Names the list of what is chosen. "Selected". */
  selected?: string;
  /** The button that moves the picked options across. "Add to selected". */
  add?: string;
  /** The button that moves them back. "Remove from selected". */
  remove?: string;
  /** "Move up" — earlier in the chosen order. */
  moveUp?: string;
  /** "Move down". */
  moveDown?: string;
  /** Shown in a list with nothing in it. "None". */
  empty?: string;
  /**
   * Announced after a move across — "2 moved to Selected". Receives the
   * count, formatted for the locale, and the name of the list they went to.
   */
  moved?: (count: string, list: string) => string;
  /**
   * Announced after a reorder — "Kwame Mensah, 2 of 4". Receives the moved
   * options' labels, and where the first now is, formatted for the locale.
   */
  reordered?: (labels: string[], position: string, total: string) => string;
}

export interface DualListboxProps {
  /** Every choice, in the order the Available list shows them. */
  options: readonly DualListboxOption[];
  /** The chosen values (controlled), in their chosen order. */
  value?: readonly string[];
  /** The initially chosen values (uncontrolled). */
  defaultValue?: readonly string[];
  /** Receives the whole new list of chosen values, in order. */
  onChange?: (value: string[]) => void;
  /** Names the field. Required for a usable control — see `a11y.requires`. */
  label?: React.ReactNode;
  /** Names the field when there is no visible `label`. */
  'aria-label'?: string;
  /** Helper text below the lists. */
  description?: React.ReactNode;
  /** Replaces the helper text when `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  /** At least one value must be chosen. */
  isRequired?: boolean;
  isDisabled?: boolean;
  /**
   * The chosen order means something — who is asked first, which source is
   * searched first — and can be changed: Move up and Move down.
   */
  isReorderable?: boolean;
  /** Posts every chosen value under this name, in order, for a form. */
  name?: string;
  /** Every string it renders or announces, for translation. English by default. */
  labels?: DualListboxLabels;
  /** Class names for the `.ion-field` wrapper. */
  className?: string;
  id?: string;
}

const DEFAULTS: Required<DualListboxLabels> = {
  available: 'Available',
  selected: 'Selected',
  add: 'Add to selected',
  remove: 'Remove from selected',
  moveUp: 'Move up',
  moveDown: 'Move down',
  empty: 'None',
  moved: (count, list) => `${count} moved to ${list}`,
  reordered: (labels, position, total) =>
    labels.length === 1
      ? `${labels[0]}, ${position} of ${total}`
      : `${labels.length} moved, from ${position} of ${total}`,
};

const Chevron = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
/* Across points the reading direction; the CSS turns it for RTL and a stack. */
const ACROSS = 'm9 6 6 6-6 6';
const BACK = 'm15 6-6 6 6 6';
const UP = 'm6 15 6-6 6 6';
const DOWN = 'm6 9 6 6 6-6';

type Side = 'available' | 'chosen';
type Action = 'add' | 'remove' | 'up' | 'down';

/* ------------------------------------------------------------------ option */

function OptionRow({
  item,
  state,
}: {
  item: Node<DualListboxOption>;
  state: ListState<DualListboxOption>;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const {
    optionProps,
    labelProps,
    descriptionProps,
    isSelected,
    isFocused,
    isFocusVisible,
    isDisabled,
  } = useOption({ key: item.key }, state, ref);
  const option = item.value;
  return (
    <li
      {...optionProps}
      ref={ref}
      className="ion-dual-listbox__option"
      data-selected={isSelected || undefined}
      data-focused={isFocused || undefined}
      data-focus-visible={isFocusVisible || undefined}
      data-disabled={isDisabled || undefined}
    >
      <span {...labelProps} className="ion-dual-listbox__label">
        {option?.label}
      </span>
      {option?.description && (
        <span {...descriptionProps} className="ion-dual-listbox__description">
          {option.description}
        </span>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------- list */

function Pane({
  state,
  listRef,
  nameId,
  title,
  fieldLabelId,
  emptyLabel,
  onAction,
  listProps,
}: {
  state: ListState<DualListboxOption>;
  listRef: React.RefObject<HTMLUListElement | null>;
  nameId: string;
  title: string;
  fieldLabelId?: string;
  emptyLabel: string;
  onAction: (key: Key) => void;
  listProps?: React.HTMLAttributes<HTMLUListElement>;
}) {
  const emptyId = useId();
  const isEmpty = state.collection.size === 0;
  const { listBoxProps } = useListBox(
    {
      // "Approvers Available": the field, then which of its two lists.
      'aria-labelledby': [fieldLabelId, nameId].filter(Boolean).join(' '),
      selectionMode: 'multiple',
      selectionBehavior: 'replace',
      onAction,
      shouldFocusWrap: false,
    },
    state,
    listRef,
  );
  // Empty first: it is what the list holds, before what the field is for.
  const describedBy = [
    isEmpty ? emptyId : undefined,
    listProps?.['aria-describedby'],
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="ion-dual-listbox__pane">
      <span id={nameId} className="ion-dual-listbox__name">
        {title}
      </span>
      <div className="ion-dual-listbox__box">
        <ul
          {...listBoxProps}
          {...listProps}
          // An empty list stays a named, focusable listbox; that it is empty
          // is said beside it, since a listbox may only contain options.
          aria-describedby={describedBy || undefined}
          ref={listRef}
          className="ion-dual-listbox__list"
        >
          {[...state.collection].map((item) => (
            <OptionRow key={item.key} item={item} state={state} />
          ))}
        </ul>
        {isEmpty && (
          <span id={emptyId} className="ion-dual-listbox__empty">
            {emptyLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- component */

const keysOf = (selection: Selection, list: readonly DualListboxOption[]) =>
  new Set(
    selection === 'all'
      ? list.filter((o) => !o.isDisabled).map((o) => o.value)
      : [...selection].map(String),
  );

/**
 * DualListbox — choose some of many, in two lists side by side: what is
 * available, and what is chosen, with buttons that move options between them.
 *
 * WHY NOT A MULTISELECT
 *
 * A MultiSelect hides what is left behind a popover and shows what is chosen
 * as tags that wrap. That is right for a handful. It is wrong when the chosen
 * set is long and must be reviewed whole, when both sides need to be seen at
 * once, and when the chosen ORDER means something — who is asked to approve
 * first — since tags cannot be reordered from the keyboard.
 *
 * HOW IT BEHAVES
 *
 *   - Two listboxes, each one tab stop, named by the field and by which list
 *     it is. Multiple selection with the listbox pattern's recommended model:
 *     ↑ ↓ move and select, Shift extends, Ctrl or ⌘ moves without selecting
 *     and Space then toggles, Ctrl+A takes all. A click picks one; Shift- and
 *     Ctrl-click extend.
 *   - Enter or a double click moves an option straight across.
 *   - The buttons act on what is picked. What moved stays picked in its new
 *     list, so Move up can follow Add at once. Focus stays on the button
 *     pressed; when that leaves it disabled — nothing left to add — focus
 *     goes to the first option that moved, where the next useful key is.
 *   - Each move is announced through a status region that is always there.
 *   - Below 30rem of its own width the lists stack, and the buttons point
 *     up and down between them.
 */
export function DualListbox({
  options,
  value: valueProp,
  defaultValue,
  onChange,
  label,
  'aria-label': ariaLabel,
  description,
  errorMessage,
  isInvalid = false,
  isRequired = false,
  isDisabled = false,
  isReorderable = false,
  name,
  labels,
  className,
  id,
}: DualListboxProps) {
  const l = { ...DEFAULTS, ...labels };
  const { locale } = useLocale();
  const count = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const [own, setOwn] = useState<readonly string[]>(defaultValue ?? []);
  const value = valueProp ?? own;
  const commit = (next: string[]) => {
    if (valueProp === undefined) setOwn(next);
    onChange?.(next);
  };

  const byValue = useMemo(
    () => new Map(options.map((o) => [o.value, o])),
    [options],
  );
  const available = options.filter((o) => !value.includes(o.value));
  const chosen = value.flatMap((v) => byValue.get(v) ?? []);
  const disabledKeys = isDisabled
    ? options.map((o) => o.value)
    : options.filter((o) => o.isDisabled).map((o) => o.value);

  const [picked, setPicked] = useState<Record<Side, Set<string>>>({
    available: new Set(),
    chosen: new Set(),
  });
  const pick = (side: Side, keys: Set<string>) =>
    setPicked((p) => ({ ...p, [side]: keys }));

  const renderItem = (o: DualListboxOption) => (
    <Item key={o.value} textValue={o.label}>
      {o.label}
    </Item>
  );
  const availableState = useListState<DualListboxOption>({
    items: available,
    children: renderItem,
    selectionMode: 'multiple',
    selectionBehavior: 'replace',
    selectedKeys: picked.available,
    onSelectionChange: (s) => pick('available', keysOf(s, available)),
    disabledKeys,
  });
  const chosenState = useListState<DualListboxOption>({
    items: chosen,
    children: renderItem,
    selectionMode: 'multiple',
    selectionBehavior: 'replace',
    selectedKeys: picked.chosen,
    onSelectionChange: (s) => pick('chosen', keysOf(s, chosen)),
    disabledKeys,
  });

  const availableRef = useRef<HTMLUListElement>(null);
  const chosenRef = useRef<HTMLUListElement>(null);
  const buttonRefs = {
    add: useRef<HTMLButtonElement>(null),
    remove: useRef<HTMLButtonElement>(null),
    up: useRef<HTMLButtonElement>(null),
    down: useRef<HTMLButtonElement>(null),
  };

  /*
   * After a move, focus stays on the button pressed — unless the move left it
   * disabled, which a disabled button cannot keep: then it goes to the first
   * option that moved, in the list it moved to.
   */
  const pending = useRef<{ action: Action; side: Side; key: string } | null>(
    null,
  );
  useLayoutEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    if (!buttonRefs[p.action].current?.disabled) return;
    const state = p.side === 'available' ? availableState : chosenState;
    const list = (p.side === 'available' ? availableRef : chosenRef).current;
    state.selectionManager.setFocusedKey(p.key);
    list
      ?.querySelector<HTMLElement>(`[data-key="${CSS.escape(p.key)}"]`)
      ?.focus();
  });

  /* The status region is always mounted; a repeat is made to differ. */
  const [said, setSaid] = useState('');
  const say = (text: string) =>
    setSaid((prev) => (prev === text ? `${text}\u00a0` : text));

  const moveAcross = (from: Side, keys: Set<string>, action: Action) => {
    const source = from === 'available' ? available : chosen;
    const moving = source
      .filter((o) => keys.has(o.value) && !o.isDisabled)
      .map((o) => o.value);
    if (isDisabled || !moving.length) return;
    const to: Side = from === 'available' ? 'chosen' : 'available';
    /*
     * When Enter moved them, the list they left still thinks it has focus:
     * a focused option taken out of the page fires no blur, and Tab back in
     * would land on nothing. React Aria moves its focused option to the next
     * one itself; this tells it focus has gone.
     */
    (from === 'available'
      ? availableState
      : chosenState
    ).selectionManager.setFocused(false);
    commit(
      from === 'available'
        ? [...value, ...moving]
        : value.filter((v) => !moving.includes(v)),
    );
    setPicked({ [from]: new Set(), [to]: new Set(moving) } as Record<
      Side,
      Set<string>
    >);
    say(
      l.moved(
        count.format(moving.length),
        to === 'chosen' ? l.selected : l.available,
      ),
    );
    pending.current = { action, side: to, key: moving[0] };
  };

  const canMove = (direction: -1 | 1) =>
    !isDisabled &&
    value.some((v, i) => {
      const j = i + direction;
      return (
        picked.chosen.has(v) &&
        j >= 0 &&
        j < value.length &&
        !picked.chosen.has(value[j])
      );
    });

  const reorder = (direction: -1 | 1) => {
    if (!canMove(direction)) return;
    const next = [...value];
    const order = next.map((_, i) => i);
    if (direction === 1) order.reverse();
    for (const i of order) {
      const j = i + direction;
      if (
        picked.chosen.has(next[i]) &&
        j >= 0 &&
        j < next.length &&
        !picked.chosen.has(next[j])
      )
        [next[i], next[j]] = [next[j], next[i]];
    }
    commit(next);
    const moved = next.filter((v) => picked.chosen.has(v));
    say(
      l.reordered(
        moved.map((v) => byValue.get(v)?.label ?? v),
        count.format(next.indexOf(moved[0]) + 1),
        count.format(next.length),
      ),
    );
    pending.current = {
      action: direction === -1 ? 'up' : 'down',
      side: 'chosen',
      key: moved[0],
    };
  };

  const fieldId = useId();
  const labelId = useId();
  const helperId = useId();
  const availableNameId = useId();
  const chosenNameId = useId();
  const helper = isInvalid && errorMessage ? errorMessage : description;

  const canAdd =
    !isDisabled && available.some((o) => picked.available.has(o.value));
  const canRemove =
    !isDisabled && chosen.some((o) => picked.chosen.has(o.value));

  return (
    <div
      id={id ?? fieldId}
      role="group"
      aria-labelledby={label ? labelId : undefined}
      aria-label={label ? undefined : ariaLabel}
      aria-describedby={helper ? helperId : undefined}
      aria-disabled={isDisabled || undefined}
      className={[
        'ion-field',
        'ion-dual-listbox',
        isInvalid ? 'ion-field--error' : '',
        isDisabled ? 'ion-dual-listbox--disabled' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <span id={labelId} className="ion-field__label">
          {label}
        </span>
      )}

      <div
        className={[
          'ion-dual-listbox__body',
          isReorderable ? 'ion-dual-listbox__body--reorderable' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Pane
          state={availableState}
          listRef={availableRef}
          nameId={availableNameId}
          title={l.available}
          fieldLabelId={label ? labelId : undefined}
          emptyLabel={l.empty}
          onAction={(key) =>
            moveAcross('available', new Set([String(key)]), 'add')
          }
        />

        <div className="ion-dual-listbox__actions">
          <Button
            ref={buttonRefs.add}
            size="sm"
            variant="secondary"
            aria-label={l.add}
            isDisabled={!canAdd}
            onPress={() => moveAcross('available', picked.available, 'add')}
            startIcon={
              <span className="ion-dual-listbox__across">
                <Chevron d={ACROSS} />
              </span>
            }
          />
          <Button
            ref={buttonRefs.remove}
            size="sm"
            variant="secondary"
            aria-label={l.remove}
            isDisabled={!canRemove}
            onPress={() => moveAcross('chosen', picked.chosen, 'remove')}
            startIcon={
              <span className="ion-dual-listbox__across">
                <Chevron d={BACK} />
              </span>
            }
          />
        </div>

        <Pane
          state={chosenState}
          listRef={chosenRef}
          nameId={chosenNameId}
          title={l.selected}
          fieldLabelId={label ? labelId : undefined}
          emptyLabel={l.empty}
          onAction={(key) =>
            moveAcross('chosen', new Set([String(key)]), 'remove')
          }
          listProps={{
            'aria-required': isRequired || undefined,
            'aria-invalid': isInvalid || undefined,
            'aria-describedby': helper ? helperId : undefined,
          }}
        />

        {isReorderable && (
          <div className="ion-dual-listbox__actions">
            <Button
              ref={buttonRefs.up}
              size="sm"
              variant="secondary"
              aria-label={l.moveUp}
              isDisabled={!canMove(-1)}
              onPress={() => reorder(-1)}
              startIcon={<Chevron d={UP} />}
            />
            <Button
              ref={buttonRefs.down}
              size="sm"
              variant="secondary"
              aria-label={l.moveDown}
              isDisabled={!canMove(1)}
              onPress={() => reorder(1)}
              startIcon={<Chevron d={DOWN} />}
            />
          </div>
        )}
      </div>

      {name &&
        value.map((v) => <input key={v} type="hidden" name={name} value={v} />)}

      <span role="status" className="ion-visually-hidden">
        {said}
      </span>

      {helper && (
        <span id={helperId} className="ion-field__helper">
          {helper}
        </span>
      )}
    </div>
  );
}

DualListbox.displayName = 'DualListbox';
