/*
 * No `'use client'` here, deliberately — the build asserts its absence.
 *
 * This component holds no state and calls no hook: it composes a button and
 * `Input`, and `Input` carries the boundary already. Marking it would pull an
 * otherwise server-renderable module out of the server graph for nothing.
 */
import React, { forwardRef } from 'react';
import { Input, type InputProps } from './Input.js';
import { resolveDisabled } from './resolve-disabled.js';

/**
 * The chevron from Figma's `Chevron` slot, inlined.
 *
 * Same reasoning as Select's: the shape never varies and is part of the
 * component rather than a slot a consumer fills, so drawing it here avoids
 * making `ionbase-ui` depend on `ionbase-icons` — a dependency the package
 * deliberately does not have. Sizing comes from the CSS, so it tracks the size
 * modifier without a prop.
 */
const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m6 9 6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface PhoneInputProps extends Omit<
  InputProps,
  'leadingAddon' | 'leadingIcon'
> {
  /** The dial code shown in the leading block, e.g. `+1`. */
  dialCode?: string;
  /**
   * Accessible name for the dial-code trigger. It shows only `+1`, which names
   * a value rather than an action, so the button needs a label of its own.
   */
  countryLabel?: string;
  /**
   * Spread onto the dial-code `<button>`. This is how a country picker gets
   * attached — see the note on scope below.
   */
  countryButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

/**
 * PhoneInput — Figma `Input/Phone` (80:372).
 *
 * A dial-code block butted against an Input, sharing one outline: the block
 * carries the left radii and the control the right, so the seam is square on
 * both sides and reads as a single control. Both keep their full 1px border,
 * which is what Figma draws — the 2px seam is the two strokes meeting, not an
 * accident.
 *
 * Three sizes, no State axis. Every interaction state is the Input's, reached
 * through the ordinary props, because Figma composes this from the same `Input`
 * instance rather than redrawing it.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not pick countries. The chevron implies a menu and Figma specifies no
 * open state for it — no list, no flags, no search, no selected state. Country
 * data and the picker are application concerns with real editorial weight (which
 * territories, which names, which order), and inventing them here would be
 * designing rather than implementing.
 *
 * So the trigger is a real `<button>` with an accessible name, and
 * `countryButtonProps` is how you wire it to a `Menu`, a popover or your own
 * listbox — including the `aria-haspopup` and `aria-expanded` that only the
 * thing owning the popup can set honestly.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (props, forwardedRef) => {
    const {
      dialCode = '+1',
      countryLabel = 'Select country calling code',
      countryButtonProps,
      size = 'md',
      type = 'tel',
      isDisabled: isDisabledProp,
      disabled,
      ...inputProps
    } = props;

    const isDisabled = resolveDisabled(isDisabledProp, disabled);

    const countryClassNames = [
      'ion-phone-input__country',
      size !== 'md' ? `ion-phone-input__country--${size}` : '',
      countryButtonProps?.className || '',
    ]
      .filter(Boolean)
      .join(' ');

    const country = (
      <button
        type="button"
        aria-label={countryLabel}
        {...countryButtonProps}
        className={countryClassNames}
        // Read from the resolved value rather than the raw prop, so the
        // deprecated `disabled` alias disables the trigger too. A dial-code
        // button that stays live beside a disabled field is a real trap: it
        // looks operable and would open a picker for a field you cannot edit.
        disabled={isDisabled || countryButtonProps?.disabled}
      >
        <span className="ion-phone-input__dial-code">{dialCode}</span>
        <span className="ion-phone-input__chevron">
          <ChevronDown />
        </span>
      </button>
    );

    return (
      <Input
        {...inputProps}
        ref={forwardedRef}
        size={size}
        type={type}
        isDisabled={isDisabled}
        leadingAddon={country}
      />
    );
  },
);

PhoneInput.displayName = 'PhoneInput';
