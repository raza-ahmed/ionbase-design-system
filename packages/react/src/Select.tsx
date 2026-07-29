import React, { forwardRef, useRef, useImperativeHandle, useId } from 'react';
import { useHover, useFocusRing, mergeProps } from 'react-aria';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'size'
> {
  /** Matches the Figma `Size` variant: Small, Medium, Large. */
  size?: SelectSize;
  /** The options to render. Omit and pass `children` for grouped options. */
  options?: SelectOption[];
  /**
   * Text shown when nothing is selected. Renders as a disabled option so the
   * field can start empty without that being a valid choice.
   */
  placeholder?: string;
  /** Field label. Renders the Figma `Form Field` wrapper around the control. */
  label?: React.ReactNode;
  /** Helper text below the field. */
  description?: React.ReactNode;
  /** Replaces the helper text when `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  /** Additional CSS class names, applied to the outermost element. */
  className?: string;
}

/**
 * The chevron from Figma's `Chevron` slot, inlined.
 *
 * Inlined rather than taken from `@ionbase/icons` because the chevron is part
 * of the component rather than a slot a consumer fills — Select would otherwise
 * be the only thing in this package that depends on the icon library, to draw a
 * shape that never varies. Sizing comes from the CSS, so it tracks the size
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

/**
 * Select wraps a native `<select>` rather than rebuilding one.
 *
 * React Aria's `useSelect` builds a listbox in a popover, which is the right
 * answer when the menu needs custom rows — but Figma models only the trigger
 * here, and the dropdown list is a separate component on the Menu page. Until
 * that is built, the native control is the honest match: it brings keyboard
 * handling, type-ahead and the platform picker on mobile for free, and it is
 * accessible without any of it being reimplemented.
 *
 * Figma's six states map the same way Input's do — Hover and Focus from
 * interaction, Filled from whether a value is set, the rest from props.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (props, forwardedRef) => {
    const {
      size = 'md',
      options,
      placeholder,
      label,
      description,
      errorMessage,
      isInvalid,
      isDisabled,
      className: customClassName,
      value,
      defaultValue,
      children,
      id: providedId,
      ...rest
    } = props;

    const domRef = useRef<HTMLSelectElement>(null);
    useImperativeHandle(forwardedRef, () => domRef.current!);

    const generatedId = useId();
    const id = providedId ?? generatedId;
    const helperId = `${id}-helper`;

    const { hoverProps, isHovered } = useHover({ isDisabled });
    const { focusProps, isFocusVisible } = useFocusRing();

    /*
     * A browser will not auto-select a disabled <option>, so an uncontrolled
     * Select with a placeholder skips past it and lands on the first real
     * option — the field claims a value the user never chose. Seeding
     * `defaultValue=""` selects the placeholder explicitly, which is allowed:
     * `disabled` stops the user picking it, not the code.
     *
     * Only when uncontrolled and no defaultValue was given, so a controlled
     * Select keeps sole ownership of its value.
     */
    const seeded =
      defaultValue === undefined && value === undefined && placeholder
        ? ''
        : defaultValue;

    const current = value ?? seeded;
    const isPlaceholder =
      Boolean(placeholder) && (current === undefined || current === '');

    const helper = isInvalid && errorMessage ? errorMessage : description;

    const boxClassNames = [
      'ion-select',
      size !== 'md' ? `ion-select--${size}` : '',
      isPlaceholder ? 'ion-select--placeholder' : '',
      isInvalid ? 'ion-select--invalid' : '',
      isDisabled ? 'ion-select--disabled' : '',
      !label && !helper ? customClassName || '' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const stateAttributes = {
      'data-hovered': isHovered || undefined,
      'data-focused': isFocusVisible || undefined,
      'data-invalid': isInvalid || undefined,
      'data-disabled': isDisabled || undefined,
    };

    const box = (
      <div {...hoverProps} {...stateAttributes} className={boxClassNames}>
        <select
          {...mergeProps(rest, focusProps)}
          ref={domRef}
          id={id}
          className="ion-select__field"
          disabled={isDisabled}
          value={value}
          defaultValue={seeded}
          aria-invalid={isInvalid || undefined}
          aria-describedby={helper ? helperId : undefined}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((o) => (
            <option key={o.value} value={o.value} disabled={o.isDisabled}>
              {o.label}
            </option>
          ))}
          {children}
        </select>
        <span className="ion-select__chevron">
          <ChevronDown />
        </span>
      </div>
    );

    if (!label && !helper) return box;

    return (
      <div
        className={[
          'ion-field',
          isInvalid ? 'ion-field--error' : '',
          customClassName || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label && (
          <label htmlFor={id} className="ion-field__label">
            {label}
          </label>
        )}
        {box}
        {helper && (
          <span id={helperId} className="ion-field__helper">
            {helper}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
