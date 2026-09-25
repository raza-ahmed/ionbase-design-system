'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  mergeProps,
  useButton,
  useFocusRing,
  useHover,
  useSearchField,
} from 'react-aria';
import type { AriaButtonProps, AriaSearchFieldProps } from 'react-aria';
import { useSearchFieldState } from 'react-stately';
import { ARIA_TEXT_FIELD_NON_DOM_PROPS, omitProps } from './dom-props.js';

export type SearchFieldSize = 'sm' | 'md' | 'lg';

type SearchFieldDOMProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  keyof AriaSearchFieldProps | 'size' | 'type' | 'disabled' | 'autoCapitalize'
>;

export interface SearchFieldProps
  extends AriaSearchFieldProps, SearchFieldDOMProps {
  /** Input's sizes: Small, Medium, Large. */
  size?: SearchFieldSize;
  /** Class names for the control box (`.ion-input`). */
  className?: string;
  /** Class names for the `.ion-field` wrapper when a label or helper is shown. */
  wrapperClassName?: string;
}

/** `onSubmit` and `onClear` are React Aria's, not the DOM's — never spread. */
const SEARCH_FIELD_NON_DOM_PROPS = [
  ...ARIA_TEXT_FIELD_NON_DOM_PROPS,
  'onSubmit',
  'onClear',
] as const;

const Magnifier = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path
      d="m20 20-3.5-3.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const Cross = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M18 6 6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

function ClearButton(props: AriaButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(props, ref);
  return (
    <button {...buttonProps} ref={ref} className="ion-search-field__clear">
      <Cross />
    </button>
  );
}

/**
 * SearchField — a text field for a search query.
 *
 * NOT `<Input type="search">`. That gets the right input type and nothing
 * else. `useSearchField` adds what a search box owes its user:
 *
 *   `role="searchbox"`, so a screen reader announces a search field, not a
 *   text field. Enter calls `onSubmit` with the query. Escape clears it — a
 *   second Escape then reaches whatever the field sits in, so a search inside
 *   a dialog clears first and closes second. A clear button appears once there
 *   is something to clear, named in the user's language by React Aria.
 *
 * The clear button is out of the tab order on purpose, as React Aria sets it:
 * Escape is the keyboard's way to clear, and an extra tab stop in every search
 * box costs every keyboard user a keystroke. Pressing it puts focus back in the
 * field.
 *
 * The box IS Input's — the component renders `.ion-input` and its size and
 * state classes, so a search field beside an Input in a toolbar matches it
 * exactly and cannot drift. Same arrangement as NumberInput.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  (props, forwardedRef) => {
    const {
      size = 'md',
      label,
      description,
      errorMessage,
      isDisabled,
      isReadOnly,
      isInvalid,
      className,
      wrapperClassName,
      ...rest
    } = props;

    const state = useSearchFieldState(props);
    const ref = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current as HTMLInputElement);

    const {
      labelProps,
      inputProps,
      clearButtonProps,
      descriptionProps,
      errorMessageProps,
    } = useSearchField(props, state, ref);

    const { hoverProps, isHovered } = useHover({ isDisabled });
    const { focusProps, isFocusVisible } = useFocusRing({ isTextInput: true });

    const domProps = omitProps(
      rest as Record<string, unknown>,
      SEARCH_FIELD_NON_DOM_PROPS as unknown as string[],
    );

    const canClear = state.value !== '' && !isDisabled && !isReadOnly;

    const box = (
      <div
        {...hoverProps}
        data-hovered={isHovered || undefined}
        data-focused={isFocusVisible || undefined}
        data-invalid={isInvalid || undefined}
        data-readonly={isReadOnly || undefined}
        data-disabled={isDisabled || undefined}
        className={[
          'ion-input',
          'ion-search-field',
          size !== 'md' ? `ion-input--${size}` : '',
          canClear ? 'ion-search-field--clearable' : '',
          isInvalid ? 'ion-input--invalid' : '',
          isReadOnly ? 'ion-input--readonly' : '',
          isDisabled ? 'ion-input--disabled' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="ion-input__icon-start" aria-hidden="true">
          <Magnifier />
        </span>
        <input
          {...domProps}
          {...mergeProps(inputProps, focusProps)}
          ref={ref}
          className="ion-input__field ion-search-field__field"
        />
        {canClear && <ClearButton {...clearButtonProps} />}
      </div>
    );

    const helper = isInvalid && errorMessage ? errorMessage : description;
    const helperProps =
      isInvalid && errorMessage ? errorMessageProps : descriptionProps;

    if (!label && !helper) return box;

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
        {box}
        {helper && (
          <span {...helperProps} className="ion-field__helper">
            {helper as React.ReactNode}
          </span>
        )}
      </div>
    );
  },
);

SearchField.displayName = 'SearchField';
