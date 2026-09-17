/**
 * Calendar-day arithmetic on `YYYY-MM-DD` strings, the shape DateRangePicker
 * speaks. Everything is UTC so a range never shifts by a day across a DST
 * change or a viewer's timezone.
 */
export type IsoDay = string;

const DAY_MS = 86_400_000;

export function toIso(date: Date): IsoDay {
  return date.toISOString().slice(0, 10);
}

export function today(): IsoDay {
  return toIso(new Date());
}

export function addDays(day: IsoDay, n: number): IsoDay {
  return toIso(new Date(Date.parse(day) + n * DAY_MS));
}

/** Inclusive: the same day twice is one day. */
export function dayCount(start: IsoDay, end: IsoDay): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1;
}

export function eachDay(start: IsoDay, end: IsoDay): IsoDay[] {
  return Array.from({ length: dayCount(start, end) }, (_, i) =>
    addDays(start, i),
  );
}

const short = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatDay(day: IsoDay): string {
  return short.format(new Date(Date.parse(day)));
}
