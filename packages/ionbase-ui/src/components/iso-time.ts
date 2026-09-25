/*
 * The time boundary — `iso-date.ts`'s sibling, for the same reasons.
 *
 * The public value is a wall-clock time as `HH:MM` (or `HH:MM:SS`), 24-hour,
 * with no date and no timezone. What the user SEES is their own locale's
 * format — "2:30 PM" for one reader, "14:30" for another — and the value
 * comes back as `14:30` either way. react-aria's `Time` object never appears
 * in a consumer's import list.
 *
 * NOT A `Date`, NOT A TIMESTAMP
 *
 * "Run every day at 09:00" means nine o'clock wherever the schedule lives.
 * A `Date` would pin it to one instant, and it would drift an hour twice a
 * year. Pair the time with a timezone field where the product needs one; the
 * time itself stays a wall-clock reading.
 */
import { Time } from '@internationalized/date';

/**
 * A wall-clock time as `HH:MM` or `HH:MM:SS`, 24-hour.
 *
 * An alias for `string`, so it documents rather than enforces; `toTime` is
 * the runtime check.
 */
export type IsoTime = string;

const ISO_TIME = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/**
 * `HH:MM[:SS]` in, `Time` out. Throws on anything else, for the reason
 * `toCalendarDate` does: an empty field for a malformed value looks exactly
 * like "no time chosen", and the caller never finds out.
 */
export function toTime(value: undefined, prop: string): undefined;
export function toTime(value: IsoTime | null, prop: string): Time | null;
export function toTime(
  value: IsoTime | null | undefined,
  prop: string,
): Time | null | undefined;
export function toTime(
  value: IsoTime | null | undefined,
  prop: string,
): Time | null | undefined {
  if (value === undefined || value === null) return value;
  const m = ISO_TIME.exec(value);
  if (!m) {
    throw new Error(
      `TimeField: \`${prop}\` must be "HH:MM" or "HH:MM:SS" in 24-hour time, got "${value}".`,
    );
  }
  return new Time(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 0);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `Time` out to `HH:MM`, or `HH:MM:SS` when the field shows seconds. */
export function toIsoTime(
  time: { hour: number; minute: number; second: number },
  withSeconds: boolean,
): IsoTime {
  const hm = `${pad(time.hour)}:${pad(time.minute)}`;
  return withSeconds ? `${hm}:${pad(time.second)}` : hm;
}
