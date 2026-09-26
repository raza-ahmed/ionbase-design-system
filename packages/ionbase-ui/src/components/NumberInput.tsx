'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import {
  mergeProps,
  useButton,
  useFocusRing,
  useHover,
  useLocale,
  useNumberField,
} from 'react-aria';
import type { AriaButtonProps, AriaNumberFieldProps } from 'react-aria';
import { useNumberFieldState } from 'react-stately';
import { ARIA_TEXT_FIELD_NON_DOM_PROPS, omitProps } from './dom-props.js';

export type NumberInputSize = 'sm' | 'md' | 'lg';

type NumberInputDOMProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | keyof AriaNumberFieldProps
  | 'size'
  | 'type'
  | 'min'
  | 'max'
  | 'step'
  | 'disabled'
  | 'value'
  | 'defaultValue'
  | 'onChange'
>;

export interface NumberInputProps
  extends
    Omit<AriaNumberFieldProps, 'value' | 'defaultValue' | 'onChange'>,
    NumberInputDOMProps {
  /**
   * Controlled value. `null` is empty — never `NaN`, which is what the
   * underlying hook uses and which fails every `===` check a caller writes.
   */
  value?: number | null;
  /** Uncontrolled starting value. `null` for empty. */
  defaultValue?: number | null;
  /**
   * Fires when the value is committed — on blur, Enter, a step button or an
   * arrow key — not on every keystroke. `null` when the field was cleared.
   */
  onChange?: (value: number | null) => void;
  /** Matches Input's `size`: Small, Medium, Large. */
  size?: NumberInputSize;
  /**
   * The − and + buttons. On by default; turn off for a dense table cell where
   * the arrow keys are enough.
   */
  showStepper?: boolean;
  /** Class names for the control box (`.ion-input`). */
  className?: string;
  /** Class names for the `.ion-field` wrapper when a label or helper is shown. */
  wrapperClassName?: string;
}

/* Props this component or the number-field hook consume, on top of a text field's. */
const NUMBER_FIELD_NON_DOM_PROPS = [
  ...ARIA_TEXT_FIELD_NON_DOM_PROPS,
  'minValue',
  'maxValue',
  'step',
  'formatOptions',
  'commitBehavior',
  'isWheelDisabled',
  'incrementAriaLabel',
  'decrementAriaLabel',
] as const;

const Minus = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M6 12h12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const Plus = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M12 6v12M6 12h12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

function StepButton({
  children,
  ...props
}: AriaButtonProps & { children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(props, ref);
  return (
    <button {...buttonProps} ref={ref} className="ion-number-input__step">
      {children}
    </button>
  );
}

const toHook = (v: number | null | undefined) => (v === null ? NaN : v);

/**
 * NumberInput — a quantity, with formatting, bounds and steps.
 *
 * NOT `<input type="number">`, and the list of reasons is the component:
 *
 *   It scrolls. A focused `type="number"` changes value under the mouse wheel,
 *   so a user scrolling the page past a price field edits the price. The wheel
 *   is OFF here by default (`isWheelDisabled`), and a caller has to ask for it.
 *
 *   It cannot format. "1,234.50", "€12", "15%" are text to the browser's number
 *   input, which rejects them. `formatOptions` takes `Intl.NumberFormatOptions`,
 *   so currency, percent and units display and parse in the user's locale —
 *   including "1.234,50" for a German user.
 *
 *   It is not a number to the browser's validation either. `type="text"` with
 *   the right `inputMode` gets the numeric keyboard on a phone without
 *   Firefox letting letters in and Chrome silently reporting an empty value.
 *
 * EMPTY IS `null`, NOT `NaN`. React Aria reports an empty field as `NaN`, and
 * `NaN === NaN` is false — so every "is it empty" check a caller writes is
 * wrong. This converts at the boundary, both ways.
 *
 * − AND + SIT SIDE BY SIDE, NOT STACKED. Stacked chevrons split the field's
 * height in two, which puts a Small field's targets at 16px — under the 24px
 * WCAG 2.5.8 asks. Side by side, every size clears it. They are out of the tab
 * order, as React Aria sets them: the arrow keys do the same job from the field,
 * and two extra tab stops per number on a form is a tax on every keyboard user.
 *
 * The box is Input's, class for class, so every state — hover, focus, invalid,
 * read-only, disabled — is Input's and cannot drift from it.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (props, forwardedRef) => {
    const {
      size = 'md',
      showStepper = true,
      isWheelDisabled = true,
      value,
      defaultValue,
      onChange,
      label,
      description,
      errorMessage,
      isDisabled,
      isReadOnly,
      className,
      wrapperClassName,
      ...rest
    } = props;

    const { locale } = useLocale();
    const hookProps: AriaNumberFieldProps = {
      ...props,
      isWheelDisabled,
      value: value === undefined ? undefined : toHook(value),
      defaultValue:
        defaultValue === undefined ? undefined : toHook(defaultValue),
      onChange: onChange
        ? (n: number) => onChange(Number.isNaN(n) ? null : n)
        : undefined,
    };

    const state = useNumberFieldState({ ...hookProps, locale });
    const ref = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current as HTMLInputElement);

    const {
      labelProps,
      groupProps,
      inputProps,
      incrementButtonProps,
      decrementButtonProps,
      descriptionProps,
      errorMessageProps,
      isInvalid,
    } = useNumberField(hookProps, state, ref);

    const { hoverProps, isHovered } = useHover({ isDisabled });
    const { focusProps, isFocusVisible } = useFocusRing({ isTextInput: true });

    const domProps = omitProps(
      rest as Record<string, unknown>,
      NUMBER_FIELD_NON_DOM_PROPS,
    );

    const box = (
      <div
        {...mergeProps(groupProps, hoverProps)}
        data-hovered={isHovered || undefined}
        data-focused={isFocusVisible || undefined}
        data-invalid={isInvalid || undefined}
        data-readonly={isReadOnly || undefined}
        data-disabled={isDisabled || undefined}
        className={[
          'ion-input',
          'ion-number-input',
          size !== 'md' ? `ion-input--${size}` : '',
          showStepper ? 'ion-number-input--stepper' : '',
          isInvalid ? 'ion-input--invalid' : '',
          isReadOnly ? 'ion-input--readonly' : '',
          isDisabled ? 'ion-input--disabled' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <input
          {...domProps}
          {...mergeProps(inputProps, focusProps)}
          ref={ref}
          className="ion-input__field ion-number-input__field"
        />
        {showStepper && (
          <span className="ion-number-input__steps">
            <StepButton {...decrementButtonProps}>
              <Minus />
            </StepButton>
            <StepButton {...incrementButtonProps}>
              <Plus />
            </StepButton>
          </span>
        )}
      </div>
    );

    const helper = isInvalid && errorMessage ? errorMessage : description;
    const helperProps =
      isInvalid && errorMessage ? errorMessageProps : descriptionProps;

    /*
     * Wrapped whenever an error message is passed, shown or not. A field that
     * only gained its wrapper when the error appeared was a different element
     * before and after — it remounted, and focus was lost as the user typed
     * the character that cleared the error.
     */
    if (!label && !helper && errorMessage === undefined) return box;

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

NumberInput.displayName = 'NumberInput';
