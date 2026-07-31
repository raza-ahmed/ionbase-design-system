'use client';

import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { useTextField, useHover, useFocusRing, mergeProps } from 'react-aria';
import type { AriaTextFieldProps } from 'react-aria';
import { ARIA_TEXT_FIELD_NON_DOM_PROPS, omitProps } from './dom-props.js';

export type InputSize = 'sm' | 'md' | 'lg';

/**
 * The plain `<input>` attributes that React Aria has no opinion about —
 * `title`, `list`, `onClick`, `style` and the rest.
 *
 * `AriaTextFieldProps` wins every overlap: it is omitted from this side, so
 * `value`, `onChange`, `placeholder` and friends keep React Aria's types and
 * semantics rather than the DOM's. Without this, spreading the rest props onto
 * the element was pointless — the runtime would forward attributes the type
 * refused to accept, so no caller could pass them in the first place.
 */
type InputDOMProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  keyof AriaTextFieldProps | 'size' | 'autoCapitalize'
>;

export interface InputProps extends AriaTextFieldProps, InputDOMProps {
  /** Matches the Figma `Size` variant: Small, Medium, Large. */
  size?: InputSize;
  /**
   * Narrower than React's own typing, which also allows any `string`.
   * `autoCapitalize` is declared on `AriaTextFieldOptions` rather than
   * `AriaTextFieldProps`, so `keyof AriaTextFieldProps` above cannot omit it —
   * and the wide DOM version does not satisfy what `useTextField` accepts.
   */
  autoCapitalize?: 'none' | 'off' | 'on' | 'sentences' | 'words' | 'characters';
  /** Leading icon. Figma's `Show Leading Icon` + `Leading Icon` swap. */
  leadingIcon?: React.ReactNode;
  /** Trailing icon. Figma's `Show Trailing Icon` + `Trailing Icon` swap. */
  trailingIcon?: React.ReactNode;
  /** Additional CSS class names, applied to the outermost element. */
  className?: string;
}

/**
 * Input covers both Figma components on the Input page: the field itself
 * (`Input`, 80:275) and the label/helper stack around it (`Form Field`,
 * 80:330). They are separate there because a Figma component cannot make a
 * slot optional without a boolean; here the wrapper simply isn't rendered when
 * there is nothing to put in it.
 *
 * `useTextField` owns the wiring that is tedious and easy to get subtly wrong:
 * it generates the ids, points `aria-labelledby` at the label and
 * `aria-describedby` at whichever of the helper or error message is actually
 * showing, and sets `aria-invalid`. Hand-rolling that is where form fields
 * usually lose their accessibility.
 *
 * Figma's seven states map to three props and three CSS states. Hover and Focus
 * are interaction; Filled is the placeholder distinction, which CSS already
 * expresses; Default, Invalid, Disabled and Read-only are props.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (props, forwardedRef) => {
    const {
      size = 'md',
      leadingIcon,
      trailingIcon,
      className: customClassName,
      label,
      description,
      errorMessage,
      isDisabled,
      isReadOnly,
      isInvalid,
      ...restProps
    } = props;

    /*
     * Everything the caller passed that this component and React Aria have no
     * opinion about — `data-testid`, `name`, `autoComplete`, arbitrary `data-*`
     * and `aria-*`.
     *
     * There was no rest object here at all, so those props were silently
     * dropped: the ten named ones were used and the remainder went nowhere.
     * Every other component in the library spreads its rest, which is what made
     * this read as an oversight rather than a policy. Non-DOM React Aria props
     * are stripped first for the same reason Button strips them — see
     * ./dom-props.ts.
     */
    const domProps = omitProps(restProps, ARIA_TEXT_FIELD_NON_DOM_PROPS);

    const domRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => domRef.current!);

    const { labelProps, inputProps, descriptionProps, errorMessageProps } =
      useTextField(props, domRef);

    const { hoverProps, isHovered } = useHover({ isDisabled });
    const { focusProps, isFocusVisible } = useFocusRing({ isTextInput: true });

    const boxClassNames = [
      'ion-input',
      size !== 'md' ? `ion-input--${size}` : '',
      isInvalid ? 'ion-input--invalid' : '',
      isReadOnly ? 'ion-input--readonly' : '',
      isDisabled ? 'ion-input--disabled' : '',
      // With no label or helper there is no wrapper, so the consumer's class
      // belongs on the box instead.
      !label && !description && !errorMessage ? customClassName || '' : '',
    ]
      .filter(Boolean)
      .join(' ');

    // `undefined` rather than `false` so the attribute is omitted entirely
    // instead of rendering data-hovered="false", which would still match an
    // `[data-hovered]` selector.
    const stateAttributes = {
      'data-hovered': isHovered || undefined,
      'data-focused': isFocusVisible || undefined,
      'data-invalid': isInvalid || undefined,
      'data-readonly': isReadOnly || undefined,
      'data-disabled': isDisabled || undefined,
    };

    const box = (
      <div {...hoverProps} {...stateAttributes} className={boxClassNames}>
        {leadingIcon && (
          <span className="ion-input__icon-start" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          {...domProps}
          {...mergeProps(inputProps, focusProps)}
          ref={domRef}
          className="ion-input__field"
        />
        {trailingIcon && (
          <span className="ion-input__icon-end" aria-hidden="true">
            {trailingIcon}
          </span>
        )}
      </div>
    );

    // Figma's Error variant recolours the helper text, so the error message
    // takes the helper's slot rather than stacking below it.
    const helper = isInvalid && errorMessage ? errorMessage : description;
    const helperProps =
      isInvalid && errorMessage ? errorMessageProps : descriptionProps;

    if (!label && !helper) return box;

    return (
      <div
        className={[
          'ion-field',
          isInvalid ? 'ion-field--error' : '',
          customClassName || '',
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

Input.displayName = 'Input';
