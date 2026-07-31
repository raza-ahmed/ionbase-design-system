import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
} from 'react';

export type CheckboxSize = 'sm' | 'md' | 'lg';
export type CheckboxIntent = 'brand' | 'neutral' | 'danger';

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
> {
  /** Matches the Figma `Size` variant: Small, Medium, Large. */
  size?: CheckboxSize;
  /** Matches the Figma `Color` variant: Brand, Neutral, Danger. */
  intent?: CheckboxIntent;
  /**
   * Figma's `Indeterminate` state. Not an HTML attribute — `indeterminate` is a
   * DOM property only, so it has to be assigned after render.
   */
  isIndeterminate?: boolean;
  /** Figma's `Show Label` + `Label`. Omit for a bare box. */
  children?: React.ReactNode;
}

/** Figma's check glyph. Inlined for the same reason as Select's chevron: it is
 *  part of the control, not a slot a caller fills. */
const CheckMark = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m5 13 4 4L19 7"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DashMark = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M6 12h12"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Checkbox wraps a native `<input type="checkbox">` and hides it.
 *
 * The native input is kept rather than replaced by a div with `role=checkbox`
 * because it brings form association, the indeterminate property, label
 * clicking, and correct announcement — none of which are free to reimplement,
 * and all of which are easy to get subtly wrong.
 *
 * `indeterminate` is the reason for the effect below: HTML has no
 * `indeterminate` attribute, only a DOM property, so React cannot set it
 * declaratively and it must be written after every render.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (props, forwardedRef) => {
    const {
      size = 'md',
      intent = 'brand',
      isIndeterminate = false,
      className,
      children,
      disabled,
      ...rest
    } = props;

    const domRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => domRef.current!);

    useEffect(() => {
      if (domRef.current) domRef.current.indeterminate = isIndeterminate;
    }, [isIndeterminate]);

    const classNames = [
      'ion-checkbox',
      size !== 'md' ? `ion-checkbox--${size}` : '',
      intent !== 'brand' ? `ion-checkbox--${intent}` : '',
      disabled ? 'ion-checkbox--disabled' : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <label className={classNames}>
        <input
          {...rest}
          ref={domRef}
          type="checkbox"
          disabled={disabled}
          className="ion-checkbox__input"
        />
        <span className="ion-checkbox__indicator" aria-hidden="true">
          <span className="ion-checkbox__mark">
            {isIndeterminate ? <DashMark /> : <CheckMark />}
          </span>
        </span>
        {children && <span className="ion-checkbox__label">{children}</span>}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
