/*
 * The colour boundary — the same bargain as `iso-date.ts`: one plain string
 * crosses the public API, and React Aria's objects stay inside.
 *
 * The public value is `#RRGGBB`: six hex digits, no alpha. It is what a
 * product stores for a brand colour, a label colour or a chart series, and
 * what every other tool reads back. It leaves the component in upper case,
 * which is how the field shows it; either case is accepted coming in.
 *
 * NOT `rgb()`, NOT A NAME, NOT `#RGB`
 *
 * A value the picker cannot show as `#RRGGBB` would come back as something
 * other than what went in, and a stored "red" or "#f00" would read as edited
 * the first time the form was saved. The field accepts shorthand as TYPED
 * input and normalises it; the props do not, and throw rather than render an
 * empty field that looks like "nothing chosen".
 */
import { parseColor } from 'react-stately';
import type { Color } from 'react-stately';

/**
 * A colour as `#RRGGBB`.
 *
 * An alias for `string`, so it documents rather than enforces; `toColor` is
 * the runtime check.
 */
export type HexColor = string;

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * `#RRGGBB` in, React Aria `Color` out — in HSB, the space the picker works
 * in. `null` and `''` are "none chosen". Throws on anything else.
 */
export function toColor(
  value: HexColor | null | undefined,
  prop: string,
): Color | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !HEX.test(value)) {
    throw new TypeError(
      `${prop}: expected a #RRGGBB string, received ${JSON.stringify(value)}. ` +
        `ColorPicker takes six hex digits with a leading #, not a name, rgb() or shorthand.`,
    );
  }
  return parseColor(value).toFormat('hsb');
}

/** A `Color` out, `#RRGGBB` back. */
export function toHex(color: Color): HexColor {
  return color.toString('hex');
}
