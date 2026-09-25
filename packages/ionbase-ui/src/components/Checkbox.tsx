'use client';

import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  FieldsetShell,
  useFieldsetHelper,
  type FieldsetOrientation,
} from './Fieldset.js';
import { resolveDisabled } from './resolve-disabled.js';
import { resolveSelection, type SelectionProps } from './resolve-selection.js';

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxIntent = 'brand' | 'neutral' | 'danger';

interface CheckboxGroupContextValue {
  name?: string;
  selected: readonly string[];
  toggle: (value: string, isSelected: boolean) => void;
  size?: CheckboxSize;
  intent?: CheckboxIntent;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  helperId?: string;
}

/**
 * Lets CheckboxGroup own the selected values the way RadioGroup owns the
 * selected value: each Checkbox reads whether its `value` is in the set and
 * reports its toggles, and the caller wires one `onChange` instead of one per
 * option.
 */
const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(
  null,
);

export interface CheckboxProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
    SelectionProps {
  /** Matches the Figma `Size` variant: Small, Medium, Large. */
  size?: CheckboxSize;
  /** Matches the Figma `Color` variant: Brand, Neutral, Danger. */
  intent?: CheckboxIntent;
  /**
   * Figma's `Indeterminate` state. Not an HTML attribute — `indeterminate` is a
   * DOM property only, so it has to be assigned after render.
   */
  isIndeterminate?: boolean;
  /** Whether the checkbox is disabled. */
  isDisabled?: boolean;
  /**
   * @deprecated Use `isDisabled`. Accepted as an alias for one minor version.
   */
  disabled?: boolean;
  /** Figma's `Show Label` + `Label`. Omit for a bare box. */
  children?: React.ReactNode;
}

/** Figma's check glyph. Inlined for the same reason as Select's chevron: it is
 *  part of the control, not a slot a caller fills. */
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

const DashMark = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M6 12h12"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Checkbox wraps a native `<input type="checkbox">` and hides it.
 *
 * The native input is kept rather than replaced by a div with `role=checkbox`
 * because it brings form association, the indeterminate property, label
 * clicking, and correct announcement — none of which are free to reimplement,
 * and all of which are easy to get subtly wrong.
 *
 * `indeterminate` is the reason for the effect below: HTML has no
 * `indeterminate` attribute, only a DOM property, so React cannot set it
 * declaratively and it must be written after every render.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (props, forwardedRef) => {
    const group = useContext(CheckboxGroupContext);
    const {
      size = group?.size ?? 'md',
      intent = group?.intent ?? 'brand',
      isIndeterminate = false,
      className,
      children,
      isDisabled,
      disabled,
      isSelected,
      checked,
      onChange,
      onSelectionChange,
      name = group?.name,
      'aria-describedby': describedBy,
      ...rest
    } = props;

    const resolvedDisabled =
      resolveDisabled(isDisabled, disabled) ?? group?.isDisabled;
    const selection = resolveSelection(
      isSelected,
      checked,
      onChange,
      onSelectionChange,
    );

    /*
     * Inside a group the group owns `checked`, and the box's own handlers still
     * fire after it — the contract RadioGroup settled on, so neither control
     * honours a handler in one mode and drops it in the other.
     */
    const value = rest.value === undefined ? '' : String(rest.value);
    const groupSelection = group
      ? {
          checked: group.selected.includes(value),
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            group.toggle(value, event.target.checked);
            selection.onChange?.(event);
          },
        }
      : selection;

    /*
     * "Select at least one", in the platform's own words. `required` on a
     * checkbox means "this one must be ticked", so it is set on every box while
     * none is and dropped from all of them the moment one is: native
     * validation then blocks the submit with the browser's localised message,
     * and each box announces "required" exactly while the rule is unmet.
     */
    const required = group?.isRequired
      ? group.selected.length === 0
      : rest.required;

    const domRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => domRef.current!);

    useEffect(() => {
      if (domRef.current) domRef.current.indeterminate = isIndeterminate;
    }, [isIndeterminate]);

    const classNames = [
      'ion-checkbox',
      size !== 'md' ? `ion-checkbox--${size}` : '',
      intent !== 'brand' ? `ion-checkbox--${intent}` : '',
      resolvedDisabled ? 'ion-checkbox--disabled' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <label className={classNames}>
        <input
          {...rest}
          ref={domRef}
          type="checkbox"
          name={name}
          required={required}
          checked={groupSelection.checked}
          onChange={groupSelection.onChange}
          disabled={resolvedDisabled}
          aria-invalid={group?.isInvalid || rest['aria-invalid']}
          // The group's help or error is read on every box, not only on entry
          // to the fieldset — a screen reader tabbing back in skips the legend.
          aria-describedby={
            [describedBy, group?.helperId].filter(Boolean).join(' ') ||
            undefined
          }
          className="ion-checkbox__input"
        />
        <span className="ion-checkbox__indicator" aria-hidden="true">
          <span className="ion-checkbox__mark">
            {isIndeterminate ? <DashMark /> : <CheckMark />}
          </span>
        </span>
        {children && <span className="ion-checkbox__label">{children}</span>}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export interface CheckboxGroupProps extends Omit<
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange' | 'defaultValue' | 'disabled'
> {
  /** The question the options answer. Renders as the `<legend>`. */
  label?: React.ReactNode;
  /** Help text beneath the options. Replaced by `errorMessage` while invalid. */
  description?: React.ReactNode;
  /** Shown in the description's place while `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  /** Marks every box invalid and shows `errorMessage`. */
  isInvalid?: boolean;
  /** At least one option must be selected — enforced by native validation. */
  isRequired?: boolean;
  /** The selected values (controlled). */
  value?: readonly string[];
  /** The initially selected values (uncontrolled). */
  defaultValue?: readonly string[];
  /** Receives the whole new selection, in the order the options were ticked. */
  onChange?: (value: string[]) => void;
  /** Shared input name, so a form submits every ticked value under it. */
  name?: string;
  size?: CheckboxSize;
  intent?: CheckboxIntent;
  /** Whether every checkbox in the group is disabled. */
  isDisabled?: boolean;
  orientation?: FieldsetOrientation;
  /** Checkboxes, each with a `value`. */
  children?: React.ReactNode;
}

/**
 * A set of checkboxes that answers one question — "notify me when…", "which
 * regions". Owns the selected values, the group's label, help text and error,
 * and "select at least one".
 *
 * A row of loose Checkboxes can do none of that accessibly: the question is
 * not announced with the options, an error has nothing to attach to, and
 * "at least one" has no native expression at all. See the `required` note in
 * Checkbox for how that last one is done.
 */
export const CheckboxGroup = forwardRef<
  HTMLFieldSetElement,
  CheckboxGroupProps
>((props, ref) => {
  const {
    value: controlledValue,
    defaultValue,
    onChange,
    name,
    size,
    intent,
    isDisabled,
    isRequired,
    description,
    errorMessage,
    ...rest
  } = props;

  const [uncontrolled, setUncontrolled] = useState<readonly string[]>(
    defaultValue ?? [],
  );
  const selected = controlledValue ?? uncontrolled;

  const toggle = (value: string, isSelected: boolean) => {
    const next = isSelected
      ? selected.includes(value)
        ? [...selected]
        : [...selected, value]
      : selected.filter((v) => v !== value);
    if (controlledValue === undefined) setUncontrolled(next);
    onChange?.(next);
  };

  const { helper, helperId } = useFieldsetHelper(
    description,
    errorMessage,
    rest.isInvalid,
  );

  return (
    <CheckboxGroupContext.Provider
      value={{
        name,
        selected,
        toggle,
        size,
        intent,
        isDisabled,
        isInvalid: rest.isInvalid,
        isRequired,
        helperId,
      }}
    >
      <FieldsetShell
        {...rest}
        ref={ref}
        disabled={isDisabled}
        isChoiceGroup
        helper={helper}
        helperId={helperId}
      />
    </CheckboxGroupContext.Provider>
  );
});

CheckboxGroup.displayName = 'CheckboxGroup';
