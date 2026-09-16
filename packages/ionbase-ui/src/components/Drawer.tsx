'use client';

import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  Overlay,
  useModalOverlay,
  useDialog,
  useButton,
  mergeProps,
} from 'react-aria';
import { useOverlayTriggerState } from 'react-stately';
import type { AriaModalOverlayProps } from 'react-aria';

export type DrawerPlacement = 'start' | 'end' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg';

export interface DrawerProps extends AriaModalOverlayProps {
  /** Whether the drawer is shown. */
  isOpen?: boolean;
  /** Called with the next open state — `false` when the drawer asks to close. */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Which edge it enters from. `start` and `end` follow writing direction, so
   * a right-hand drawer in English is a left-hand one in Arabic without a
   * second variant.
   */
  placement?: DrawerPlacement;
  size?: DrawerSize;
  /** Required: the dialog's accessible name, wired via `aria-labelledby`. */
  title: React.ReactNode;
  /** Supporting copy under the title. */
  description?: React.ReactNode;
  /** Action row, pinned to the bottom edge. */
  footer?: React.ReactNode;
  showClose?: boolean;
  closeLabel?: string;
  children?: React.ReactNode;
  className?: string;
}

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * The panel. Mounted only while open, which is what makes the hooks work.
 *
 * `useDialog` resolves the title id and moves focus in effects keyed on the
 * panel ref — effects that run when the component CALLING them mounts. Called
 * beside `useOverlayTriggerState` in `Drawer` below, that moment would be when
 * the trigger mounts, with this panel not yet in the DOM: no `aria-labelledby`,
 * and focus never entering the drawer, so Escape never reaches the key handler.
 * Silent in every case. AGENTS.md records the same split for Modal and Popover.
 */
function DrawerDialog(
  props: DrawerProps & { state: ReturnType<typeof useOverlayTriggerState> },
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const {
    state,
    placement = 'end',
    size = 'md',
    title,
    description,
    footer,
    showClose = true,
    closeLabel = 'Close drawer',
    children,
    className,
  } = props;

  const panelRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => panelRef.current!);

  const { modalProps, underlayProps } = useModalOverlay(props, state, panelRef);
  const { dialogProps, titleProps } = useDialog({ role: 'dialog' }, panelRef);

  const closeRef = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(
    { onPress: () => state.close(), 'aria-label': closeLabel },
    closeRef,
  );

  const panelClassNames = [
    'ion-drawer',
    `ion-drawer--${placement}`,
    `ion-drawer--${size}`,
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div {...underlayProps} className="ion-drawer__scrim">
      <div
        {...mergeProps(modalProps, dialogProps)}
        ref={panelRef}
        className={panelClassNames}
      >
        <div className="ion-drawer__header">
          <div className="ion-drawer__heading">
            <h2 {...titleProps} className="ion-drawer__title">
              {title}
            </h2>
            {description && (
              <p className="ion-drawer__description">{description}</p>
            )}
          </div>
          {showClose && (
            <button
              {...buttonProps}
              ref={closeRef}
              type="button"
              className="ion-drawer__close"
            >
              <CloseGlyph />
            </button>
          )}
        </div>

        {children && <div className="ion-drawer__body">{children}</div>}
        {footer && <div className="ion-drawer__footer">{footer}</div>}
      </div>
    </div>
  );
}

const DrawerDialogWithRef = forwardRef(DrawerDialog);

/**
 * Drawer — a modal panel anchored to an edge.
 *
 * WHY IT IS A MODAL AND NOT A SIDEBAR
 *
 * It takes focus, traps it, closes on Escape and on an outside click, and marks
 * the rest of the page inert — all of `Modal`'s behaviour, differing only in
 * where the panel sits and how it enters. A persistent side panel that does not
 * do those things is layout, not a drawer, and belongs in the page rather than
 * in an overlay.
 *
 * WHEN TO REACH FOR MODAL INSTEAD
 *
 * A drawer suits work that is long or list-shaped — filters, a record's detail,
 * a sequence of settings — because an edge panel can be tall without becoming a
 * square that fights the viewport. A decision, especially a destructive one,
 * belongs in a Modal: it is centred, it is smaller, and it does not invite
 * scrolling past the thing being confirmed.
 *
 * RENDERS NOTHING WHEN CLOSED, and portals when open, for the reasons recorded
 * on Modal: a closed overlay left in the tree is still keyboard-focusable, and
 * an inline one inherits whatever `overflow` and stacking context surrounds it.
 */
export const Drawer = forwardRef<HTMLDivElement, DrawerProps>((props, ref) => {
  const state = useOverlayTriggerState(props);

  if (!state.isOpen) return null;

  return (
    <Overlay>
      <DrawerDialogWithRef {...props} state={state} ref={ref} />
    </Overlay>
  );
});

Drawer.displayName = 'Drawer';
