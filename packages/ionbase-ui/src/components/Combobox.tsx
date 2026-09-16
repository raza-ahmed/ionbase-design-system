'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Overlay,
  usePopover,
  useComboBox,
  useListBox,
  useOption,
  useButton,
  useFilter,
  DismissButton,
  mergeProps,
} from 'react-aria';
import { useComboBoxState, Item } from 'react-stately';
import type { ComboBoxState } from 'react-stately';
import type { AriaListBoxOptions } from 'react-aria';
import type { Node } from '@react-types/shared';

export type ComboboxSize = 'sm' | 'md' | 'lg';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Second line in the row. Part of the option's name, so it is searchable. */
  description?: string;
  isDisabled?: boolean;
}

export interface ComboboxProps {
  /** The full option list. Filtering happens here, against what is typed. */
  options: readonly ComboboxOption[];
  /** Field label. Required for a usable control — see `a11y.requires`. */
  label?: React.ReactNode;
  /** Helper text below the field. */
  description?: React.ReactNode;
  /** Replaces the helper text when `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** Matches Input's `Size` variant: Small, Medium, Large. */
  size?: ComboboxSize;
  placeholder?: string;
  /** Controlled selection. `null` means nothing is selected. */
  selectedKey?: string | null;
  defaultSelectedKey?: string;
  onSelectionChange?: (key: string | null) => void;
  /** Controlled text. Usually only needed for async/remote filtering. */
  inputValue?: string;
  defaultInputValue?: string;
  onInputChange?: (value: string) => void;
  /**
   * Accept text that matches no option. Off by default: a combobox whose value
   * is a free string is a text field with suggestions, and the caller should
   * have to say that is what they want.
   */
  allowsCustomValue?: boolean;
  /**
   * What opens the list. `input` — react-aria's default and this one — opens it
   * on the first keystroke; the chevron opens it on demand. `focus` opens it
   * the moment the field is tabbed into, which is loud in a long form.
   */
  menuTrigger?: 'focus' | 'input' | 'manual';
  /** Shown in place of the list when nothing matches. */
  emptyLabel?: React.ReactNode;
  /** Accessible label for the disclosure button. */
  buttonLabel?: string;
  /** Posts the selected value under this name, for an uncontrolled form. */
  name?: string;
  className?: string;
  wrapperClassName?: string;
  id?: string;
}

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m6 9 6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ------------------------------------------------------------------ option */

function ComboboxOptionRow({
  item,
  state,
}: {
  item: Node<ComboboxOption>;
  state: ComboBoxState<ComboboxOption>;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const { optionProps, isSelected, isFocused, isDisabled } = useOption(
    { key: item.key },
    state,
    ref,
  );
  const option = item.value;

  return (
    <li
      {...optionProps}
      ref={ref}
      className={[
        'ion-combobox-menu__option',
        isSelected ? 'ion-combobox-menu__option--selected' : '',
        isFocused ? 'ion-combobox-menu__option--focused' : '',
        isDisabled ? 'ion-combobox-menu__option--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-focused={isFocused || undefined}
      data-selected={isSelected || undefined}
      data-disabled={isDisabled || undefined}
    >
      <span className="ion-combobox-menu__label">{item.rendered}</span>
      {option?.description && (
        <span className="ion-combobox-menu__description">
          {option.description}
        </span>
      )}
    </li>
  );
}

/** Breathing room kept between the menu and the viewport edge, in px. */
const GUTTER = 8;

/* ----------------------------------------------------------------- listbox */

interface ListBoxPanelProps {
  state: ComboBoxState<ComboboxOption>;
  listBoxRef: React.RefObject<HTMLUListElement | null>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  /*
   * The exact type `useComboBox` returns, not HTMLAttributes. It carries
   * `autoFocus: FocusStrategy` — the string 'first', not a boolean — and
   * widening it to HTMLAttributes silently drops the strategy that decides
   * which option ArrowDown lands on.
   */
  listBoxProps: AriaListBoxOptions<ComboboxOption>;
  emptyLabel: React.ReactNode;
}

/**
 * The listbox, in its own component because it is mounted only while open.
 *
 * Same split as Popover and Drawer, and for the same reason: `usePopover`
 * positions against a ref in an effect that runs when the component CALLING it
 * mounts. Called beside `useComboBoxState` in the parent, that is the moment
 * the input mounts, and the panel is then positioned once, at the origin,
 * before it exists.
 */
function ComboboxListBox({
  state,
  listBoxRef,
  popoverRef,
  triggerRef,
  listBoxProps,
  emptyLabel,
}: ListBoxPanelProps) {
  const { popoverProps } = usePopover(
    {
      triggerRef,
      popoverRef,
      placement: 'bottom start',
      offset: 4,
      /*
       * Non-modal, unlike every other overlay in this system. A modal popover
       * moves focus into itself and hides the rest of the page — correct for a
       * dialog, fatal here, because the user is still typing in the input and
       * focus must never leave it. The input keeps focus and drives the list
       * through `aria-activedescendant`.
       */
      isNonModal: true,
    },
    state,
  );

  const { listBoxProps: innerListBoxProps } = useListBox(
    { ...listBoxProps, disallowEmptySelection: true },
    state,
    listBoxRef as React.RefObject<HTMLUListElement>,
  );

  /*
   * The menu matches the field's width rather than hugging its content.
   * `usePopover` sizes to the panel, and a list narrower or wider than the
   * control it belongs to reads as a different element. Measured rather than
   * assumed, because the field is fluid.
   *
   * READ DURING RENDER, NOT FROM A ResizeObserver — and this cost an afternoon.
   *
   * The first version kept the width in state and synced it from a
   * ResizeObserver on the field. It measured correctly and closed the menu:
   * every open flashed a listbox that was gone about a hundred milliseconds
   * later, before any option could take virtual focus. Writing a width onto a
   * positioned popover feeds back into `usePopover`'s own position pass, and
   * its scroll handling closes the overlay. Bisecting the panel down to nothing
   * was the only way to see it — the symptom looked like a keyboard bug.
   *
   * The panel mounts only while open, so the trigger is already laid out by the
   * time this runs. One read, no state, no observer, nothing to feed back.
   */
  const rect = triggerRef.current?.getBoundingClientRect();
  /*
   * Clamped to what is actually to the right of the trigger. A field running
   * the full bleed of the page sits flush to the viewport edge, and a menu that
   * matched its width exactly would start at the field's left and end past the
   * edge — a horizontal scrollbar, which `useCloseOnScroll` reads as a scroll
   * and closes the menu on. The failure mode was a combobox that could not be
   * opened at all, so the clamp trades a slightly narrow menu for one that
   * exists.
   */
  const width = rect
    ? Math.min(
        rect.width,
        document.documentElement.clientWidth - rect.left - GUTTER,
      )
    : undefined;

  const isEmpty = state.collection.size === 0;

  return (
    <Overlay>
      <div
        {...popoverProps}
        ref={popoverRef}
        className="ion-combobox-menu"
        style={{ ...popoverProps.style, width }}
      >
        {/*
          iOS VoiceOver has no way to dismiss a non-modal overlay from inside
          it — there is no Escape key in the rotor. These are visually hidden
          buttons that bracket the list and close it.
        */}
        <DismissButton onDismiss={() => state.close()} />
        <ul
          {...mergeProps(innerListBoxProps)}
          ref={listBoxRef}
          className="ion-combobox-menu__list"
        >
          {[...state.collection].map((item) => (
            <ComboboxOptionRow
              key={item.key}
              item={item as Node<ComboboxOption>}
              state={state}
            />
          ))}
        </ul>
        {/*
          The empty message is a sibling of the listbox, not an option in it.
          As an option it would be counted ("1 of 1"), focusable and selectable,
          and picking it would set the field to "No matches".
        */}
        {isEmpty && (
          <div className="ion-combobox-menu__empty" role="presentation">
            {emptyLabel}
          </div>
        )}
        <DismissButton onDismiss={() => state.close()} />
      </div>
    </Overlay>
  );
}

/* ---------------------------------------------------------------- combobox */

/**
 * Combobox — a text field that filters a list, with one selected value.
 *
 * Drawn in Figma as `Combobox` (1370:2359) — three sizes by seven states, the
 * same axes `Input` carries, because the field IS Input's box. The open list is
 * a second Figma component, `Combobox Menu`, with no React export behind it.
 *
 * WHY THIS IS NOT `Select` WITH A SEARCH BOX
 *
 * `Select` wraps a native `<select>`, whose list the browser owns: it cannot be
 * filtered, and its rows can only hold text. Everything above about twenty
 * options needs filtering, and `Select`'s own contract has pointed at "a
 * combobox — not yet in this system" since it was written. This is it.
 *
 * The cost is that everything the native control gave away for free — keyboard
 * handling, the mobile picker, screen-reader semantics — now has to be built.
 * React Aria's `useComboBox` builds it: `role="combobox"` with `aria-expanded`,
 * `aria-controls` and `aria-activedescendant`, arrow keys that move a virtual
 * focus while the real focus stays in the input, and Escape that reverts.
 *
 * FILTERING IS LOCALE-AWARE, NOT `toLowerCase().includes()`
 *
 * `useFilter({ sensitivity: 'base' })` is `Intl.Collator` underneath, so
 * "resume" matches "résumé" and Turkish dotted/dotless I behave the way a
 * Turkish reader expects. The lowercase-and-includes version fails both, and
 * fails them silently in exactly the locales least likely to be tested.
 */
export function Combobox({
  options,
  label,
  description,
  errorMessage,
  isInvalid,
  isDisabled,
  isReadOnly,
  size = 'md',
  placeholder,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  inputValue,
  defaultInputValue,
  onInputChange,
  allowsCustomValue,
  menuTrigger = 'input',
  emptyLabel = 'No matches',
  buttonLabel = 'Show suggestions',
  name,
  className,
  wrapperClassName,
  id,
}: ComboboxProps) {
  const { contains } = useFilter({ sensitivity: 'base' });

  /*
   * The description is searchable, but it is NOT part of `textValue`.
   *
   * That distinction cost a test to find. `textValue` does double duty in
   * react-stately: it is what the filter reads AND what the input is set to
   * once an option is chosen. Folding the description into it made "Australia"
   * searchable by "Oceania" and then wrote `Australia Oceania` into the field.
   *
   * So `textValue` stays the label, and the filter is widened instead —
   * keyed by label, which is what a Node carries back to it.
   */
  const searchable = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of options) {
      map.set(o.label, [o.label, o.description].filter(Boolean).join(' '));
    }
    return map;
  }, [options]);

  /*
   * Filtering is done HERE, not handed to react-stately's `defaultFilter`.
   *
   * `defaultFilter` is only consulted for an UNCONTROLLED collection — one
   * passed as `defaultItems`. Passed as `items`, as it is here, react-stately
   * takes the list as final and the filter is silently ignored: no error, no
   * warning, and a combobox that lists every option no matter what is typed.
   * Three tests failed on it before the cause was obvious.
   *
   * `items` is the right half of that trade anyway. `defaultItems` snapshots
   * the list on first render, so a caller whose options arrive from a fetch
   * would get an empty combobox forever.
   */
  const [typed, setTyped] = useState(defaultInputValue ?? '');
  const text = inputValue ?? typed;

  const filtered = useMemo(() => {
    if (!text) return options;
    /*
     * An exact label match shows the WHOLE list, which looks like a bug and is
     * the opposite. Selecting an option writes its label into the input, and a
     * filter applied to that would narrow the list to the one row already
     * chosen — so reopening it to change your mind would offer nothing else.
     */
    if (options.some((o) => o.label === text)) return options;
    return options.filter((o) =>
      contains(searchable.get(o.label) ?? o.label, text),
    );
  }, [contains, options, searchable, text]);

  const disabledKeys = useMemo(
    () => options.filter((o) => o.isDisabled).map((o) => o.value),
    [options],
  );

  const state = useComboBoxState<ComboboxOption>({
    label: typeof label === 'string' ? label : undefined,
    items: filtered,
    children: (item: ComboboxOption) => (
      <Item key={item.value} textValue={item.label}>
        {item.label}
      </Item>
    ),
    disabledKeys,
    menuTrigger,
    /*
     * The list stays mounted with nothing in it so the empty message can be
     * shown. Left off, react-aria closes the popover the moment the filter
     * matches nothing, and the user sees the list vanish with no explanation.
     */
    allowsEmptyCollection: true,
    allowsCustomValue,
    isDisabled,
    isReadOnly,
    selectedKey,
    defaultSelectedKey,
    onSelectionChange: onSelectionChange
      ? (key) => onSelectionChange(key === null ? null : String(key))
      : undefined,
    inputValue,
    defaultInputValue,
    onInputChange: (value) => {
      setTyped(value);
      onInputChange?.(value);
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const listBoxRef = useRef<HTMLUListElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const {
    buttonProps: triggerProps,
    inputProps,
    listBoxProps,
    labelProps,
    descriptionProps,
    errorMessageProps,
  } = useComboBox(
    {
      /*
       * `id` goes to useComboBox, not to useComboBoxState. The state owns the
       * collection; the hook owns the DOM wiring — the input's id, the label's
       * htmlFor, and the aria-controls that points at the listbox. Setting it
       * on the state is accepted by neither and silently does nothing.
       */
      id,
      label: typeof label === 'string' ? label : undefined,
      placeholder,
      isDisabled,
      isReadOnly,
      isInvalid,
      inputRef,
      listBoxRef,
      popoverRef,
      buttonRef,
    },
    state,
  );

  const { buttonProps } = useButton(
    {
      ...triggerProps,
      'aria-label': buttonLabel,
    },
    buttonRef,
  );

  const helper = isInvalid && errorMessage ? errorMessage : description;

  const boxClassNames = [
    'ion-input',
    'ion-combobox',
    size !== 'md' ? `ion-input--${size}` : '',
    isInvalid ? 'ion-input--invalid' : '',
    isDisabled ? 'ion-input--disabled' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={[
        'ion-field',
        isInvalid ? 'ion-field--error' : '',
        wrapperClassName || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <label {...labelProps} className="ion-field__label">
          {label}
        </label>
      )}

      <div
        ref={boxRef}
        className={boxClassNames}
        data-open={state.isOpen || undefined}
        data-invalid={isInvalid || undefined}
        data-disabled={isDisabled || undefined}
      >
        <input {...inputProps} ref={inputRef} className="ion-input__field" />
        {/*
          A hidden input so an uncontrolled form posts the SELECTED KEY rather
          than the visible text. Those differ whenever a label is not its own
          value, which is most of the time.
        */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={state.selectedKey == null ? '' : String(state.selectedKey)}
          />
        )}
        <button
          {...buttonProps}
          /*
           * react-aria labels this button with `aria-labelledby` pointing at
           * the field label and the button itself — which, since the button
           * holds nothing but an aria-hidden caret, announces as the field
           * name and nothing about what pressing it does. Clearing it and
           * naming the ACTION is the point of `buttonLabel`; leaving both set
           * would let labelledby win and the prop would do nothing.
           */
          aria-labelledby={undefined}
          aria-label={buttonLabel}
          /*
           * The press must not move focus to the button.
           *
           * `useComboBox` closes the list the moment focus leaves the input, so
           * a disclosure button that takes focus opens the list and closes it
           * again within the same gesture. A test caught exactly that: the
           * listbox was found and was gone by the next assertion. Chromium
           * focuses a button on mousedown, so this is not hypothetical.
           *
           * `preventDefault` on mousedown is what stops that — and the caret
           * goes to the field instead, which is where someone pressing a
           * chevron to browse a list wants to type next anyway.
           */
          onMouseDown={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          ref={buttonRef}
          type="button"
          /*
           * Out of the tab order on purpose, and this is the ARIA pattern
           * rather than an oversight. The input already reaches the list with
           * ArrowDown, so a tab stop on the disclosure button would make every
           * combobox in a form cost two tabs to pass and offer nothing the
           * input does not.
           */
          tabIndex={-1}
          className="ion-combobox__button"
        >
          <ChevronDown />
        </button>
      </div>

      {state.isOpen && (
        <ComboboxListBox
          state={state}
          listBoxRef={listBoxRef}
          popoverRef={popoverRef}
          triggerRef={boxRef}
          listBoxProps={listBoxProps}
          emptyLabel={emptyLabel}
        />
      )}

      {helper && (
        <span
          {...(isInvalid && errorMessage
            ? errorMessageProps
            : descriptionProps)}
          className="ion-field__helper"
        >
          {helper}
        </span>
      )}
    </div>
  );
}

Combobox.displayName = 'Combobox';
