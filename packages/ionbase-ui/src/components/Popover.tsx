'use client';

import React, { cloneElement, useRef } from 'react';
import {
  Overlay,
  useOverlayTrigger,
  usePopover,
  useDialog,
  useButton,
  mergeProps,
} from 'react-aria';
import { useOverlayTriggerState } from 'react-stately';
import type { OverlayTriggerState } from 'react-stately';
import type { Placement } from 'react-aria';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';
export type PopoverSize = 'sm' | 'md' | 'lg';

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M18 6 6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface PopoverProps {
  /** The element that opens it. Must accept a ref and DOM props. */
  children: React.ReactElement;
  /** Panel contents. */
  content?: React.ReactNode;
  /** Heading. Also gives the dialog its accessible name. */
  title?: React.ReactNode;
  /** Action row, right-aligned. */
  footer?: React.ReactNode;
  /**
   * Matches the Figma `Placement` variant, and names where the POPOVER sits —
   * not where the arrow points. A preference, not a guarantee: it flips when
   * there is no room, and the arrow follows.
   */
  placement?: PopoverPlacement;
  /** Matches the Figma `Size` variant. Widths only; height always hugs. */
  size?: PopoverSize;
  /** Show the close button. Defaults to `true`. */
  showClose?: boolean;
  /** Hide the caret. */
  hideArrow?: boolean;
  closeLabel?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

interface PanelProps extends Omit<PopoverProps, 'children'> {
  state: OverlayTriggerState;
  triggerRef: React.RefObject<HTMLElement | null>;
  /** `useOverlayTrigger`'s id for the panel — the target of `aria-controls`. */
  overlayProps: React.HTMLAttributes<HTMLElement>;
}

/**
 * The panel, in its own component because it is mounted only while open.
 *
 * This split is not cosmetic. `useDialog` focuses the panel in an effect keyed
 * on the ref, and resolves the title's id by looking it up in the DOM — both of
 * which run once, when the component calling the hook mounts. Called alongside
 * `useOverlayTriggerState` in the parent, that moment is the moment the TRIGGER
 * mounts, when the panel and its title do not exist yet: the dialog never takes
 * focus (so Escape never reaches it) and `aria-labelledby` is silently dropped.
 * react-aria warns about this exact mistake in dev.
 */
function PopoverPanel({
  state,
  triggerRef,
  overlayProps,
  content,
  title,
  footer,
  placement = 'bottom',
  size = 'md',
  showClose = true,
  hideArrow,
  closeLabel = 'Close',
  className,
}: PanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /*
   * One positioning call, not two. `usePopover` runs `useOverlayPosition`
   * itself and returns the resolved placement and arrow offsets along with it;
   * calling `useOverlayPosition` separately produces a second set of transforms
   * that fight the first.
   */
  const {
    popoverProps,
    underlayProps,
    arrowProps,
    placement: resolvedPlacement,
  } = usePopover(
    {
      triggerRef,
      popoverRef: panelRef,
      placement: placement as Placement,
      offset: 10,
    },
    state,
  );

  const { dialogProps, titleProps } = useDialog({}, panelRef);

  const closeRef = useRef<HTMLButtonElement>(null);
  const { buttonProps: closeButtonProps } = useButton(
    { onPress: () => state.close(), 'aria-label': closeLabel },
    closeRef,
  );

  // The resolved placement, not the requested one — react-aria flips on
  // collision, and an arrow left on the requested side points at nothing.
  const side = (resolvedPlacement ?? placement).split(' ')[0];

  return (
    <Overlay>
      {/*
        The underlay is what makes an outside click close it. It is transparent
        and covers the viewport — unlike Modal's scrim, which is visible because
        a modal replaces the page; this one only listens.
      */}
      <div {...underlayProps} className="ion-popover__underlay" />
      <div
        {...mergeProps(popoverProps, dialogProps, overlayProps)}
        ref={panelRef}
        className={[
          'ion-popover',
          `ion-popover--${size}`,
          `ion-popover--${side}`,
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {!hideArrow && (
          <div
            {...arrowProps}
            className="ion-popover__arrow"
            aria-hidden="true"
          />
        )}

        {(title || showClose) && (
          <div className="ion-popover__header">
            {title && (
              <p {...titleProps} className="ion-popover__title">
                {title}
              </p>
            )}
            {showClose && (
              <button
                {...closeButtonProps}
                ref={closeRef}
                type="button"
                className="ion-popover__close"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )}

        {content && <div className="ion-popover__body">{content}</div>}
        {footer && <div className="ion-popover__footer">{footer}</div>}
      </div>
    </Overlay>
  );
}

/**
 * Popover — Figma `Popover` (825:1853).
 *
 * SITS BETWEEN TOOLTIP AND MODAL. A tooltip is a hint that cannot hold
 * focusable content; a modal is a task that takes over the page. A popover
 * holds interactive content but stays attached to the control that opened it.
 *
 * `usePopover` contains focus, closes on Escape or an outside click, and hides
 * the rest of the page from assistive tech while open — the same guarantees
 * Modal gives. What differs is the framing, and it is deliberate: no visible
 * scrim, anchored to its trigger, and `surface/raised` rather than Modal's
 * `surface/overlay`. It reads as attached to the page rather than replacing it.
 */
export function Popover({ children, ...props }: PopoverProps) {
  const { isOpen, onOpenChange } = props;
  const state = useOverlayTriggerState({ isOpen, onOpenChange });
  const triggerRef = useRef<HTMLElement>(null);

  const { triggerProps, overlayProps } = useOverlayTrigger(
    { type: 'dialog' },
    state,
    triggerRef,
  );

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
        <PopoverPanel
          {...props}
          state={state}
          triggerRef={triggerRef}
          overlayProps={overlayProps}
        />
      )}
    </>
  );
}

Popover.displayName = 'Popover';
