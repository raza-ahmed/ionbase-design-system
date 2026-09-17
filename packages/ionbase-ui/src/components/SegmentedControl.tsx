'use client';

import React, { createContext, forwardRef, useContext, useRef } from 'react';
import {
  useFocusRing,
  useRadio,
  useRadioGroup,
  VisuallyHidden,
} from 'react-aria';
import { useRadioGroupState } from 'react-stately';
import type { RadioGroupState } from 'react-stately';

export type SegmentedControlSize = 'sm' | 'md' | 'lg';

const SegmentedContext = createContext<RadioGroupState | null>(null);

export interface SegmentedControlProps {
  /**
   * The accessible name of the group. Required: "List, Board, Calendar" means
   * nothing until something says they are views.
   */
  label: string;
  /** Show `label` above the control, as a form field does. Hidden by default. */
  showLabel?: boolean;
  /** Controlled selected value. Pass `onChange` with it. */
  value?: string;
  /**
   * Uncontrolled starting value. One option should always be selected — a
   * segmented control with nothing chosen reads as broken, not as "no choice".
   */
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: SegmentedControlSize;
  /** Stretch to the container, with equal-width segments. */
  isFullWidth?: boolean;
  isDisabled?: boolean;
  /** Submitted with a form under this name. */
  name?: string;
  /** `SegmentedControlItem` elements. Two to five of them. */
  children?: React.ReactNode;
  className?: string;
}

export interface SegmentedControlItemProps {
  /** The value this segment selects. */
  value: string;
  /** Icon before the label. `aria-hidden` is applied for you. */
  icon?: React.ReactNode;
  /**
   * Required when the segment has no visible text — an icon-only segment is
   * otherwise announced as an unnamed radio button.
   */
  'aria-label'?: string;
  isDisabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * SegmentedControl — pick one of a few options, and see all of them.
 *
 * NOT TABS, ALTHOUGH IT LOOKS LIKE THE PILL TYPE, and the difference is the
 * contract. Tabs switch between panels: `tablist`, `tab`, `tabpanel`, and each
 * tab controls a region. This sets a VALUE — a view mode, a time range, a
 * unit — and controls no panel. It is a `radiogroup`, so it has one tab stop,
 * arrow keys move and select, and it submits with a form like any radio.
 *
 * Built from real radio inputs, visually hidden, not from buttons with
 * `aria-pressed`. A row of toggle buttons is a tab stop per option and no
 * mutual exclusion that assistive tech can announce; radios give "2 of 3,
 * selected" for free.
 *
 * The look is Tabs' pill track, token for token, so the two cannot drift
 * apart visually — which is exactly why the intent file spends its words on
 * when to use which.
 */
export const SegmentedControl = forwardRef<
  HTMLDivElement,
  SegmentedControlProps
>((props, ref) => {
  const {
    label,
    showLabel = false,
    size = 'md',
    isFullWidth = false,
    isDisabled = false,
    children,
    className,
  } = props;

  const state = useRadioGroupState({ ...props, isDisabled });
  /*
   * A hidden label is an `aria-label`, not a visually hidden element inside
   * the group: a label node inside the radiogroup is read again as part of
   * its content.
   */
  const { radioGroupProps, labelProps } = useRadioGroup(
    {
      ...props,
      isDisabled,
      orientation: 'horizontal',
      label: showLabel ? label : undefined,
      'aria-label': showLabel ? undefined : label,
    },
    state,
  );

  const track = (
    <div
      {...radioGroupProps}
      ref={ref}
      className={[
        'ion-segmented-control',
        size !== 'md' ? `ion-segmented-control--${size}` : '',
        isFullWidth ? 'ion-segmented-control--full-width' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <SegmentedContext.Provider value={state}>
        {children}
      </SegmentedContext.Provider>
    </div>
  );

  if (!showLabel) return track;

  return (
    <div
      className={[
        'ion-field',
        'ion-segmented-control-field',
        isFullWidth ? 'ion-segmented-control-field--full-width' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span {...labelProps} className="ion-field__label">
        {label}
      </span>
      {track}
    </div>
  );
});

SegmentedControl.displayName = 'SegmentedControl';

export const SegmentedControlItem = forwardRef<
  HTMLLabelElement,
  SegmentedControlItemProps
>((props, ref) => {
  const { value, icon, isDisabled = false, children, className } = props;
  const state = useContext(SegmentedContext);
  if (!state) {
    throw new Error(
      'SegmentedControlItem must be rendered inside a SegmentedControl',
    );
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const {
    inputProps,
    isSelected,
    isDisabled: disabled,
  } = useRadio(
    { value, isDisabled, children, 'aria-label': props['aria-label'] },
    state,
    inputRef,
  );
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <label
      ref={ref}
      className={[
        'ion-segmented-control__item',
        isSelected ? 'ion-segmented-control__item--selected' : '',
        disabled ? 'ion-segmented-control__item--disabled' : '',
        isFocusVisible ? 'ion-segmented-control__item--focus-visible' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <VisuallyHidden>
        <input {...inputProps} {...focusProps} ref={inputRef} />
      </VisuallyHidden>
      {icon && (
        <span className="ion-segmented-control__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children && (
        <span className="ion-segmented-control__label">{children}</span>
      )}
    </label>
  );
});

SegmentedControlItem.displayName = 'SegmentedControlItem';
