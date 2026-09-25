'use client';

import React, { useRef } from 'react';
import { useDateField, useDateSegment, useLocale } from 'react-aria';
import { useDateFieldState } from 'react-stately';
import { createCalendar } from '@internationalized/date';
import type { AriaDatePickerProps, DateValue } from 'react-aria';
import type { DateFieldState, DateSegment } from 'react-stately';

/*
 * The segmented date field — the text half of both pickers.
 *
 * INTERNAL, AND STAYING INTERNAL. It is not exported from `src/index.ts`, has
 * no `meta/*.json` and no Figma component. A date field with no calendar beside
 * it is a control this system has nothing to say about yet: it would need its
 * own contract for what happens when the value is unparseable, its own
 * placeholder story, and its own answer to "why not `<input type=date>`". None
 * of that is answered by being a part of DatePicker, so exporting it would ship
 * a surface with no judgement attached — which `verify-meta` is right to treat
 * as an error rather than a warning.
 *
 * WHY THIS IS NOT ONE `<input>`
 *
 * A single text input means parsing free text, and parsing free text means
 * guessing whether `04/12/2026` is April 12th or the 4th of December. It is
 * both, depending on who is reading, and no amount of placeholder text fixes
 * that — the American and British readers each believe the placeholder confirms
 * their own reading.
 *
 * Segments remove the question. `useDateFieldState` asks `Intl.DateTimeFormat`
 * for the reader's own field ORDER, so a US reader gets MM/DD/YYYY and a German
 * reader gets DD.MM.YYYY from the same component and the same value, with the
 * literal separators between them coming from the locale too. Each segment is
 * its own spinbutton: arrow keys increment it, typing digits fills it, and a
 * value that would not exist cannot be typed.
 *
 * THE SEGMENTS ARE NOT INPUTS, AND THAT IS THE ARIA PATTERN
 *
 * They are `role="spinbutton"` divs with `contentEditable` off, which is what
 * `useDateSegment` produces. The role is what makes each one announce its own
 * name, value and bounds — "month, 4, minimum 1, maximum 12" — where three text
 * inputs would announce three unrelated numbers.
 *
 * EACH EDITABLE SEGMENT IS ITS OWN TAB STOP. This comment used to claim the
 * opposite — that the group was one stop and arrow keys moved inside it — and
 * a story caught it: `useDateSegment` sets `tabIndex: 0` on every segment that
 * is not disabled, so Tab walks month, day, year and Shift+Tab walks back.
 *
 * That is the right behaviour, not a wart to work around. It is what Chrome's
 * own `<input type="date">` does, so it is the convention a user already has;
 * arrow keys move between segments as well, so nobody has to learn a second
 * one. The separators are NOT stops — they have no tabIndex at all — so the
 * cost is one stop per editable part and nothing more.
 *
 * A roving tabindex would buy back two tabs per field and cost the ability to
 * reach the year directly, which is the segment a user most often wants to fix
 * on its own. Do not add one.
 */

/*
 * The props are `useDatePicker`'s own `fieldProps` / `useDateRangePicker`'s
 * `startFieldProps` and `endFieldProps`, spread straight in. They are NOT DOM
 * attributes — they carry the value, the bounds, the granularity and the
 * aria wiring the picker resolved — which is why the whole object goes to
 * `useDateFieldState` rather than onto the element.
 */
interface DateFieldProps extends AriaDatePickerProps<DateValue> {
  className?: string;
}

/**
 * One segment — a month, a day, a year, or a literal separator.
 *
 * The literal is rendered by the same component rather than being filtered out
 * before the map. `useDateSegment` returns the separator's own props, including
 * the `aria-hidden` that keeps `/` and `.` out of the announcement, and
 * re-deriving that here would mean re-deriving it wrongly the first time a
 * locale used a separator nobody tested.
 */
export function Segment({
  segment,
  state,
}: {
  segment: DateSegment;
  state: DateFieldState;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { segmentProps } = useDateSegment(segment, state, ref);

  return (
    <div
      {...segmentProps}
      ref={ref}
      className={[
        'ion-date-field__segment',
        segment.isPlaceholder ? 'ion-date-field__segment--placeholder' : '',
        segment.type === 'literal' ? 'ion-date-field__segment--literal' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-placeholder={segment.isPlaceholder || undefined}
      style={{
        /*
         * Reserves the width of the widest value this segment can hold, so the
         * field does not jitter as it is filled.
         *
         * `maxValue` is the segment's own maximum — 31 for a day, 12 for a
         * month — not a guess at digit count, which is what makes it correct
         * for a locale whose year segment is two digits or whose month segment
         * is a name. A literal has no maxValue and needs no reservation.
         *
         * `ch` rather than `em`: the digits are what is being measured, and in
         * every sans-serif worth shipping the digits are tabular-width.
         */
        minWidth:
          segment.maxValue != null
            ? `${String(segment.maxValue).length}ch`
            : undefined,
      }}
    >
      {segment.text}
    </div>
  );
}

/**
 * The field itself. Rendered inside the picker's `.ion-input` box, which owns
 * the border, the background and the states — exactly as Combobox reuses it.
 */
export function DateField({ className, ...props }: DateFieldProps) {
  /*
   * `useLocale` reads react-aria's I18nProvider, falling back to the browser's
   * own locale when there is none. That fallback is why a consumer who never
   * mounts a provider still gets their own date order rather than en-US.
   */
  const { locale } = useLocale();

  const state = useDateFieldState({
    ...props,
    locale,
    /*
     * `createCalendar` is passed rather than imported by react-stately on
     * purpose: it is the whole calendar-systems bundle, and a library that
     * imported it directly would put every calendar in every consumer's bundle
     * whether or not they render one. Handing it in is the opt-in.
     */
    createCalendar,
  });

  const ref = useRef<HTMLDivElement>(null);
  const { fieldProps } = useDateField(props, state, ref);

  return (
    <div
      {...fieldProps}
      ref={ref}
      className={['ion-date-field', className].filter(Boolean).join(' ')}
    >
      {state.segments.map((segment, i) => (
        // Keyed by position, which is the only stable identity a segment
        // has: the list is rebuilt whole when the locale changes, and two
        // segments of the same type never coexist.
        <Segment key={i} segment={segment} state={state} />
      ))}
    </div>
  );
}

DateField.displayName = 'DateField';
