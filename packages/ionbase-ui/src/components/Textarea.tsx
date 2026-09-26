'use client';

import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { useTextField, useHover, useFocusRing, mergeProps } from 'react-aria';
import type { AriaTextFieldProps } from 'react-aria';
import { ARIA_TEXT_FIELD_NON_DOM_PROPS, omitProps } from './dom-props.js';
import { resolveDisabled } from './resolve-disabled.js';

export type TextareaSize = 'sm' | 'md' | 'lg';

/**
 * The plain `<textarea>` attributes React Aria has no opinion about. Same shape
 * as InputDOMProps and for the same reason: `AriaTextFieldProps` wins every
 * overlap, so `value`, `onChange` and `placeholder` keep React Aria's semantics
 * rather than the DOM's.
 */
type TextareaDOMProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  | keyof AriaTextFieldProps<HTMLTextAreaElement>
  | 'rows'
  | 'disabled'
  | 'autoCapitalize'
>;

/*
 * The element generic matters. Bare `AriaTextFieldProps` defaults to
 * `HTMLInputElement`, so every event handler on it is typed for an input —
 * and `useTextField<'textarea'>` then rejects the props object because
 * `onFocus` and friends disagree about what the target is.
 */
export interface TextareaProps
  extends AriaTextFieldProps<HTMLTextAreaElement>, TextareaDOMProps {
  /** Matches the Figma `Size` variant: Small, Medium, Large. */
  size?: TextareaSize;
  /**
   * Narrower than React's own typing, which also allows any `string` — the same
   * correction Input carries. `autoCapitalize` is declared on
   * `AriaTextFieldOptions` rather than `AriaTextFieldProps`, so the `keyof`
   * omission above cannot reach it.
   */
  autoCapitalize?: 'none' | 'off' | 'on' | 'sentences' | 'words' | 'characters';
  /**
   * Visible rows. Three matches the Figma frame, whose height is derived from
   * three lines of bound line-height rather than a fixed number — so this stays
   * correct if the type ramp moves.
   */
  rows?: number;
  /** Field label. Renders the same `.ion-field` wrapper Input uses. */
  label?: React.ReactNode;
  /** Helper text below the field. */
  description?: React.ReactNode;
  /** Replaces the helper text when `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  /**
   * @deprecated Use `isDisabled`. Accepted as an alias for one minor version.
   */
  disabled?: boolean;
  /** Class names for the control itself (`.ion-textarea`). */
  className?: string;
  /** Class names for the `.ion-field` wrapper when a label or helper is shown. */
  wrapperClassName?: string;
}

/**
 * A multi-line text field.
 *
 * Geometry from the Figma `Textarea` (1301:334). Every size and state is
 * Input's — see textarea.css for why that is the point rather than a shortcut.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(props, forwardedRef) {
    const {
      size = 'md',
      rows = 3,
      label,
      description,
      errorMessage,
      className,
      wrapperClassName,
      isDisabled: isDisabledProp,
      disabled,
      ...rest
    } = props;

    const isDisabled = resolveDisabled(isDisabledProp, disabled);
    const ref = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement);

    const {
      labelProps,
      inputProps,
      descriptionProps,
      errorMessageProps,
      isInvalid,
    } = useTextField<'textarea'>(
      {
        ...props,
        isDisabled,
        label,
        description,
        errorMessage,
        inputElementType: 'textarea',
      },
      ref,
    );

    const { hoverProps, isHovered } = useHover({ isDisabled });
    const { focusProps, isFocusVisible } = useFocusRing({ isTextInput: true });

    const classes = [
      'ion-textarea',
      size !== 'md' ? `ion-textarea--${size}` : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const control = (
      <textarea
        {...mergeProps(inputProps, hoverProps, focusProps)}
        {...omitProps(rest, ARIA_TEXT_FIELD_NON_DOM_PROPS)}
        ref={ref}
        rows={rows}
        className={classes}
        data-hovered={isHovered || undefined}
        data-focused={isFocusVisible || undefined}
        data-invalid={isInvalid || undefined}
        data-readonly={props.isReadOnly || undefined}
        data-disabled={isDisabled || undefined}
      />
    );

    // No label and no helper: the control is the whole component, and wrapping
    // it in a column that holds nothing else only adds a node.
    /*
     * Wrapped whenever an error message is passed, shown or not. A field that
     * only gained its wrapper when the error appeared was a different element
     * before and after — it remounted, and focus was lost as the user typed
     * the character that cleared the error.
     */
    if (!label && !description && errorMessage === undefined) return control;

    return (
      <div
        className={[
          'ion-field',
          isInvalid ? 'ion-field--error' : '',
          wrapperClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label && (
          <label {...labelProps} className="ion-field__label">
            {label}
          </label>
        )}
        {control}
        {isInvalid && errorMessage ? (
          <span {...errorMessageProps} className="ion-field__helper">
            {errorMessage}
          </span>
        ) : (
          description && (
            <span {...descriptionProps} className="ion-field__helper">
              {description}
            </span>
          )
        )}
      </div>
    );
  },
);
