'use client';

import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useContext,
  createContext,
  useId,
} from 'react';
import {
  FieldsetShell,
  useFieldsetHelper,
  type FieldsetOrientation,
} from './Fieldset.js';
import { resolveDisabled } from './resolve-disabled.js';

export type RadioSize = 'sm' | 'md' | 'lg';
export type RadioIntent = 'brand' | 'neutral' | 'danger';

interface RadioGroupContextValue {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: RadioSize;
  intent?: RadioIntent;
  isDisabled?: boolean;
  isRequired?: boolean;
  helperId?: string;
}

/**
 * A radio is meaningless alone — it needs siblings sharing a `name` and one
 * selected value. The context lets RadioGroup own that without every Radio
 * repeating the name, and without the caller wiring `checked`/`onChange` per
 * option.
 */
const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

/** Whether this is inside a RadioGroup — for SelectableTile. Not exported from the package. */
export const useIsInRadioGroup = () => useContext(RadioGroupContext) !== null;

export interface RadioProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'value'
> {
  value: string;
  size?: RadioSize;
  intent?: RadioIntent;
  /** Whether this radio is disabled. Falls back to the group's `isDisabled`. */
  isDisabled?: boolean;
  /**
   * @deprecated Use `isDisabled`. Accepted as an alias for one minor version.
   */
  disabled?: boolean;
  children?: React.ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (props, forwardedRef) => {
    const group = useContext(RadioGroupContext);
    const {
      value,
      size = group?.size ?? 'md',
      intent = group?.intent ?? 'brand',
      className,
      children,
      isDisabled,
      disabled,
      name = group?.name,
      'aria-describedby': describedBy,
      ...rest
    } = props;

    const resolvedDisabled =
      resolveDisabled(isDisabled, disabled) ?? group?.isDisabled;

    const domRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => domRef.current!);

    const classNames = [
      'ion-radio',
      size !== 'md' ? `ion-radio--${size}` : '',
      intent !== 'brand' ? `ion-radio--${intent}` : '',
      resolvedDisabled ? 'ion-radio--disabled' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    // Controlled only when the group is controlled; otherwise the group's
    // defaultValue seeds the native input and the DOM owns the selection.
    const controlled = group && group.value !== undefined;

    /*
     * One handler for both branches.
     *
     * These used to be written inline per branch, and only the uncontrolled one
     * chained `rest.onChange`. So `<Radio onChange={...}>` fired inside an
     * uncontrolled RadioGroup and was silently dead inside a controlled one —
     * the same component honouring two different contracts depending on a prop
     * set by its parent, with nothing to warn you which one you were getting.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      group?.onChange?.(value);
      rest.onChange?.(e);
    };

    return (
      <label className={classNames}>
        <input
          {...rest}
          ref={domRef}
          type="radio"
          name={name}
          value={value}
          disabled={resolvedDisabled}
          // Native `required` on a radio already means "one of this name" —
          // unlike a checkbox, it needs no toggling to say "at least one".
          required={group?.isRequired || rest.required}
          // The group's help or error, read on the radio that takes focus —
          // see the same note in Checkbox.
          aria-describedby={
            [describedBy, group?.helperId].filter(Boolean).join(' ') ||
            undefined
          }
          className="ion-radio__input"
          onChange={handleChange}
          {...(controlled
            ? { checked: group!.value === value }
            : { defaultChecked: group?.defaultValue === value })}
        />
        <span className="ion-radio__indicator" aria-hidden="true">
          <span className="ion-radio__dot" />
        </span>
        {children && <span className="ion-radio__label">{children}</span>}
      </label>
    );
  },
);

Radio.displayName = 'Radio';

export interface RadioGroupProps extends Omit<
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange'
> {
  /** Shared input name. Generated when omitted. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** The question the options answer. Renders as the `<legend>`. */
  label?: React.ReactNode;
  /** Help text beneath the options. Replaced by `errorMessage` while invalid. */
  description?: React.ReactNode;
  /** Shown in the description's place while `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  /** Shows `errorMessage` in the description's place. */
  isInvalid?: boolean;
  /** One option must be chosen before the form submits. */
  isRequired?: boolean;
  orientation?: FieldsetOrientation;
  size?: RadioSize;
  intent?: RadioIntent;
  /** Whether every radio in the group is disabled. */
  isDisabled?: boolean;
  /**
   * @deprecated Use `isDisabled`. Accepted as an alias for one minor version.
   */
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Renders a `<fieldset>` with a `<legend>` rather than a div with
 * `role="radiogroup"`. Both are announced correctly, but a fieldset also groups
 * the inputs for form submission and native validation, which the ARIA version
 * does not.
 *
 * The fieldset itself is Fieldset's shell, shared with CheckboxGroup, so the
 * two choice groups take the same label, help, error and orientation props.
 */
export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(
  (props, ref) => {
    const {
      name,
      value,
      defaultValue,
      onChange,
      size,
      intent,
      isDisabled,
      disabled,
      isRequired,
      description,
      errorMessage,
      className,
      ...rest
    } = props;

    const resolvedDisabled = resolveDisabled(isDisabled, disabled);
    const generated = useId();
    const { helper, helperId } = useFieldsetHelper(
      description,
      errorMessage,
      rest.isInvalid,
    );

    return (
      <RadioGroupContext.Provider
        value={{
          name: name ?? generated,
          value,
          defaultValue,
          onChange,
          size,
          intent,
          isDisabled: resolvedDisabled,
          isRequired,
          helperId,
        }}
      >
        <FieldsetShell
          {...rest}
          ref={ref}
          disabled={resolvedDisabled}
          isChoiceGroup
          helper={helper}
          helperId={helperId}
          className={['ion-radio-group', className].filter(Boolean).join(' ')}
        />
      </RadioGroupContext.Provider>
    );
  },
);

RadioGroup.displayName = 'RadioGroup';
