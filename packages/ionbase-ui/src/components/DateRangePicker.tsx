'use client';

import React, { useMemo, useRef } from 'react';
import { useDateRangePicker, useButton } from 'react-aria';
import { useDateRangePickerState } from 'react-stately';
import { DateField } from './DateField.js';
import { RangeCalendar } from './Calendar.js';
import { CalendarPopover } from './CalendarPopover.js';
import { toCalendarDate, toIso, wrapUnavailable } from './iso-date.js';
import type { IsoDate } from './iso-date.js';
import type { DateValue } from '@internationalized/date';

export type DateRangePickerSize = 'sm' | 'md' | 'lg';

/** A closed interval of calendar dates. `end` is included in the range. */
export interface DateRange {
  /** `YYYY-MM-DD`. */
  start: IsoDate;
  /** `YYYY-MM-DD`, inclusive. */
  end: IsoDate;
}

/**
 * A shortcut in the rail beside the calendar — "Last 7 days", "Year to date".
 */
export interface DateRangePreset {
  /** What the row reads. Also its accessible name. */
  label: string;
  /**
   * The range it selects.
   *
   * A FUNCTION for anything relative to today, which is most of them. A literal
   * object is evaluated once, when the caller's module is first imported, so
   * "Last 7 days" built as a literal is seven days before whenever the tab was
   * opened — correct on load and increasingly wrong for a session left open
   * overnight. The function is re-run every time the calendar opens.
   */
  value: DateRange | (() => DateRange);
}

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

export interface DateRangePickerProps {
  /** Field label. Required for a usable control — see `a11y.requires`. */
  label?: React.ReactNode;
  /** Helper text below the field. */
  description?: React.ReactNode;
  /** Replaces the helper text when `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  /** Matches Input's `Size` variant: Small, Medium, Large. */
  size?: DateRangePickerSize;
  /**
   * The selected range, both ends as `YYYY-MM-DD`. `null` means no range.
   * A half-open range is not representable on purpose — see `antiPatterns`.
   */
  value?: DateRange | null;
  /** The initial range, for an uncontrolled picker. */
  defaultValue?: DateRange;
  /** Fires with both ends, or `null` when the range is cleared. */
  onChange?: (value: DateRange | null) => void;
  /** Earliest selectable date, `YYYY-MM-DD`. */
  minValue?: IsoDate;
  /** Latest selectable date, `YYYY-MM-DD`. */
  maxValue?: IsoDate;
  /**
   * Individual dates the calendar refuses. Receives `YYYY-MM-DD`.
   *
   * A range may not be dragged ACROSS one of these — react-aria stops the
   * selection at the first unavailable day, which is what makes "book a room
   * for these nights" correct rather than merely styled.
   */
  isDateUnavailable?: (date: IsoDate) => boolean;
  /** Shortcut rows beside the calendar. Omitted, no rail is rendered. */
  presets?: readonly DateRangePreset[];
  /**
   * How many months the calendar shows at once. Two by default: a range that
   * crosses a month boundary is the common case, and a one-month calendar
   * makes the user page back and forth to see both ends of their own selection.
   */
  visibleMonths?: 1 | 2 | 3;
  /** Show a Clear button under the calendar. Defaults to `true`. */
  isClearable?: boolean;
  /** Posts `<name>-start` and `<name>-end` for an uncontrolled form. */
  name?: string;
  /** Accessible label for the button that opens the calendar. */
  calendarLabel?: string;
  clearLabel?: string;
  presetsLabel?: string;
  className?: string;
  wrapperClassName?: string;
  id?: string;
}

/** Resolves a preset's `value`, which may be a literal or a function. */
const resolvePreset = (p: DateRangePreset): DateRange =>
  typeof p.value === 'function' ? p.value() : p.value;

/**
 * DateRangePicker — two segmented date fields with one calendar between them.
 *
 * NOT TWO `DatePicker`s SIDE BY SIDE, and the difference is the whole reason
 * this exists. Two independent pickers cannot stop the end date being before
 * the start, cannot show the days between them as a band, and give the user two
 * calendars to reconcile by memory. `useDateRangePicker` owns both ends: the
 * second click completes the range in whichever order the two dates fall, the
 * band follows the pointer while it is being dragged out, and a range cannot be
 * made to run backwards.
 *
 * THE VALUE COMMITS LIVE. THERE IS NO APPLY BUTTON.
 *
 * `onChange` fires the moment the second end lands, and the calendar closes.
 * The reference designs this was drawn from put Clear and Apply under the grid,
 * which is a draft model: the popover holds a pending range and only Apply
 * promotes it. That was considered and rejected. Escape and an outside click
 * would then silently discard a selection the user watched themselves make —
 * and there is no way to tell those two gestures apart from "I am done". A
 * button labelled Apply beside a value that already applied is worse still.
 *
 * Clear stays, because clearing is a real action with no other affordance.
 *
 * BOTH ENDS OR NEITHER
 *
 * `value` has no half-open form. A range with a start and no end is a state the
 * calendar passes THROUGH between the two clicks; it is never a value the
 * caller is handed, because "everything after March" and "March to today" are
 * different questions and a `null` end cannot say which one was meant. A caller
 * who wants an open end passes a sentinel of their own choosing as `maxValue`.
 */
export function DateRangePicker({
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
  presets,
  visibleMonths = 2,
  isClearable = true,
  name,
  calendarLabel = 'Open calendar',
  clearLabel = 'Clear',
  presetsLabel = 'Date range shortcuts',
  className,
  wrapperClassName,
  id,
}: DateRangePickerProps) {
  /*
   * The ISO boundary. `undefined` has to stay `undefined` — react-aria reads it
   * as "uncontrolled" where `null` means "controlled and empty", so collapsing
   * the two makes an uncontrolled picker refuse to hold its own value.
   */
  const toRange = (r: DateRange | null | undefined, prop: string) =>
    r == null
      ? null
      : {
          start: toCalendarDate(r.start, `${prop}.start`)!,
          end: toCalendarDate(r.end, `${prop}.end`)!,
        };

  const ariaProps = {
    label: typeof label === 'string' ? label : undefined,
    value: value === undefined ? undefined : toRange(value, 'value'),
    defaultValue: toRange(defaultValue, 'defaultValue') ?? undefined,
    minValue: toCalendarDate(minValue, 'minValue') ?? undefined,
    maxValue: toCalendarDate(maxValue, 'maxValue') ?? undefined,
    isDateUnavailable: wrapUnavailable(isDateUnavailable),
    isDisabled,
    isReadOnly,
    isRequired,
    isInvalid,
    /*
     * Same reason as DatePicker: left unset, react-aria infers granularity from
     * the value, and an empty picker infers 'minute' and grows time segments
     * that vanish the moment a date arrives.
     */
    granularity: 'day' as const,
    onChange: onChange
      ? (r: { start: DateValue; end: DateValue } | null) =>
          onChange(r ? { start: toIso(r.start), end: toIso(r.end) } : null)
      : undefined,
  };

  const state = useDateRangePickerState(ariaProps);

  const groupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    groupProps,
    labelProps,
    startFieldProps,
    endFieldProps,
    buttonProps: triggerProps,
    dialogProps,
    calendarProps,
    descriptionProps,
    errorMessageProps,
  } = useDateRangePicker({ ...ariaProps, id }, state, groupRef);

  const { buttonProps } = useButton(triggerProps, buttonRef);

  /*
   * Resolved once per open, not once per render.
   *
   * `state.isOpen` is the dependency on purpose. A relative preset is a
   * function of today, so re-resolving it on every render would be correct and
   * wasteful; resolving it once when the module loads would be cheap and wrong
   * by morning. Re-resolving each time the calendar opens is the only cadence
   * at which "Last 7 days" is both stable while the user reads it and accurate
   * when they come back to it.
   */
  const resolvedPresets = useMemo(
    () => (presets ?? []).map((p) => ({ label: p.label, ...resolvePreset(p) })),
    // `state.isOpen` is in here as a CADENCE, not as a value this reads —
    // see above. An exhaustive-deps rule would call it extraneous and be
    // wrong: dropping it is what makes a relative preset go stale.
    [presets, state.isOpen],
  );

  const selectedIso = state.value?.start &&
    state.value?.end && {
      start: toIso(state.value.start),
      end: toIso(state.value.end),
    };

  const helper = isInvalid && errorMessage ? errorMessage : description;

  const rail = resolvedPresets.length ? (
    <div className="ion-range-presets" role="group" aria-label={presetsLabel}>
      {resolvedPresets.map((p) => {
        const isSelected =
          selectedIso?.start === p.start && selectedIso?.end === p.end;
        return (
          <button
            key={p.label}
            type="button"
            className="ion-range-presets__item"
            /*
             * `aria-pressed`, not `aria-current` and not a radio. These are
             * toggleable shortcuts that report whether the CURRENT value
             * matches them — which is a pressed state. A radio group would
             * claim the presets are the only ways to choose a range, and the
             * grid beside them is the counter-example.
             */
            aria-pressed={isSelected}
            data-selected={isSelected || undefined}
            onClick={() => {
              state.setValue({
                start: toCalendarDate(p.start, `preset "${p.label}"`)!,
                end: toCalendarDate(p.end, `preset "${p.label}"`)!,
              });
              /*
               * Closed explicitly. A complete range from the GRID closes the
               * calendar on its own, and a preset produces the same complete
               * range — leaving it open after a shortcut was pressed would make
               * the two paths behave differently for no reason the user could
               * see.
               */
              state.setOpen(false);
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  ) : null;

  const footer =
    isClearable && state.value ? (
      <div className="ion-range-footer">
        <button
          type="button"
          className="ion-range-footer__clear"
          onClick={() => {
            state.setValue(null);
            /*
             * Deliberately left OPEN. Clearing is nearly always the first half
             * of choosing something else; closing the calendar would make the
             * user reopen it to do the thing they cleared it for.
             */
          }}
        >
          {clearLabel}
        </button>
      </div>
    ) : null;

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
        // A <span>, not a <label> — the group holds two fields of spinbuttons
        // rather than one form control, so `htmlFor` has nothing to point at.
        <span {...labelProps} className="ion-field__label">
          {label}
        </span>
      )}

      <div
        {...groupProps}
        ref={groupRef}
        className={[
          'ion-input',
          'ion-date-range-picker',
          size !== 'md' ? `ion-input--${size}` : '',
          isInvalid ? 'ion-input--invalid' : '',
          isDisabled ? 'ion-input--disabled' : '',
          isReadOnly ? 'ion-input--readonly' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-open={state.isOpen || undefined}
        data-invalid={isInvalid || undefined}
        data-disabled={isDisabled || undefined}
      >
        <DateField {...startFieldProps} />
        {/*
          The dash between the two fields. `aria-hidden`, because each field
          already announces its own name ("Start Date", "End Date") from
          `useDateRangePicker` — a readable dash between them would be announced
          as "to" or as punctuation depending on the reader's verbosity setting,
          and neither adds anything to a field that has just said what it is.
        */}
        <span className="ion-date-range-picker__dash" aria-hidden="true">
          –
        </span>
        <DateField {...endFieldProps} />

        {name && (
          <>
            <input
              type="hidden"
              name={`${name}-start`}
              value={state.value?.start ? toIso(state.value.start) : ''}
            />
            <input
              type="hidden"
              name={`${name}-end`}
              value={state.value?.end ? toIso(state.value.end) : ''}
            />
          </>
        )}

        <button
          {...buttonProps}
          ref={buttonRef}
          type="button"
          aria-labelledby={undefined}
          aria-label={calendarLabel}
          className="ion-date-range-picker__button"
        >
          <CalendarIcon />
        </button>
      </div>

      {state.isOpen && !isDisabled && !isReadOnly && (
        <CalendarPopover
          state={state}
          triggerRef={groupRef}
          dialogProps={dialogProps}
          className="ion-calendar-popover--range"
        >
          <RangeCalendar
            {...calendarProps}
            visibleMonths={visibleMonths}
            aside={rail}
            footer={footer}
          />
        </CalendarPopover>
      )}

      {helper && (
        <span
          {...(isInvalid && errorMessage
            ? errorMessageProps
            : descriptionProps)}
          className="ion-field__helper"
        >
          {helper}
        </span>
      )}
    </div>
  );
}

DateRangePicker.displayName = 'DateRangePicker';
