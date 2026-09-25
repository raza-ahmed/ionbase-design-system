'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useLocale, useTimeField } from 'react-aria';
import { useTimeFieldState } from 'react-stately';
import type { Time } from '@internationalized/date';
import { Segment } from './DateField.js';
import { toIsoTime, toTime, type IsoTime } from './iso-time.js';

export type TimeFieldSize = 'sm' | 'md' | 'lg';
/** The smallest unit the field edits. */
export type TimeFieldGranularity = 'hour' | 'minute' | 'second';

export interface TimeFieldProps {
  /** Field label. Required for a usable control — see `a11y.requires`. */
  label?: React.ReactNode;
  /** Names the field when there is no visible `label`. */
  'aria-label'?: string;
  /** Helper text below the field — "In the workspace's timezone". */
  description?: React.ReactNode;
  /** Replaces the helper text while the field is invalid — `isInvalid`, or its own bounds check. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  /** Matches Input's `Size` variant: Small, Medium, Large. */
  size?: TimeFieldSize;
  /**
   * The time as `HH:MM` (or `HH:MM:SS`), 24-hour, whatever the reader sees.
   * `null` means no time is chosen. A wall-clock reading — no date, no
   * timezone. A malformed value throws rather than rendering an empty field.
   */
  value?: IsoTime | null;
  /** The initial time, for an uncontrolled field. */
  defaultValue?: IsoTime;
  /** Fires with `HH:MM` (`HH:MM:SS` at second granularity), or `null` when cleared. */
  onChange?: (value: IsoTime | null) => void;
  /** Earliest allowed time, `HH:MM`. Later is not wrapped past midnight. */
  minValue?: IsoTime;
  /** Latest allowed time, `HH:MM`. */
  maxValue?: IsoTime;
  /** Defaults to `minute`. `second` adds a seconds segment and value. */
  granularity?: TimeFieldGranularity;
  /**
   * 12 or 24-hour display. Leave it out: the reader's locale already knows,
   * and forcing 12-hour on a 24-hour reader is the misreading this field
   * exists to prevent. The value is 24-hour either way.
   */
  hourCycle?: 12 | 24;
  /** Posts the value under this name, for an uncontrolled form. */
  name?: string;
  className?: string;
  wrapperClassName?: string;
  id?: string;
}

const ClockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

/**
 * TimeField — a time of day, typed into segments.
 *
 * DatePicker's text half, for times: hour, minute and, where the locale uses
 * one, AM/PM — each a spinbutton that takes digits or arrow keys. The order,
 * the separator and the 12 or 24-hour clock come from the reader's locale, so
 * "2:30 PM" and "14:30" are the same field and the same value.
 *
 * WHY NOT A TEXT INPUT OR `<input type="time">`
 *
 * Free text means guessing whether "2:30" is afternoon. The native control
 * cannot be styled to match the other fields, and Safari's has no picker at
 * all. Segments cannot hold a time that does not exist, and every browser
 * draws them the same.
 *
 * No dropdown of times. A list of 96 quarter-hours is slower to scan than two
 * digits are to type, and it makes 09:07 impossible. Where only a few times
 * are allowed, that is a Select, not a TimeField.
 */
export function TimeField({
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
  granularity = 'minute',
  hourCycle,
  name,
  className,
  wrapperClassName,
  id,
}: TimeFieldProps) {
  const withSeconds = granularity === 'second';

  // As DatePicker: `undefined` stays uncontrolled, `null` is controlled-and-empty.
  // Checked before any hook, so a malformed value throws its own message.
  toTime(value ?? null, 'value');
  toTime(minValue, 'minValue');
  toTime(maxValue, 'maxValue');

  /*
   * One `Time` object per string, not per render. A controlled TimeField —
   * the demo wizard holds its value in state — built a fresh `Time` every
   * render and rendered forever (React error 301); keyed on the string, it
   * does not. DatePicker rebuilds its CalendarDate the same way and does not
   * loop, so the difference is inside react-stately's time-field state. Not
   * traced further; the storybook story `ControlledDoesNotLoop` holds the line.
   */
  const timeValue = useMemo(
    () => (value === undefined ? undefined : toTime(value, 'value')),
    [value],
  );
  const min = useMemo(() => toTime(minValue, 'minValue'), [minValue]);
  const max = useMemo(() => toTime(maxValue, 'maxValue'), [maxValue]);
  const [initial] = useState(() => toTime(defaultValue, 'defaultValue'));

  const ariaProps = {
    id,
    label,
    'aria-label': ariaLabel,
    value: timeValue,
    defaultValue: initial,
    minValue: min,
    maxValue: max,
    granularity,
    hourCycle,
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    onChange: onChange
      ? (time: Time | null) =>
          onChange(time ? toIsoTime(time, withSeconds) : null)
      : undefined,
  };

  const { locale } = useLocale();
  const state = useTimeFieldState({ ...ariaProps, locale });
  const ref = useRef<HTMLDivElement>(null);
  const { labelProps, fieldProps, descriptionProps, errorMessageProps } =
    useTimeField(ariaProps, state, ref);

  /*
   * Invalid is the prop OR the field's own bounds check. Left to the prop
   * alone, 18:00 against a 17:00 maximum marked the segments aria-invalid and
   * left the box looking valid. With no `errorMessage`, React Aria's own
   * localized message says what the bound is.
   */
  const { isInvalid: outOfBounds, validationErrors } = state.displayValidation;
  const invalid = !!isInvalid || outOfBounds;
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
        // A <span>, as in DatePicker: the segments are spinbuttons, so a
        // <label htmlFor> has no one control to point at.
        <span {...labelProps} className="ion-field__label">
          {label}
        </span>
      )}

      <div
        className={[
          'ion-input',
          'ion-time-field',
          size !== 'md' ? `ion-input--${size}` : '',
          invalid ? 'ion-input--invalid' : '',
          isDisabled ? 'ion-input--disabled' : '',
          isReadOnly ? 'ion-input--readonly' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-invalid={invalid || undefined}
        data-disabled={isDisabled || undefined}
      >
        <span className="ion-input__icon-start" aria-hidden="true">
          <ClockIcon />
        </span>
        <div {...fieldProps} ref={ref} className="ion-date-field">
          {state.segments.map((segment, i) => (
            <Segment key={i} segment={segment} state={state} />
          ))}
        </div>
        {name && (
          <input
            type="hidden"
            name={name}
            value={state.value ? toIsoTime(state.timeValue, withSeconds) : ''}
          />
        )}
      </div>

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

TimeField.displayName = 'TimeField';
