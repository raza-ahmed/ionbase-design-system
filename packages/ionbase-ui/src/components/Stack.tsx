import React, { forwardRef } from 'react';

/**
 * The spacing scale, and only it: a gap off the scale is a type error, not a
 * review comment. Matches `--spacing-*`.
 */
export type StackGap =
  0 | 2 | 4 | 6 | 8 | 12 | 16 | 20 | 24 | 32 | 40 | 48 | 64;

export type StackDirection = 'column' | 'row';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between';
export type StackElement =
  | 'div'
  | 'span'
  | 'section'
  | 'nav'
  | 'ul'
  | 'ol'
  | 'li'
  | 'header'
  | 'footer'
  | 'form'
  | 'fieldset';

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  /** `column` stacks top to bottom — the default; `row` runs along the line. */
  direction?: StackDirection;
  /** Space between the children, from the spacing scale. Defaults to 16. */
  gap?: StackGap;
  /** Cross-axis alignment. Defaults to `stretch` in a column, `center` in a row. */
  align?: StackAlign;
  /** Main-axis distribution. `between` pushes the first and last to the ends. */
  justify?: StackJustify;
  /** Let a row wrap onto more lines instead of overflowing. */
  wrap?: boolean;
  /**
   * The element: a list of things is a `ul`, a group of navigation links a
   * `nav`. Stack is layout only — the element carries the meaning.
   */
  as?: StackElement;
  children?: React.ReactNode;
}

/**
 * Stack — children in a column or a row, a gap from the spacing scale
 * between them.
 *
 * The one layout primitive an agent should reach for before writing flex
 * CSS: a screen built from raw `display: flex` and pixel gaps is where token
 * discipline breaks. `gap` takes the scale's steps and nothing else.
 *
 * LAYOUT ONLY. It has no role and adds none; pass `as` for the element that
 * means something. It renders on a server.
 */
export const Stack = forwardRef<HTMLElement, StackProps>(
  (
    {
      direction = 'column',
      gap = 16,
      align,
      justify,
      wrap,
      as: Tag = 'div',
      className,
      children,
      ...rest
    },
    ref,
  ) => (
    <Tag
      ref={ref as React.Ref<never>}
      {...rest}
      className={[
        'ion-stack',
        `ion-stack--${direction}`,
        `ion-stack--gap-${gap}`,
        align ? `ion-stack--align-${align}` : '',
        justify ? `ion-stack--justify-${justify}` : '',
        wrap ? 'ion-stack--wrap' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  ),
);

Stack.displayName = 'Stack';
