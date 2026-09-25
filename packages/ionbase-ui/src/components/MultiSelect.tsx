'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  DismissButton,
  Overlay,
  useButton,
  useComboBox,
  useFilter,
  useListBox,
  useLocale,
  useOption,
  usePopover,
} from 'react-aria';
import type { AriaListBoxOptions } from 'react-aria';
import { Item, useComboBoxState } from 'react-stately';
import type { ComboBoxState } from 'react-stately';
import type { Key, Node } from '@react-types/shared';
import { Tag, TagGroup } from './TagGroup.js';
import type { ComboboxOption } from './Combobox.js';

export type MultiSelectSize = 'sm' | 'md' | 'lg';

type MultiState = ComboBoxState<MultiSelectOption, 'multiple'>;

/** The same shape as Combobox's option, so a list moves between the two. */
export type MultiSelectOption = ComboboxOption;

export interface MultiSelectProps {
  /** The full option list. Filtering happens here, against what is typed. */
  options: readonly MultiSelectOption[];
  /** Field label. Required for a usable control — see `a11y.requires`. */
  label?: React.ReactNode;
  /** Names the field, and its tags, when there is no visible `label`. */
  'aria-label'?: string;
  /** Helper text below the field. */
  description?: React.ReactNode;
  /** Replaces the helper text when `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  /** At least one value must be chosen. */
  isRequired?: boolean;
  /** Matches Input's `Size` variant: Small, Medium, Large. */
  size?: MultiSelectSize;
  placeholder?: string;
  /** The selected values (controlled), in the order they were chosen. */
  value?: readonly string[];
  /** The initially selected values (uncontrolled). */
  defaultValue?: readonly string[];
  /** Receives the whole new selection. */
  onChange?: (value: string[]) => void;
  /** Controlled filter text. Usually only needed for remote filtering. */
  inputValue?: string;
  onInputChange?: (value: string) => void;
  /**
   * Leave the tags out, when the chosen values are already on screen as
   * removable tags — a table's active-filters row. The values are still read
   * with the field, and still marked in the list.
   */
  hideTags?: boolean;
  /** Shown in place of the list when nothing matches. */
  emptyLabel?: React.ReactNode;
  /** Accessible label for the disclosure button. */
  buttonLabel?: string;
  /** Posts every selected value under this name, for an uncontrolled form. */
  name?: string;
  /** Class names for the field box (`.ion-input`). */
  className?: string;
  /** Class names for the `.ion-field` wrapper. */
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

/* ------------------------------------------------------------------ option */

function MultiSelectOptionRow({
  item,
  state,
}: {
  item: Node<MultiSelectOption>;
  state: MultiState;
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
      className="ion-combobox-menu__option ion-multi-select-menu__option"
      data-focused={isFocused || undefined}
      data-selected={isSelected || undefined}
      data-disabled={isDisabled || undefined}
    >
      {/*
        A drawn box, not a Checkbox. The option already carries
        `aria-selected` in a listbox that is `aria-multiselectable`, which is
        the whole announcement; a real checkbox inside it would be a second
        control in one row, and a tab stop the listbox pattern forbids.
      */}
      <span className="ion-multi-select-menu__check" aria-hidden="true">
        <CheckMark />
      </span>
      <span className="ion-multi-select-menu__text">
        <span className="ion-combobox-menu__label">{item.rendered}</span>
        {option?.description && (
          <span className="ion-combobox-menu__description">
            {option.description}
          </span>
        )}
      </span>
    </li>
  );
}

/** Breathing room kept between the menu and the viewport edge, in px. */
const GUTTER = 8;

/* ----------------------------------------------------------------- listbox */

/**
 * Mounted only while open, for the reason Combobox's is: `usePopover`
 * positions in an effect of the component that calls it. The width is read
 * during render for the reason given there, too — a ResizeObserver feeding a
 * width back into a positioned popover closes it.
 */
function MultiSelectListBox({
  state,
  listBoxRef,
  popoverRef,
  triggerRef,
  listBoxProps,
  emptyLabel,
}: {
  state: MultiState;
  listBoxRef: React.RefObject<HTMLUListElement | null>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  listBoxProps: AriaListBoxOptions<MultiSelectOption>;
  emptyLabel: React.ReactNode;
}) {
  const { popoverProps } = usePopover(
    {
      triggerRef,
      popoverRef,
      placement: 'bottom start',
      offset: 4,
      // Non-modal: focus stays in the input — see Combobox.
      isNonModal: true,
    },
    state,
  );

  const { listBoxProps: innerListBoxProps } = useListBox(
    listBoxProps,
    state,
    listBoxRef as React.RefObject<HTMLUListElement>,
  );

  const rect = triggerRef.current?.getBoundingClientRect();
  const width = rect
    ? Math.min(
        rect.width,
        document.documentElement.clientWidth - rect.left - GUTTER,
      )
    : undefined;

  return (
    <Overlay>
      <div
        {...popoverProps}
        ref={popoverRef}
        className="ion-combobox-menu"
        style={{ ...popoverProps.style, width }}
      >
        <DismissButton onDismiss={() => state.close()} />
        <ul
          {...innerListBoxProps}
          ref={listBoxRef}
          className="ion-combobox-menu__list"
        >
          {[...state.collection].map((item) => (
            <MultiSelectOptionRow
              key={item.key}
              item={item as Node<MultiSelectOption>}
              state={state}
            />
          ))}
        </ul>
        {state.collection.size === 0 && (
          <div className="ion-combobox-menu__empty" role="presentation">
            {emptyLabel}
          </div>
        )}
        <DismissButton onDismiss={() => state.close()} />
      </div>
    </Overlay>
  );
}

/* ------------------------------------------------------------- multiselect */

/**
 * MultiSelect — a text field that filters a list, with any number of selected
 * values shown as removable tags beneath it.
 *
 * WHY IT IS ITS OWN COMPONENT, NOT `Combobox selectionMode="multiple"`
 *
 * The two differ in what the field holds. Combobox's input shows the chosen
 * label — typing edits the value. Here the input only ever holds the filter
 * text, the value lives in the tags, and choosing an option leaves the list
 * open for the next one. One prop switching the meaning of the text in the
 * box is the kind of contract agents get wrong in generated code.
 *
 * WHAT REACT ARIA GIVES IT
 *
 * `useComboBoxState` and `useComboBox` in `selectionMode: 'multiple'`: the
 * listbox is `aria-multiselectable`, Enter and click toggle an option without
 * closing the list, the filter text clears after each pick, and native
 * `required` is set only while nothing is chosen — "at least one", the same
 * rule CheckboxGroup enforces.
 *
 * WHAT IT ADDS
 *
 *   - The tags. A TagGroup under the field, named by the field's label, one
 *     tab stop, Delete or the × to remove. The selection must be visible with
 *     the list closed, and "3 selected" hides which three.
 *   - The value is announced with the field. React Aria points the input's
 *     `aria-describedby` at a value element; this fills it with the chosen
 *     labels joined by `Intl.ListFormat`, so "Billing, Legal and Ops" is read
 *     in the user's language with no string shipped for it.
 *   - Backspace in an empty field removes the last value, which is what
 *     every tag input on the web has taught people to expect.
 *   - Focus lands back in the field when the last tag is removed, instead of
 *     falling to <body> with the TagGroup that held it.
 */
export function MultiSelect({
  options,
  label,
  'aria-label': ariaLabel,
  description,
  errorMessage,
  isInvalid,
  isDisabled,
  isReadOnly,
  isRequired,
  size = 'md',
  placeholder,
  value,
  defaultValue,
  onChange,
  inputValue,
  onInputChange,
  hideTags = false,
  emptyLabel = 'No matches',
  buttonLabel = 'Show options',
  name,
  className,
  wrapperClassName,
  id,
}: MultiSelectProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const { locale } = useLocale();

  const [uncontrolled, setUncontrolled] = useState<readonly string[]>(
    defaultValue ?? [],
  );
  const selected = value ?? uncontrolled;
  const setSelected = (next: string[]) => {
    if (value === undefined) setUncontrolled(next);
    onChange?.(next);
  };

  const byValue = useMemo(
    () => new Map(options.map((o) => [o.value, o])),
    [options],
  );

  // Filtered here, against label and description, for the reasons Combobox
  // gives: `items` bypasses react-stately's filter, and `textValue` must stay
  // the bare label.
  const [typed, setTyped] = useState('');
  const text = inputValue ?? typed;
  const filtered = useMemo(() => {
    if (!text) return options;
    return options.filter((o) =>
      contains([o.label, o.description].filter(Boolean).join(' '), text),
    );
  }, [contains, options, text]);

  const disabledKeys = useMemo(
    () => options.filter((o) => o.isDisabled).map((o) => o.value),
    [options],
  );

  const state = useComboBoxState<MultiSelectOption, 'multiple'>({
    label: typeof label === 'string' ? label : undefined,
    items: filtered,
    children: (item: MultiSelectOption) => (
      <Item key={item.value} textValue={item.label}>
        {item.label}
      </Item>
    ),
    selectionMode: 'multiple',
    disabledKeys,
    allowsEmptyCollection: true,
    isDisabled,
    isReadOnly,
    isRequired,
    value: selected as Key[],
    // The selection keeps insertion order — the order the tags appear in, and
    // the order `onChange` reports. PickingKeepsTheListOpen pins it.
    onChange: (keys) => setSelected([...keys].map(String)),
    inputValue,
    onInputChange: (v) => {
      setTyped(v);
      onInputChange?.(v);
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const listBoxRef = useRef<HTMLUListElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const remove = (keys: Iterable<Key>) => {
    const gone = new Set([...keys].map(String));
    const next = selected.filter((v) => !gone.has(v));
    setSelected(next);
    // The TagGroup unmounts with its last tag; focus goes back to the field.
    if (next.length === 0) inputRef.current?.focus();
  };

  const {
    buttonProps: triggerProps,
    inputProps,
    listBoxProps,
    labelProps,
    descriptionProps,
    errorMessageProps,
    valueProps,
  } = useComboBox(
    {
      id,
      label: typeof label === 'string' ? label : undefined,
      'aria-label': ariaLabel,
      placeholder,
      isDisabled,
      isReadOnly,
      isInvalid,
      isRequired,
      selectionMode: 'multiple',
      inputRef,
      listBoxRef,
      popoverRef,
      buttonRef,
      onKeyDown: (e) => {
        if (
          e.key === 'Backspace' &&
          state.inputValue === '' &&
          selected.length > 0 &&
          !isReadOnly
        ) {
          remove([selected[selected.length - 1]]);
        } else {
          e.continuePropagation();
        }
      },
    },
    state,
  );

  const { buttonProps } = useButton(
    { ...triggerProps, 'aria-label': buttonLabel },
    buttonRef,
  );

  const labels = selected.map((v) => byValue.get(v)?.label ?? v);
  const spoken = new Intl.ListFormat(locale, { type: 'conjunction' }).format(
    labels,
  );

  const helper = isInvalid && errorMessage ? errorMessage : description;

  const boxClassNames = [
    'ion-input',
    'ion-combobox',
    'ion-multi-select',
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
        {name &&
          selected.map((v) => (
            <input key={v} type="hidden" name={name} value={v} />
          ))}
        <button
          {...buttonProps}
          // Named for the action, not the field — see Combobox.
          aria-labelledby={undefined}
          aria-label={buttonLabel}
          // Pressing it must not take focus from the input — see Combobox.
          onMouseDown={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          ref={buttonRef}
          type="button"
          tabIndex={-1}
          className="ion-combobox__button"
        >
          <ChevronDown />
        </button>
      </div>

      {/* Read with the field, through the input's aria-describedby. */}
      <span {...valueProps} className="ion-visually-hidden">
        {spoken}
      </span>

      {selected.length > 0 && !hideTags && (
        <TagGroup
          aria-labelledby={label ? labelProps.id : undefined}
          aria-label={label ? undefined : ariaLabel}
          size={size === 'lg' ? 'md' : 'sm'}
          onRemove={isDisabled || isReadOnly ? undefined : remove}
          className="ion-multi-select__tags"
        >
          {selected.map((v) => (
            <Tag key={v} textValue={byValue.get(v)?.label ?? v}>
              {byValue.get(v)?.label ?? v}
            </Tag>
          ))}
        </TagGroup>
      )}

      {state.isOpen && (
        <MultiSelectListBox
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

MultiSelect.displayName = 'MultiSelect';
