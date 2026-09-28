'use client';

import React, { useRef } from 'react';
import { useButton, useDatePicker } from 'react-aria';
import { useDatePickerState } from 'react-stately';
import type { DateValue, TimeValue } from 'react-aria';
import { DateField } from './DateField.js';
import { SingleCalendar } from './Calendar.js';
import { CalendarPopover } from './CalendarPopover.js';
import { TimeField } from './TimeField.js';
import { wrapUnavailable, type IsoDate } from './iso-date.js';
import {
  toCalendarDateTime,
  toIsoDateTime,
  type IsoDateTime,
} from './iso-date-time.js';
import { toIsoTime, toTime } from './iso-time.js';

export type DateTimePickerSize = 'sm' | 'md' | 'lg';
export type DateTimePickerGranularity = 'minute' | 'second';

export interface DateTimePickerLabels {
  /** The button that opens the calendar. Default "Open calendar". */
  calendar?: string;
  /** The time field under the calendar. Default "Time". */
  time?: string;
}

const DEFAULTS: Required<DateTimePickerLabels> = {
  calendar: 'Open calendar',
  time: 'Time',
};

export interface DateTimePickerProps {
  /** Field label. Required for a usable control — see `a11y.requires`. */
  label?: React.ReactNode;
  /** Names the field when there is no visible `label`. */
  'aria-label'?: string;
  /**
   * Helper text below the field. Say which timezone the time is in whenever
   * the reader could be in another — "Workspace time, UTC."
   */
  description?: React.ReactNode;
  /** Replaces the helper text while the field is invalid — `isInvalid`, or its own bounds check. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  /** Matches Input's `Size` variant: Small, Medium, Large. */
  size?: DateTimePickerSize;
  /**
   * The date and time as `YYYY-MM-DDTHH:MM` (`:SS` at second granularity):
   * a wall-clock reading, with no timezone and no offset. `null` means none
   * is chosen. A malformed value throws rather than rendering an empty field.
   */
  value?: IsoDateTime | null;
  /** The initial date and time, for an uncontrolled picker. */
  defaultValue?: IsoDateTime;
  /** Fires with `YYYY-MM-DDTHH:MM`, or `null` when the field is cleared. */
  onChange?: (value: IsoDateTime | null) => void;
  /**
   * The earliest allowed moment, `YYYY-MM-DDTHH:MM` — "not before now" is
   * the current reading. It bounds the date and the time together: on its
   * day, an earlier time is out of range; on a later day, any time is in.
   */
  minValue?: IsoDateTime;
  /** The latest allowed moment, `YYYY-MM-DDTHH:MM`. */
  maxValue?: IsoDateTime;
  /** Days the calendar refuses, whatever the time — weekends, holidays. Receives `YYYY-MM-DD`. */
  isDateUnavailable?: (date: IsoDate) => boolean;
  /** Defaults to `minute`. `second` adds a seconds segment, and `:SS` to the value. */
  granularity?: DateTimePickerGranularity;
  /**
   * 12 or 24-hour display. Leave it out: the reader's locale already knows.
   * The value is 24-hour either way.
   */
  hourCycle?: 12 | 24;
  /** Posts the value under this name, for an uncontrolled form. */
  name?: string;
  /** The calendar button's name and the time field's label. */
  labels?: DateTimePickerLabels;
  className?: string;
  wrapperClassName?: string;
  id?: string;
}

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect
      x="3"
      y="4"
      width="18"
      height="18"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M16 2v4M8 2v4M3 10h18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * DateTimePicker — a date and a time of day as one value: when a run
 * starts, when a maintenance window opens, when a message is sent.
 *
 * ONE FIELD, NOT A DATEPICKER BESIDE A TIMEFIELD
 *
 * Two fields hold two values, and the rules that span them are the caller's:
 * "not before now" means TimeField's minimum moves whenever the date is
 * today, and back when it is not. Here `minValue` is one moment, and the
 * field checks the date and the time against it together. One label names
 * it, one error describes it, one `name` posts it.
 *
 * HOW IT IS BUILT
 *
 *   - React Aria's `useDatePicker` at minute (or second) granularity, over
 *     the same segmented field as DatePicker: day, month, year, hour, minute
 *     and — in a 12-hour locale — AM/PM, each typed or stepped with the
 *     arrow keys, in the reader's own order.
 *   - The calendar button opens the calendar with a TimeField under it. A
 *     day picked keeps the time already set, and the popover stays open so
 *     the time can follow; Escape or a click outside closes it, and a day
 *     picked with no time yet takes midnight, shown in the field to change.
 *   - The value is a wall-clock string, never a `Date`. See `iso-date-time.ts`.
 */
export function DateTimePicker({
  label,
  'aria-label': ariaLabel,
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
  granularity = 'minute',
  hourCycle,
  name,
  labels,
  className,
  wrapperClassName,
  id,
}: DateTimePickerProps) {
  const l = { ...DEFAULTS, ...labels };
  const withSeconds = granularity === 'second';

  // `undefined` stays `undefined` — see DatePicker on uncontrolled vs empty.
  const ariaProps = {
    label: typeof label === 'string' ? label : undefined,
    'aria-label': ariaLabel,
    value: value === undefined ? undefined : toCalendarDateTime(value, 'value'),
    defaultValue: toCalendarDateTime(defaultValue, 'defaultValue') ?? undefined,
    minValue: toCalendarDateTime(minValue, 'minValue') ?? undefined,
    maxValue: toCalendarDateTime(maxValue, 'maxValue') ?? undefined,
    isDateUnavailable: wrapUnavailable(isDateUnavailable),
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    granularity,
    hourCycle,
    // A day picked leaves the popover open, so its time can be set next.
    shouldCloseOnSelect: false,
    onChange: onChange
      ? (v: DateValue | null) =>
          onChange(v ? toIsoDateTime(v, withSeconds) : null)
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

  // Invalid is the prop OR the picker's own bounds check — DatePicker's rule.
  const { isInvalid: failsValidation, validationErrors } =
    state.displayValidation;
  const invalid = !!isInvalid || failsValidation;
  const error =
    errorMessage ??
    (validationErrors.length ? validationErrors.join(' ') : null);
  const helper = invalid && error ? error : description;

  const time = state.timeValue as
    (TimeValue & { hour: number; minute: number; second: number }) | null;

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
        // A <span>: the group is spinbuttons, not one control — see DatePicker.
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
          'ion-date-time-picker',
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

        {name && (
          <input
            type="hidden"
            name={name}
            value={state.value ? toIsoDateTime(state.value, withSeconds) : ''}
          />
        )}

        <button
          {...buttonProps}
          ref={buttonRef}
          type="button"
          // Named for what it does, not by the field's label — see DatePicker.
          aria-labelledby={undefined}
          aria-label={l.calendar}
          className="ion-date-picker__button"
        >
          <CalendarIcon />
        </button>
      </div>

      {state.isOpen && !isDisabled && !isReadOnly && (
        <CalendarPopover
          /*
           * Escape and a click outside close the popover through `close()`.
           * React Aria commits a day picked with no time only in the state's
           * own `setOpen(false)`, which `close()` does not reach, so without
           * this the day was dropped on the floor.
           */
          state={{ ...state, close: () => state.setOpen(false) }}
          triggerRef={groupRef}
          dialogProps={dialogProps}
        >
          <SingleCalendar {...calendarProps} />
          <div className="ion-date-time-picker__time">
            <TimeField
              label={l.time}
              size="sm"
              granularity={granularity}
              hourCycle={hourCycle}
              value={time ? toIsoTime(time, withSeconds) : null}
              onChange={(t) => state.setTimeValue(toTime(t, 'time')!)}
            />
          </div>
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

DateTimePicker.displayName = 'DateTimePicker';
