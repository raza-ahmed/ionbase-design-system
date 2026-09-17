/*
 * The ISO boundary. Every conversion between the public API and react-aria's
 * date objects happens here and nowhere else.
 *
 * WHY THE PUBLIC API IS A STRING AND NOT A `CalendarDate`
 *
 * react-aria's date hooks speak `@internationalized/date`. Exposing that type
 * on the props would make it a peer dependency: every consumer would have to
 * install the package and write `parseDate('2026-04-12')` to pass a literal
 * date. That is a real cost for a real benefit — non-Gregorian calendar systems
 * survive the round trip untouched — and the benefit is not the one this system
 * is optimising for.
 *
 * IonBase is written on the premise that the caller is an agent with no
 * developer reviewing the output. An agent can write `value="2026-04-12"` and
 * be right; it cannot forget to install a package it was never told about, or
 * pass a `Date` where a `CalendarDate` was wanted and get a type error it has
 * no way to act on. `@internationalized/date` stays a dependency of this
 * package, imported here, and never appears in a consumer's import list.
 *
 * WHAT IS GIVEN UP, STATED PLAINLY
 *
 * The VALUE is always a Gregorian ISO calendar date. The DISPLAY is not — the
 * field and the grid are rendered in the user's locale and calendar system via
 * `createCalendar`, so a Hijri or Buddhist reader sees their own calendar and
 * the value still comes back as `YYYY-MM-DD`. That is the same split the HTML
 * `<input type="date">` makes, and it is the one almost every backend wants.
 *
 * WHAT THIS IS NOT
 *
 * Not a `Date`. `new Date('2026-04-12')` parses as UTC midnight and then prints
 * as the 11th for anyone west of Greenwich — the single most common date bug
 * there is. A calendar date has no time and no zone, so it cannot have that
 * bug, and keeping the string as the wire format is what preserves that.
 */
import {
  CalendarDate,
  GregorianCalendar,
  parseDate,
  toCalendar,
} from '@internationalized/date';
import type { DateValue } from '@internationalized/date';

/**
 * A calendar date as `YYYY-MM-DD` — no time, no timezone, no offset.
 *
 * This is an alias for `string`, so it documents rather than enforces. The
 * runtime enforcement is in `toCalendarDate`, which throws on a malformed
 * value instead of silently rendering an empty field.
 */
export type IsoDate = string;

/** Matches exactly `YYYY-MM-DD`. Deliberately not a full ISO 8601 parse. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ISO string in, `CalendarDate` out. Throws on anything else.
 *
 * THROWING IS THE POINT. The tempting alternative is to return `null` for an
 * unparseable value, and the first version did. A caller who passed a
 * `Date`, a timestamp or `'04/12/2026'` then got a date picker that rendered
 * perfectly with nothing in it, and no indication anywhere that the value it
 * was handed had been dropped on the floor. An exception names the prop and the
 * value, which is the difference between a five-second fix and an afternoon.
 *
 * `parseDate` is also stricter than it looks: it rejects `2026-02-30` and
 * `2026-13-01`, so a date that is well-formed but does not exist fails here
 * too rather than being quietly rounded into a neighbouring month.
 */
export function toCalendarDate(
  value: IsoDate | null | undefined,
  prop: string,
): CalendarDate | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new TypeError(
      `${prop}: expected a YYYY-MM-DD string, received ${JSON.stringify(value)}. ` +
        `Date pickers in ionbase-ui take ISO calendar dates, not Date objects or timestamps.`,
    );
  }
  try {
    return parseDate(value);
  } catch {
    throw new RangeError(
      `${prop}: ${JSON.stringify(value)} is well-formed but is not a real date.`,
    );
  }
}

/**
 * `CalendarDate` out, ISO string back.
 *
 * `toString()` is NOT used, and this is not a stylistic preference. A value
 * that came from a non-Gregorian calendar stringifies WITH its calendar
 * annotation — `2569-05-30[u-ca-buddhist]` — which is a correct ISO 8601-2
 * string and is not what any caller expecting `YYYY-MM-DD` will do anything
 * sensible with. Building the string from the parts of the Gregorian
 * projection is what keeps the wire format one shape in every locale.
 *
 * The projection to Gregorian happens here rather than being assumed. In
 * practice react-aria hands back the calendar it was given — `useCalendarState`
 * converts through `toCalendar` on the way out — so a Gregorian value in is a
 * Gregorian value out, and this is a no-op. It is written anyway because the
 * one path where it is NOT a no-op is an unavailable-date predicate being
 * offered a cell from the DISPLAY calendar, which is the reader's, not ours.
 */
export function toIso(date: DateValue): IsoDate {
  const g = toCalendar(
    new CalendarDate(date.calendar, date.era, date.year, date.month, date.day),
    new GregorianCalendar(),
  );
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return `${pad(g.year, 4)}-${pad(g.month, 2)}-${pad(g.day, 2)}`;
}

/**
 * Wraps an `isDateUnavailable` predicate so the caller receives an ISO string
 * rather than a `CalendarDate`.
 *
 * Returned as `undefined` when there is no predicate, rather than as a function
 * that always returns false. react-aria checks for the prop's presence in more
 * than one place, and a no-op function is present.
 */
export function wrapUnavailable(
  fn: ((date: IsoDate) => boolean) | undefined,
): ((date: DateValue) => boolean) | undefined {
  if (!fn) return undefined;
  return (date) => fn(toIso(date));
}
