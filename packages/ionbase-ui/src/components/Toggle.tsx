'use client';

import React, { forwardRef, useRef, useImperativeHandle } from 'react';

export type ToggleSize = 'sm' | 'md' | 'lg';
export type ToggleIntent = 'brand' | 'neutral' | 'danger';

export interface ToggleProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
> {
  /** Matches the Figma `Size` variant: Small, Medium, Large. */
  size?: ToggleSize;
  /** Matches the Figma `Color` variant: Brand, Neutral, Danger. */
  intent?: ToggleIntent;
  children?: React.ReactNode;
}

/**
 * Toggle is a checkbox with `role="switch"`.
 *
 * Not a button with aria-pressed: a switch is a form value, and the checkbox
 * gives form association and `:checked` for free. `role="switch"` changes only
 * how it is announced — "on/off" rather than "checked/unchecked" — which is
 * what Figma's On/Off states describe.
 *
 * The visual difference from Checkbox is entirely in CSS; this component and
 * Checkbox are near-identical by design rather than by accident, and are kept
 * apart because Figma models them as separate components with separate size
 * ramps.
 */
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  (props, forwardedRef) => {
    const {
      size = 'md',
      intent = 'brand',
      className,
      children,
      disabled,
      ...rest
    } = props;

    const domRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => domRef.current!);

    const classNames = [
      'ion-toggle',
      size !== 'md' ? `ion-toggle--${size}` : '',
      intent !== 'brand' ? `ion-toggle--${intent}` : '',
      disabled ? 'ion-toggle--disabled' : '',
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
          role="switch"
          disabled={disabled}
          className="ion-toggle__input"
        />
        <span className="ion-toggle__track" aria-hidden="true">
          <span className="ion-toggle__thumb" />
        </span>
        {children && <span className="ion-toggle__label">{children}</span>}
      </label>
    );
  },
);

Toggle.displayName = 'Toggle';
