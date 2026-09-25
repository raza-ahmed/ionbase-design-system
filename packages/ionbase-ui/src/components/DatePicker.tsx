'use client';

import React, { useRef } from 'react';
import { useDatePicker, useButton } from 'react-aria';
import { useDatePickerState } from 'react-stately';
import { DateField } from './DateField.js';
import { SingleCalendar } from './Calendar.js';
import { CalendarPopover } from './CalendarPopover.js';
import { toCalendarDate, toIso, wrapUnavailable } from './iso-date.js';
import type { IsoDate } from './iso-date.js';

export type DatePickerSize = 'sm' | 'md' | 'lg';

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface DatePickerProps {
  /** Field label. Required for a usable control — see `a11y.requires`. */
  label?: React.ReactNode;
  /** Helper text below the field. */
  description?: React.ReactNode;
  /** Replaces the helper text while the field is invalid — `isInvalid`, or its own bounds check. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  /** Matches Input's `Size` variant: Small, Medium, Large. */
  size?: DatePickerSize;
  /**
   * The selected date as `YYYY-MM-DD`. `null` means nothing is selected.
   *
   * Not a `Date` and not a timestamp — a calendar date has no time and no
   * timezone, so it cannot shift across midnight the way `new Date('2026-04-12')`
   * does for every reader west of Greenwich. A malformed value throws rather
   * than rendering an empty field.
   */
  value?: IsoDate | null;
  /** The initial date as `YYYY-MM-DD`, for an uncontrolled picker. */
  defaultValue?: IsoDate;
  /** Fires with `YYYY-MM-DD`, or `null` when the field is cleared. */
  onChange?: (value: IsoDate | null) => void;
  /** Earliest selectable date, `YYYY-MM-DD`. Earlier dates are unreachable. */
  minValue?: IsoDate;
  /** Latest selectable date, `YYYY-MM-DD`. */
  maxValue?: IsoDate;
  /**
   * Individual dates the calendar refuses — weekends, holidays, booked days.
   * Receives `YYYY-MM-DD`. Use `minValue`/`maxValue` for a continuous bound;
   * this is for the holes inside it.
   */
  isDateUnavailable?: (date: IsoDate) => boolean;
  /** Posts the value under this name, for an uncontrolled form. */
  name?: string;
  /** Accessible label for the button that opens the calendar. */
  calendarLabel?: string;
  className?: string;
  wrapperClassName?: string;
  id?: string;
}

/**
 * DatePicker — a segmented date field with a calendar attached.
 *
 * WHY NOT `<input type="date">`
 *
 * The native control is genuinely good on mobile and genuinely unusable as a
 * design system component on desktop: its calendar cannot be styled at all, it
 * cannot express an unavailable date that is not part of a continuous min/max
 * range, and Safari on macOS renders no calendar button whatsoever. A system
 * whose date field looks like a different control in every browser is not a
 * design system, so this rebuilds it — and pays for that by having to rebuild
 * the keyboard handling and the screen-reader semantics the native control gave
 * away for free. React Aria's `useDatePicker` is what builds them back.
 *
 * THE VALUE IS A STRING, THE DISPLAY IS NOT
 *
 * `value` is always `YYYY-MM-DD` in the Gregorian calendar. What the user SEES
 * is their own locale's field order and their own calendar system, resolved
 * from `Intl` — so a German reader edits DD.MM.YYYY and the value still comes
 * back as `2026-04-12`. See `iso-date.ts` for why the public type is not
 * react-aria's `CalendarDate`.
 *
 * THE FIELD IS EDITABLE WITHOUT THE CALENDAR, AND THAT IS THE POINT
 *
 * Typing a date is faster than clicking one for anybody who knows the date they
 * want, and paging a calendar back to a birth year is miserable. The segments
 * take digits and arrow keys directly; the calendar is for the cases where the
 * date is being chosen rather than recalled.
 */
export function DatePicker({
  label,
  description,
  errorMessage,
  isInvalid,
  isDisabled,
  isReadOnly,
  isRequired,
  size = 'md',
  value,
  defaultValue,
  onChange,
  minValue,
  maxValue,
  isDateUnavailable,
  name,
  calendarLabel = 'Open calendar',
  className,
  wrapperClassName,
  id,
}: DatePickerProps) {
  /*
   * The ISO boundary, crossed once on the way in and once on the way out.
   *
   * `value === undefined` has to survive the conversion as `undefined`, not
   * become `null`. react-aria reads the two differently: `undefined` means
   * uncontrolled and `null` means controlled-and-empty, so collapsing them
   * would make an uncontrolled picker refuse to hold the date it was given.
   */
  const ariaProps = {
    label: typeof label === 'string' ? label : undefined,
    value: value === undefined ? undefined : toCalendarDate(value, 'value'),
    defaultValue: toCalendarDate(defaultValue, 'defaultValue') ?? undefined,
    minValue: toCalendarDate(minValue, 'minValue') ?? undefined,
    maxValue: toCalendarDate(maxValue, 'maxValue') ?? undefined,
    isDateUnavailable: wrapUnavailable(isDateUnavailable),
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    /*
     * `granularity: 'day'` is what keeps this a DATE picker. Left unset,
     * react-aria infers granularity from the value's type, and a value of
     * `undefined` infers 'minute' — so an empty picker renders hour and minute
     * segments that disappear the moment a date-only value arrives.
     */
    granularity: 'day' as const,
    onChange: onChange
      ? (date: Parameters<typeof toIso>[0] | null) =>
          onChange(date ? toIso(date) : null)
      : undefined,
  };

  const state = useDatePickerState(ariaProps);

  const groupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    groupProps,
    labelProps,
    fieldProps,
    buttonProps: triggerProps,
    dialogProps,
    calendarProps,
    descriptionProps,
    errorMessageProps,
  } = useDatePicker({ ...ariaProps, id }, state, groupRef);

  const { buttonProps } = useButton(triggerProps, buttonRef);

  /*
   * Invalid is the prop OR the picker's own validation — TimeField's rule.
   * Left to the prop alone, a date before `minValue` or after `maxValue` marked the segments
   * aria-invalid and left the box looking valid. With no `errorMessage`,
   * React Aria's own localized message says what is wrong.
   */
  const { isInvalid: failsValidation, validationErrors } =
    state.displayValidation;
  const invalid = !!isInvalid || failsValidation;
  const error =
    errorMessage ??
    (validationErrors.length ? validationErrors.join(' ') : null);
  const helper = invalid && error ? error : description;

  return (
    <div
      className={[
        'ion-field',
        invalid ? 'ion-field--error' : '',
        wrapperClassName || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        // A <span>, not a <label>. The group is a set of spinbuttons rather
        // than one form control, so `htmlFor` has nothing to point at —
        // `useDatePicker` wires the name through `aria-labelledby` instead.
        <span {...labelProps} className="ion-field__label">
          {label}
        </span>
      )}

      <div
        {...groupProps}
        ref={groupRef}
        className={[
          'ion-input',
          'ion-date-picker',
          size !== 'md' ? `ion-input--${size}` : '',
          invalid ? 'ion-input--invalid' : '',
          isDisabled ? 'ion-input--disabled' : '',
          isReadOnly ? 'ion-input--readonly' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-open={state.isOpen || undefined}
        data-invalid={invalid || undefined}
        data-disabled={isDisabled || undefined}
      >
        <DateField {...fieldProps} />

        {/*
          A hidden input so an uncontrolled form posts the ISO value. The
          segments are spinbuttons with no `name` of their own, so without this
          a form submit carries no date at all.
        */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={state.value ? toIso(state.value) : ''}
          />
        )}

        <button
          {...buttonProps}
          ref={buttonRef}
          type="button"
          /*
           * `aria-label` over what react-aria labels it with. Left alone, the
           * button is labelled by the field's own label — so it announces as
           * "Event starts, button" and says nothing about what pressing it
           * does. `aria-labelledby` is cleared because it would otherwise win.
           */
          aria-labelledby={undefined}
          aria-label={calendarLabel}
          className="ion-date-picker__button"
        >
          <CalendarIcon />
        </button>
      </div>

      {state.isOpen && !isDisabled && !isReadOnly && (
        <CalendarPopover
          state={state}
          triggerRef={groupRef}
          dialogProps={dialogProps}
        >
          <SingleCalendar {...calendarProps} />
        </CalendarPopover>
      )}

      {helper && (
        <span
          {...(invalid && error ? errorMessageProps : descriptionProps)}
          className="ion-field__helper"
        >
          {helper}
        </span>
      )}
    </div>
  );
}

DatePicker.displayName = 'DatePicker';
