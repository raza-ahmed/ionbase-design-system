'use client';

import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  useLink,
  useButton,
  useHover,
  useFocusRing,
  mergeProps,
} from 'react-aria';
import type { AriaLinkOptions, AriaButtonOptions } from 'react-aria';
import { resolveDisabled } from './resolve-disabled.js';
import {
  ARIA_LINK_NON_DOM_PROPS,
  ANCHOR_ONLY_DOM_PROPS,
  omitProps,
} from './dom-props.js';

export type LinkVariant = 'inline' | 'standalone';

/**
 * The plain anchor attributes React Aria has no opinion about — `target`,
 * `rel`, `download`, `hreflang` and the rest. `AriaLinkOptions` wins every
 * overlap, the same split `Input` makes against `AriaTextFieldProps`.
 */
type LinkDOMProps = Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof AriaLinkOptions | 'color'
>;

export interface LinkProps extends AriaLinkOptions, LinkDOMProps {
  /**
   * Matches the Figma `Type` variant.
   *
   * `inline` is for links inside body copy and is underlined in every state —
   * a link in a paragraph must not rely on colour alone (WCAG 1.4.1).
   * `standalone` is for links that already read as interactive from their
   * position, and underlines on hover only.
   */
  variant?: LinkVariant;
  /** Optional icon before the label. */
  startIcon?: React.ReactNode;
  /** Optional icon after the label — the external-link or arrow affordance. */
  endIcon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /**
   * @deprecated Use `isDisabled`. Accepted as an alias for one minor version.
   */
  disabled?: boolean;
}

/**
 * Link — Figma `Link` (774:1516).
 *
 * Renders an `<a>` when given an `href` and a `<button>` otherwise, the same
 * judgment `NavItem` makes: the element follows what the caller is actually
 * building rather than a separate `as` prop. A link that does not navigate is
 * a button, and shipping one as an anchor breaks middle-click, "open in new
 * tab" and the screen-reader announcement all at once.
 *
 * NO SIZE PROP, DELIBERATELY. A link is an inline element and inherits its
 * type from the text around it — `font-size: inherit` in the stylesheet, and
 * icons sized in `em` so they scale with it. Figma has to draw its variants at
 * some concrete size (16/24, `type/body`), but that is one sample of an
 * inheriting element, not a specification. Do not add a size ladder to match
 * the drawing.
 */
export const Link = forwardRef<
  HTMLAnchorElement & HTMLButtonElement,
  LinkProps
>((props, forwardedRef) => {
  const {
    variant = 'inline',
    startIcon,
    endIcon,
    className: customClassName,
    children,
    isDisabled: isDisabledProp,
    disabled,
    href,
    ...restProps
  } = props;

  const isDisabled = resolveDisabled(isDisabledProp, disabled);

  const domRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  useImperativeHandle(forwardedRef, () => domRef.current!);

  const isNavigating = Boolean(href);

  /*
   * `useLink` for the anchor, `useButton` for the button — NOT `useLink` for
   * both.
   *
   * `useLink` on a non-anchor stamps `role="link"` on it, which is the correct
   * behaviour for a hand-rolled link and precisely wrong here: this component
   * renders a real `<button>` when there is nothing to navigate to, and a
   * button announced as a link tells a screen-reader user to expect navigation
   * that will not happen. Caught by a story asserting `getByRole('button')`.
   *
   * Both hooks are called unconditionally because React forbids conditional
   * hooks and `href` can change between renders. Only one result is ever
   * spread, and both deliver their behaviour entirely through the props they
   * return, so the unused one attaches nothing to the DOM.
   */
  const link = useLink(
    { ...props, isDisabled, elementType: 'a' } as AriaLinkOptions,
    domRef,
  );
  const button = useButton(
    {
      ...props,
      isDisabled,
      elementType: 'button',
    } as AriaButtonOptions<'button'>,
    domRef,
  );

  const interactionProps = isNavigating ? link.linkProps : button.buttonProps;
  const isPressed = isNavigating ? link.isPressed : button.isPressed;

  /*
   * `useLink`/`useButton` above were handed the FULL props object, so they have
   * already taken `onPress` and friends and wired them up. What is left in
   * `restProps` is a duplicate set with no further use — and spreading it puts
   * `onPress` on the DOM node, which React warns about on every render and
   * then ignores. Button and Input strip theirs the same way.
   *
   * The button branch strips more: `target`, `rel`, `download` and the rest are
   * real anchor attributes and meaningless on a `<button>`.
   */
  const anchorProps = omitProps(restProps, ARIA_LINK_NON_DOM_PROPS);
  const buttonDomProps = omitProps(anchorProps, ANCHOR_ONLY_DOM_PROPS);

  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const classNames = ['ion-link', `ion-link--${variant}`, customClassName || '']
    .filter(Boolean)
    .join(' ');

  // `undefined` rather than `false`, so the attribute is omitted entirely
  // instead of rendering data-hovered="false" — which would still match an
  // `[data-hovered]` selector.
  const stateAttributes = {
    'data-hovered': isHovered || undefined,
    'data-pressed': isPressed || undefined,
    'data-focused': isFocusVisible || undefined,
    'data-disabled': isDisabled || undefined,
  };

  const content = (
    <>
      {startIcon && (
        <span className="ion-link__icon-start" aria-hidden="true">
          {startIcon}
        </span>
      )}
      {children && <span className="ion-link__label">{children}</span>}
      {endIcon && (
        <span className="ion-link__icon-end" aria-hidden="true">
          {endIcon}
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <button
        {...(buttonDomProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        {...mergeProps(interactionProps, hoverProps, focusProps)}
        {...stateAttributes}
        ref={domRef}
        type="button"
        disabled={isDisabled}
        className={classNames}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      {...anchorProps}
      {...mergeProps(interactionProps, hoverProps, focusProps)}
      {...stateAttributes}
      ref={domRef}
      // A disabled link must not remain navigable. `aria-disabled` alone
      // still leaves the href clickable and focusable, so the href is
      // dropped and it is taken out of the tab order — the same treatment
      // NavItem gives a disabled link.
      href={isDisabled ? undefined : href}
      aria-disabled={isDisabled || undefined}
      tabIndex={isDisabled ? -1 : undefined}
      className={classNames}
    >
      {content}
    </a>
  );
});

Link.displayName = 'Link';
