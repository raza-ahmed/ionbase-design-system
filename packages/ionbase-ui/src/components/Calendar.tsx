'use client';

import React, { useId, useRef } from 'react';
import {
  useButton,
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useLocale,
  useRangeCalendar,
} from 'react-aria';
import { useCalendarState, useRangeCalendarState } from 'react-stately';
import {
  createCalendar,
  endOfMonth,
  getWeeksInMonth,
  isSameDay,
  today,
} from '@internationalized/date';
import type {
  AriaButtonProps,
  AriaCalendarProps,
  AriaRangeCalendarProps,
} from 'react-aria';
import type { CalendarState, RangeCalendarState } from 'react-stately';
import type { CalendarDate, DateValue } from '@internationalized/date';
import { toCalendarDate, toIso, wrapUnavailable } from './iso-date.js';
import type { IsoDate } from './iso-date.js';

/*
 * The calendar grid — the overlay half of both pickers, and `Calendar`, the
 * same grid in the page.
 *
 * `SingleCalendar` and `RangeCalendar` stay internal: they are the pickers'
 * popover content and have no label, no surface and no helper text of their
 * own. `Calendar` is the inline one, with the contract the pickers' popover
 * never needed: it owns page space, so it draws its own surface; it has no
 * trigger, so it takes a `label` that names it with the month; and nothing
 * closes when a day is picked, so the selected day IS the answer, announced
 * by react-aria as it changes.
 *
 * ONE FILE, TWO STATES, AND THE SEAM BETWEEN THEM
 *
 * `CalendarState` and `RangeCalendarState` are different types with almost the
 * same surface. Everything below the header — the grid, the cells, the week
 * rows — is written against the union and branches in exactly one place, on
 * `'highlightedRange' in state`, which is the only thing a cell genuinely has
 * to know. The alternative, a second copy of the cell for ranges, is where the
 * two would drift: a focus ring fixed in one and not the other is invisible
 * until someone opens the other picker.
 */

/** Both states, wherever the difference does not matter. */
type AnyCalendarState = CalendarState | RangeCalendarState;

const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m15 18-6-6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m9 18 6-6-6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* -------------------------------------------------------------------- nav */

/**
 * A month-step arrow.
 *
 * `useButton` rather than a bare `<button>` because the props react-aria hands
 * back carry the disabled state for the boundary case — a `minValue` in the
 * current month means there is no previous month to step to, and the arrow has
 * to say so rather than silently doing nothing.
 */
function NavButton({
  buttonProps,
  children,
}: {
  buttonProps: AriaButtonProps<'button'>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps: props } = useButton(buttonProps, ref);
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      className="ion-calendar__nav-button"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------- cell */

function Cell({
  state,
  date,
  currentMonth,
}: {
  state: AnyCalendarState;
  date: CalendarDate;
  currentMonth: CalendarDate;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    cellProps,
    buttonProps,
    isSelected,
    isOutsideVisibleRange,
    isDisabled,
    isUnavailable,
    formattedDate,
  } = useCalendarCell({ date }, state, ref);

  /*
   * A day that belongs to the neighbouring month.
   *
   * `isOutsideVisibleRange` is NOT the same question and using it here is a
   * bug worth naming: it is true for a date outside the whole visible RANGE,
   * which for the two-month range calendar spans both grids. December's cells
   * are inside that range and still do not belong to November's table, so a
   * cell keyed on it would render December's first week into November's grid
   * as though those days were November's.
   */
  const isOutsideMonth = date.month !== currentMonth.month;

  /*
   * The chosen day of a disabled single calendar. react-aria selects no day
   * in a disabled calendar, so the inline Calendar lost its value the moment
   * it was disabled — mid-save, say — where a disabled field keeps showing
   * its own. Marked here, and drawn as disabled. The popover never reaches
   * this: a disabled picker does not open.
   */
  const isHeld =
    !isSelected &&
    state.isDisabled &&
    !('highlightedRange' in state) &&
    state.value != null &&
    isSameDay(date, state.value);
  const isMarked = isSelected || isHeld;

  /*
   * The one place the two states differ.
   *
   * `highlightedRange` is the committed range OR the one being dragged out
   * right now, which is what makes the band follow the pointer between the
   * first and second click instead of appearing only once both ends exist.
   */
  const range = 'highlightedRange' in state ? state.highlightedRange : null;
  const isRangeStart = range ? isSameDay(date, range.start) : false;
  const isRangeEnd = range ? isSameDay(date, range.end) : false;
  /*
   * Inside the band but not an endpoint. Rendered as a flat tint with square
   * sides so consecutive days join into one continuous bar; the endpoints keep
   * the solid fill and the rounded outer edge.
   */
  const isInRange =
    Boolean(range) && isSelected && !isRangeStart && !isRangeEnd;

  /*
   * Today is marked even when it is selected — the dot moves to the on-colour
   * token rather than being dropped. A "today" cue that disappears the moment
   * today is picked vanishes exactly when the user is looking for confirmation
   * that they picked it.
   *
   * The mark is VISUAL ONLY, and deliberately so. `useCalendarCell` already
   * puts "today" into the cell's accessible name in the reader's own language;
   * a second announcement from a hidden span would say it twice.
   */
  const isToday = isSameDay(date, today(state.timeZone));

  return (
    <td {...cellProps} className="ion-calendar__cell">
      <div
        {...buttonProps}
        ref={ref}
        hidden={isOutsideMonth || undefined}
        className={[
          'ion-calendar__day',
          isMarked ? 'ion-calendar__day--selected' : '',
          isInRange ? 'ion-calendar__day--in-range' : '',
          isRangeStart ? 'ion-calendar__day--range-start' : '',
          isRangeEnd ? 'ion-calendar__day--range-end' : '',
          isDisabled ? 'ion-calendar__day--disabled' : '',
          isUnavailable ? 'ion-calendar__day--unavailable' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-selected={isMarked || undefined}
        data-in-range={isInRange || undefined}
        data-range-start={isRangeStart || undefined}
        data-range-end={isRangeEnd || undefined}
        data-disabled={isDisabled || undefined}
        data-unavailable={isUnavailable || undefined}
        data-outside-range={isOutsideVisibleRange || undefined}
        data-today={isToday || undefined}
      >
        {formattedDate}
      </div>
    </td>
  );
}

/* ------------------------------------------------------------------- grid */

/**
 * One month's table.
 *
 * `offset` shifts it forward, which is how the range picker shows two months
 * from one state: both grids read the same `state.visibleRange.start`, and the
 * second adds a month to it. Stepping the state forward moves both together,
 * which is the behaviour a two-month picker needs — a next-month arrow that
 * moved only the right-hand grid would let the two overlap.
 */
function MonthGrid({
  state,
  offset = 0,
}: {
  state: AnyCalendarState;
  offset?: number;
}) {
  const { locale } = useLocale();
  const startDate = state.visibleRange.start.add({ months: offset });
  const endDate = endOfMonth(startDate);

  const { gridProps, headerProps, weekDays } = useCalendarGrid(
    { startDate, endDate },
    state,
  );

  /*
   * How many week rows this month needs — 4 through 6, depending on which
   * weekday it starts on. Rendering a fixed 6 would pad February with a blank
   * row, and rendering `Math.ceil(days / 7)` gets the common case right and the
   * month that spills over a sixth week wrong.
   */
  const weeksInMonth = getWeeksInMonth(startDate, locale);

  /*
   * The month name above each grid, from the grid's own start date rather than
   * from `useCalendar`'s `title`. `title` describes the whole visible range —
   * "November – December 2024" for the two-month calendar — which is right for
   * the header and wrong above one of the two grids.
   */
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    calendar: startDate.calendar.identifier,
    timeZone: state.timeZone,
  }).format(startDate.toDate(state.timeZone));

  return (
    <div className="ion-calendar__month">
      {/*
        aria-hidden, and the table is labelled by `gridProps` instead. Left
        announceable, a screen reader reads the month name and then the grid's
        own label, which is the same month name — every single time the grid is
        entered.
      */}
      <div className="ion-calendar__month-label" aria-hidden="true">
        {monthLabel}
      </div>
      <table {...gridProps} className="ion-calendar__grid">
        <thead {...headerProps}>
          <tr>
            {/*
              The narrow weekday name — "S", "M", "T" — which is react-aria's
              default and is deliberately kept rather than widened to "Su"/"Mo"
              as both reference designs draw it. "Su" is not a form
              `Intl.DateTimeFormat` produces in any locale: reaching it means
              slicing two characters off the short name, which is wrong the
              moment the locale is not English and silently wrong for a script
              with no two-character convention.

              Losing the S/S and T/T distinction costs nothing here, because the
              column header is not what carries the day to a screen reader.
              `useCalendarCell` puts the full date — "Wednesday, April 12, 2026"
              — into every cell's accessible name, in the reader's own language.
              The header row is a visual index for a grid that is already
              ordered, and the position in the row is what disambiguates it.
            */}
            {weekDays.map((day, i) => (
              // The index IS the identity here: the weekday row is a fixed
              // seven columns in a fixed order, and nothing reorders it.
              <th key={i} className="ion-calendar__weekday">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...new Array(weeksInMonth).keys()].map((weekIndex) => (
            <tr key={weekIndex}>
              {state.getDatesInWeek(weekIndex, startDate).map((date, i) =>
                date ? (
                  <Cell
                    key={date.toString()}
                    state={state}
                    date={date}
                    currentMonth={startDate}
                  />
                ) : (
                  // A padding cell before the 1st or after the last —
                  // it has no date to key on, and its position is its identity.
                  <td key={i} />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------------------------------------- shells */

function CalendarShell({
  calendarProps,
  prevButtonProps,
  nextButtonProps,
  title,
  state,
  visibleMonths,
  aside,
  footer,
  refProp,
  className,
}: {
  calendarProps: React.HTMLAttributes<HTMLElement>;
  prevButtonProps: AriaButtonProps<'button'>;
  nextButtonProps: AriaButtonProps<'button'>;
  title: string;
  state: AnyCalendarState;
  visibleMonths: number;
  /** The preset rail, beside the grids. */
  aside?: React.ReactNode;
  /** An action row under the grids. */
  footer?: React.ReactNode;
  refProp?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  return (
    <div
      {...calendarProps}
      ref={refProp as React.RefObject<HTMLDivElement>}
      className={['ion-calendar', className || ''].filter(Boolean).join(' ')}
      data-months={visibleMonths}
    >
      {aside}
      <div className="ion-calendar__body">
        <div className="ion-calendar__header">
          <NavButton buttonProps={prevButtonProps}>
            <ChevronLeft />
          </NavButton>
          {/*
            The range title, visually hidden. The month labels above each grid
            carry the same information for the eye; this is what `calendarProps`
            points `aria-label` at, and removing it would leave the calendar
            announcing as an unnamed group.
          */}
          <h2 className="ion-visually-hidden">{title}</h2>
          <div className="ion-calendar__title" aria-hidden="true">
            {title}
          </div>
          <NavButton buttonProps={nextButtonProps}>
            <ChevronRight />
          </NavButton>
        </div>
        <div className="ion-calendar__months">
          {[...new Array(visibleMonths).keys()].map((offset) => (
            <MonthGrid key={offset} state={state} offset={offset} />
          ))}
        </div>
        {footer}
      </div>
    </div>
  );
}

/** The single-date calendar, for `DatePicker`. */
export function SingleCalendar(props: AriaCalendarProps<DateValue>) {
  const { locale } = useLocale();
  const state = useCalendarState({ ...props, locale, createCalendar });
  const { calendarProps, prevButtonProps, nextButtonProps, title } =
    useCalendar(props, state);

  return (
    <CalendarShell
      calendarProps={calendarProps}
      prevButtonProps={prevButtonProps}
      nextButtonProps={nextButtonProps}
      title={title}
      state={state}
      visibleMonths={1}
    />
  );
}

/**
 * The range calendar, for `DateRangePicker`.
 *
 * `useRangeCalendar` takes a ref and the single-date `useCalendar` does not,
 * which is not an inconsistency: the range calendar attaches a pointer-up
 * listener to it so that releasing the mouse OUTSIDE the calendar still ends
 * the drag. Without the ref the range would keep following the pointer after
 * the button came up somewhere else on the page.
 */
export function RangeCalendar({
  visibleMonths = 2,
  aside,
  footer,
  ...props
}: AriaRangeCalendarProps<DateValue> & {
  visibleMonths?: number;
  aside?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { locale } = useLocale();
  const state = useRangeCalendarState({
    ...props,
    locale,
    createCalendar,
    visibleDuration: { months: visibleMonths },
  });

  const ref = useRef<HTMLDivElement>(null);
  const { calendarProps, prevButtonProps, nextButtonProps, title } =
    useRangeCalendar(props, state, ref);

  return (
    <CalendarShell
      calendarProps={calendarProps}
      prevButtonProps={prevButtonProps}
      nextButtonProps={nextButtonProps}
      title={title}
      state={state}
      visibleMonths={visibleMonths}
      aside={aside}
      footer={footer}
      refProp={ref}
    />
  );
}

export interface CalendarProps {
  /**
   * Names the calendar. It has no field and no trigger, so this is the only
   * thing that says what the day is for — "Resume on", "Deliver on".
   */
  label: React.ReactNode;
  /** Helper text under the month. */
  description?: React.ReactNode;
  /** Replaces the helper text while invalid — `isInvalid`, or its own bounds. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  /** Shows the day and lets it be read and moved through, not changed. */
  isReadOnly?: boolean;
  /** The selected day as `YYYY-MM-DD`; `null` is none yet. */
  value?: IsoDate | null;
  /** The initial day as `YYYY-MM-DD`, for an uncontrolled calendar. */
  defaultValue?: IsoDate;
  /**
   * Fires with `YYYY-MM-DD`. Never with `null`: a day in a grid is changed
   * by picking another, not cleared.
   */
  onChange?: (value: IsoDate) => void;
  /** Earliest selectable day, `YYYY-MM-DD`. Earlier months cannot be reached. */
  minValue?: IsoDate;
  /** Latest selectable day, `YYYY-MM-DD`. */
  maxValue?: IsoDate;
  /** Single days refused inside the bounds — weekends, holidays, booked days. */
  isDateUnavailable?: (date: IsoDate) => boolean;
  /**
   * The month to open on, and the day focus lands on, while nothing is
   * selected. Defaults to today — or `minValue`, when today is before it.
   */
  defaultFocusedValue?: IsoDate;
  /** Posts the value under this name, for an uncontrolled form. */
  name?: string;
  id?: string;
  className?: string;
}

/**
 * Calendar — one month in the page, for a day chosen by looking at the month.
 *
 * DATEPICKER FIRST
 *
 * A date someone knows — a birthday, an invoice date — is typed faster than
 * it is found, and a field takes one row where this takes a month. This is
 * for a day that is chosen by where it falls: a day to resume on, a delivery
 * day, and for a place where a popover would be a second layer — a Modal, a
 * SidePanel.
 *
 * NAMED WITH THE MONTH
 *
 * `label` is the calendar's name, joined by react-aria to the visible month —
 * "Resume on October 2026" — so moving to another month says where you are.
 * Every day's name is its full date, in the reader's language; today and the
 * selected day are said as such.
 */
export function Calendar({
  label,
  description,
  errorMessage,
  isInvalid,
  isDisabled,
  isReadOnly,
  value,
  defaultValue,
  onChange,
  minValue,
  maxValue,
  isDateUnavailable,
  defaultFocusedValue,
  name,
  id,
  className,
}: CalendarProps) {
  const { locale } = useLocale();
  const labelId = useId();
  const helperId = useId();

  const min = toCalendarDate(minValue, 'minValue') ?? undefined;
  const ariaProps: AriaCalendarProps<DateValue> = {
    // `undefined` stays uncontrolled; `null` is controlled and empty.
    value: value === undefined ? undefined : toCalendarDate(value, 'value'),
    defaultValue: toCalendarDate(defaultValue, 'defaultValue') ?? undefined,
    minValue: min,
    maxValue: toCalendarDate(maxValue, 'maxValue') ?? undefined,
    isDateUnavailable: wrapUnavailable(isDateUnavailable),
    defaultFocusedValue:
      toCalendarDate(defaultFocusedValue, 'defaultFocusedValue') ?? undefined,
    isDisabled,
    isReadOnly,
    isInvalid,
    'aria-labelledby': labelId,
    onChange: onChange ? (date: DateValue) => onChange(toIso(date)) : undefined,
  };

  const state = useCalendarState({ ...ariaProps, locale, createCalendar });
  const { calendarProps, prevButtonProps, nextButtonProps, title } =
    useCalendar(ariaProps, state);

  /*
   * Invalid is the prop OR a value the calendar itself refuses — before
   * `minValue`, after `maxValue`, or unavailable — DatePicker's rule.
   */
  const invalid = !!isInvalid || state.isValueInvalid;
  const helper = invalid && errorMessage ? errorMessage : description;

  return (
    <div
      className={[
        'ion-field',
        'ion-calendar-field',
        invalid ? 'ion-field--error' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      id={id}
      data-invalid={invalid || undefined}
      data-disabled={isDisabled || undefined}
    >
      {/* A <span>: a grid is not a form control `htmlFor` can point at. */}
      <span id={labelId} className="ion-field__label">
        {label}
      </span>
      <div className="ion-calendar-field__frame">
        <CalendarShell
          calendarProps={{
            ...calendarProps,
            // The label, then the month: react-aria lists its own month
            // first, which reads "October 2026 Resume on".
            'aria-labelledby': `${labelId} ${calendarProps.id}`,
            'aria-describedby': helper ? helperId : undefined,
          }}
          prevButtonProps={prevButtonProps}
          nextButtonProps={nextButtonProps}
          title={title}
          state={state}
          visibleMonths={1}
        />
      </div>
      {name && (
        <input
          type="hidden"
          name={name}
          value={state.value ? toIso(state.value) : ''}
        />
      )}
      {helper && (
        <span id={helperId} className="ion-field__helper">
          {helper}
        </span>
      )}
    </div>
  );
}

Calendar.displayName = 'Calendar';
