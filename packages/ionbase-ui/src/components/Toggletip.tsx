'use client';

import React, { useId, useRef } from 'react';
import {
  mergeProps,
  useButton,
  useFocusRing,
  useFocusWithin,
  useInteractOutside,
  useOverlayPosition,
  type Placement,
} from 'react-aria';
import { useOverlayTriggerState } from 'react-stately';

export type ToggletipPlacement = 'top' | 'bottom' | 'left' | 'right';
export type ToggletipSize = 'sm' | 'md';

export interface ToggletipProps {
  /**
   * Names the button for what it explains — "About log retention", not
   * "Info". Required: the button holds nothing but a glyph.
   */
  'aria-label': string;
  /** The explanation. Text, and at most a Link or a Button. */
  children: React.ReactNode;
  /** Where the bubble sits. Flips when there is no room. */
  placement?: ToggletipPlacement;
  /** The button: 16px glyph beside body-sm text, 20px beside body. */
  size?: ToggletipSize;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

/** Lucide's `info`, inlined: it is the control, not a slot a caller fills. */
const InfoGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

/**
 * Toggletip — an "ⓘ" that opens an explanation on click, with room for a link.
 *
 * WHY NOT TOOLTIP, AND WHY NOT POPOVER
 *
 * A Tooltip opens on hover, closes on pointer-out and cannot be focused, so a
 * link in one is unreachable — and a hover-only hint is invisible on touch.
 * A Popover is a dialog: it takes focus, traps it, and hides the rest of the
 * page from assistive technology, which is a lot of ceremony for a sentence of
 * help beside a label. A toggletip sits between: opened on purpose, it stays
 * open, and it is part of the page.
 *
 * HOW IT IS BUILT
 *
 *   - The bubble is rendered right after the button in the DOM, not portalled,
 *     so the next Tab from the button lands on a link inside it. It is
 *     positioned with `useOverlayPosition`, which measures against the
 *     bubble's own containing block, so it still flips and stays on screen.
 *   - Focus stays on the button when it opens. The bubble is a live region
 *     that is always in the page — empty while closed — so its text is read
 *     out on open without focus having to move. The same reason TableBatchBar
 *     stays mounted: a live region inserted with its message is silent.
 *   - It closes on Escape (focus back to the button), on a press outside, and
 *     when focus leaves the button and bubble together. It never traps focus
 *     and never hides the page — it is not modal.
 */
export function Toggletip({
  'aria-label': ariaLabel,
  children,
  placement = 'top',
  size = 'md',
  isOpen,
  defaultOpen,
  onOpenChange,
  className,
}: ToggletipProps) {
  const state = useOverlayTriggerState({ isOpen, defaultOpen, onOpenChange });
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const bubbleId = useId();

  const { buttonProps } = useButton(
    {
      'aria-label': ariaLabel,
      'aria-expanded': state.isOpen,
      'aria-controls': bubbleId,
      onPress: () => state.toggle(),
    },
    buttonRef,
  );
  const { focusProps, isFocusVisible } = useFocusRing();

  const {
    overlayProps: positionProps,
    arrowProps,
    placement: resolved,
  } = useOverlayPosition({
    targetRef: buttonRef,
    overlayRef: bubbleRef,
    placement: placement as Placement,
    offset: 10,
    isOpen: state.isOpen,
  });

  useInteractOutside({
    ref: rootRef,
    onInteractOutside: () => state.close(),
    isDisabled: !state.isOpen,
  });

  const { focusWithinProps } = useFocusWithin({
    onBlurWithin: () => state.close(),
  });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape' || !state.isOpen) return;
    // Handled here so a Toggletip inside a Modal closes first, alone.
    e.stopPropagation();
    state.close();
    buttonRef.current?.focus();
  };

  const side = (resolved ?? placement).split(' ')[0];

  return (
    <span
      {...focusWithinProps}
      ref={rootRef}
      onKeyDown={onKeyDown}
      className={[
        'ion-toggletip',
        size !== 'md' ? `ion-toggletip--${size}` : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        {...mergeProps(buttonProps, focusProps)}
        ref={buttonRef}
        type="button"
        className="ion-toggletip__button"
        data-open={state.isOpen || undefined}
        data-focus-visible={isFocusVisible || undefined}
      >
        <InfoGlyph />
      </button>
      <span
        ref={bubbleRef}
        id={bubbleId}
        role="status"
        {...(state.isOpen ? positionProps : {})}
        className={[
          'ion-toggletip__bubble',
          `ion-toggletip__bubble--${side}`,
          state.isOpen ? '' : 'ion-toggletip__bubble--closed',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {state.isOpen && (
          <>
            <span
              {...arrowProps}
              className="ion-toggletip__arrow"
              aria-hidden="true"
            />
            {children}
          </>
        )}
      </span>
    </span>
  );
}

Toggletip.displayName = 'Toggletip';
