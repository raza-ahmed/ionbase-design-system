import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  useButton,
  useHover,
  useFocusRing,
  mergeProps,
  type AriaButtonProps,
} from 'react-aria';
import { ARIA_BUTTON_NON_DOM_PROPS, omitProps } from './dom-props.js';

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
      isDisabled,
      ...restProps
    } = props;

    const domRef = useRef<HTMLButtonElement>(null);
    useImperativeHandle(forwardedRef, () => domRef.current!);

    const { buttonProps, isPressed } = useButton(props, domRef);

    /*
     * Interaction state comes from React Aria rather than CSS pseudo-classes.
     *
     * `useHover` is pointer-aware: native `:hover` latches on touch devices, so
     * a tapped button stays visually hovered until you tap elsewhere.
     * `useFocusRing` distinguishes keyboard focus from a mouse click, so the
     * ring appears when navigating but not when clicking.
     *
     * The CSS keeps its `:hover` / `:focus-visible` rules so the stylesheet
     * still works without React — these attributes refine that, they do not
     * replace it.
     */
    const { hoverProps, isHovered } = useHover({ isDisabled });
    const { focusProps, isFocusVisible } = useFocusRing();

    const classNames = [
      'ion-button',
      `ion-button--${variant}`,
      size !== 'md' ? `ion-button--${size}` : '',
      customClassName || '',
    ]
      .filter(Boolean)
      .join(' ');

    // `undefined` rather than `false` so the attribute is omitted entirely
    // instead of rendering data-hovered="false", which would still match
    // an `[data-hovered]` selector.
    const stateAttributes = {
      'data-hovered': isHovered || undefined,
      'data-pressed': isPressed || undefined,
      'data-focused': isFocusVisible || undefined,
      'data-disabled': isDisabled || undefined,
    };

    /*
     * `useButton` above was handed the *full* props object, so it has already
     * taken `onPress` and friends and wired them up. What is left in
     * `restProps` is a duplicate set that React Aria has no further use for —
     * and spreading it would put `onPress` on the DOM node, which React warns
     * about and ignores. See ./dom-props.ts for the list and its provenance.
     */
    const domProps = omitProps(restProps, ARIA_BUTTON_NON_DOM_PROPS);

    return (
      <button
        {...domProps}
        {...mergeProps(buttonProps, hoverProps, focusProps)}
        {...stateAttributes}
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
