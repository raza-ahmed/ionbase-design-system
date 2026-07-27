import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { useButton, AriaButtonProps } from 'react-aria';

export interface ButtonProps extends AriaButtonProps<'button'> {
  /** The visual style variant of the button. */
  variant?:
    | 'primary-brand'
    | 'primary-neutral'
    | 'secondary'
    | 'tertiary'
    | 'destructive';
  /** The size of the button. */
  size?: 'sm' | 'md' | 'lg';
  /** Optional icon to render before the label. */
  startIcon?: React.ReactNode;
  /** Optional icon to render after the label. */
  endIcon?: React.ReactNode;
  /** Additional CSS class names. */
  className?: string;
  /** Children element to render inside the button. */
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, forwardedRef) => {
    const {
      variant = 'primary-brand',
      size = 'md',
      startIcon,
      endIcon,
      className: customClassName,
      children,
      ...restProps
    } = props;

    // Prevent spreading custom react-aria prop to native DOM button element
    delete (restProps as Record<string, unknown>).isDisabled;

    const domRef = useRef<HTMLButtonElement>(null);
    // Safely forward the DOM node to consumers
    useImperativeHandle(forwardedRef, () => domRef.current!);

    const { buttonProps, isPressed } = useButton(props, domRef);

    // Combine BEM styles
    const classNames = [
      'ion-button',
      `ion-button--${variant}`,
      size !== 'md' ? `ion-button--${size}` : '',
      customClassName || '',
    ]
      .filter(Boolean)
      .join(' ');

    // Set framework-agnostic interactive data-attributes
    const dataAttributes = {
      'data-pressed': isPressed || undefined,
    };

    return (
      <button
        {...restProps}
        {...buttonProps}
        {...dataAttributes}
        ref={domRef}
        className={classNames}
      >
        {startIcon && (
          <span className="ion-button__icon-start">{startIcon}</span>
        )}
        {children && <span className="ion-button__label">{children}</span>}
        {endIcon && <span className="ion-button__icon-end">{endIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
