'use client';

import React, { cloneElement, useRef } from 'react';
import {
  Overlay,
  useTooltip,
  useTooltipTrigger,
  useOverlayPosition,
  mergeProps,
} from 'react-aria';
import { useTooltipTriggerState } from 'react-stately';
import type { Placement } from 'react-aria';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /**
   * The hint. A tooltip is text only — anything interactive or focusable
   * belongs in a popover, because a tooltip cannot be focused, cannot be
   * scrolled, and closes the moment the pointer leaves.
   */
  label: React.ReactNode;
  /** Optional heading above the label. */
  title?: React.ReactNode;
  /**
   * Matches the Figma `Placement` variant, and names where the TOOLTIP sits —
   * not where the arrow points. `top` is above the trigger, with the arrow on
   * the tooltip's bottom edge.
   *
   * Treated as a preference, not a guarantee: it flips to the opposite side
   * when there is no room, which is the behaviour Figma cannot draw.
   */
  placement?: TooltipPlacement;
  /** Milliseconds before it opens on hover. Focus always opens immediately. */
  delay?: number;
  /** Disable the tooltip without unmounting the trigger. */
  isDisabled?: boolean;
  /** The element the tooltip describes. Must accept a ref and DOM props. */
  children: React.ReactElement;
  className?: string;
}

/**
 * Tooltip — Figma `Tooltip` (801:1568).
 *
 * Wraps its trigger rather than taking a ref, so the common case is one
 * element deep: `<Tooltip label="..."><Button/></Tooltip>`.
 *
 * FOCUS OPENS IT, NOT JUST HOVER. A hover-only tooltip is invisible to keyboard
 * and switch users, and `useTooltipTrigger` wires both plus Escape to dismiss.
 * It also enforces one open tooltip at a time and a shared warmup, so moving
 * along a row of icon buttons does not flash a tooltip per button.
 *
 * The trigger is cloned with the interaction props and a ref, which means it
 * must forward both. Every component in this library does; a bare `<div>` does
 * too. A function component that drops its ref will render, but the tooltip
 * will have nothing to position against.
 */
export function Tooltip({
  label,
  title,
  placement = 'top',
  delay = 400,
  isDisabled,
  children,
  className,
}: TooltipProps) {
  const state = useTooltipTriggerState({ delay, isDisabled });
  const triggerRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { triggerProps, tooltipProps } = useTooltipTrigger(
    { isDisabled },
    state,
    triggerRef,
  );
  const { tooltipProps: ariaTooltipProps } = useTooltip(tooltipProps, state);

  /*
   * `offset` is the gap between trigger and bubble, and it has to clear the
   * arrow or the caret sits on top of the thing it points at. 4px arrow plus
   * a 4px gap.
   */
  const {
    overlayProps,
    arrowProps,
    placement: resolvedPlacement,
  } = useOverlayPosition({
    targetRef: triggerRef,
    overlayRef,
    placement: placement as Placement,
    offset: 8,
    isOpen: state.isOpen,
  });

  // `resolvedPlacement` rather than the prop: react-aria flips on collision,
  // and the arrow has to move with it or it points at nothing.
  const side = (resolvedPlacement ?? placement).split(' ')[0];

  return (
    <>
      {cloneElement(
        children,
        mergeProps(children.props as Record<string, unknown>, {
          ...triggerProps,
          ref: triggerRef,
        }),
      )}
      {state.isOpen && (
        <Overlay>
          <div
            {...mergeProps(ariaTooltipProps, overlayProps)}
            ref={overlayRef}
            className={['ion-tooltip', `ion-tooltip--${side}`, className || '']
              .filter(Boolean)
              .join(' ')}
          >
            <div className="ion-tooltip__bubble">
              {title && <div className="ion-tooltip__title">{title}</div>}
              <div className="ion-tooltip__label">{label}</div>
            </div>
            <div
              {...arrowProps}
              className="ion-tooltip__arrow"
              // Decorative: the bubble already carries the accessible text, and
              // an announced arrow is noise.
              aria-hidden="true"
            />
          </div>
        </Overlay>
      )}
    </>
  );
}

Tooltip.displayName = 'Tooltip';
