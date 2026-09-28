/*
 * The date-and-time boundary — `iso-date.ts` and `iso-time.ts` joined, for the
 * same reasons as each.
 *
 * The public value is a wall-clock reading as `YYYY-MM-DDTHH:MM` (or
 * `YYYY-MM-DDTHH:MM:SS`): a calendar date and a time of day, with no timezone
 * and no offset. What the reader SEES is their own locale's order and clock —
 * "28/09/2026, 14:30" for one, "9/28/2026, 2:30 PM" for another — and the value
 * comes back as `2026-09-28T14:30` either way.
 *
 * NOT A `Date`, NOT A TIMESTAMP, NOT AN INSTANT
 *
 * "Start the run on 28 September at 14:30" means half past two where the
 * schedule lives. A `Date` pins that to one instant in the READER's zone, so
 * a colleague in another zone saves a different moment by opening the form.
 * Keep the zone as its own field or setting, and say which it is in the
 * field's `description`; the value stays the reading on the wall.
 */
import {
  CalendarDate,
  CalendarDateTime,
  GregorianCalendar,
  parseDateTime,
  toCalendar,
} from '@internationalized/date';
import type { DateValue } from '@internationalized/date';

/**
 * A wall-clock date and time as `YYYY-MM-DDTHH:MM` or `YYYY-MM-DDTHH:MM:SS`.
 *
 * An alias for `string`, so it documents rather than enforces;
 * `toCalendarDateTime` is the runtime check.
 */
export type IsoDateTime = string;

/** Exactly `YYYY-MM-DDTHH:MM`, optionally `:SS`. No zone, no offset, no fraction. */
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * ISO string in, `CalendarDateTime` out. Throws on anything else — a `Date`,
 * a timestamp, an offset or a zone — for the reason `toCalendarDate` does: an
 * empty field for a malformed value looks exactly like "nothing chosen".
 */
export function toCalendarDateTime(
  value: IsoDateTime | null | undefined,
  prop: string,
): CalendarDateTime | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !ISO_DATE_TIME.test(value)) {
    throw new TypeError(
      `${prop}: expected a YYYY-MM-DDTHH:MM string, received ${JSON.stringify(value)}. ` +
        `DateTimePicker takes a wall-clock date and time with no zone or offset, not a Date or a timestamp.`,
    );
  }
  try {
    return parseDateTime(value);
  } catch {
    throw new RangeError(
      `${prop}: ${JSON.stringify(value)} is well-formed but is not a real date.`,
    );
  }
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/**
 * A date-time out, ISO string back, projected to Gregorian — see `toIso` for
 * why the parts are assembled rather than `toString()`ed.
 */
export function toIsoDateTime(
  value: DateValue & { hour?: number; minute?: number; second?: number },
  withSeconds: boolean,
): IsoDateTime {
  const g = toCalendar(
    new CalendarDate(
      value.calendar,
      value.era,
      value.year,
      value.month,
      value.day,
    ),
    new GregorianCalendar(),
  );
  const date = `${pad(g.year, 4)}-${pad(g.month)}-${pad(g.day)}`;
  const time = `${pad(value.hour ?? 0)}:${pad(value.minute ?? 0)}`;
  return `${date}T${time}${withSeconds ? `:${pad(value.second ?? 0)}` : ''}`;
}
