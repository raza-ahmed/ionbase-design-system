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

export type ModalSize = 'sm' | 'md' | 'lg' | 'fullscreen';
export type ModalAlign = 'left' | 'center';

/** The close glyph from Figma's `Close` slot, inlined for the same reason
 *  Select's and PhoneInput's chevrons are: it is part of the component, not a
 *  slot a caller fills, and `ionbase-ui` deliberately does not depend on
 *  `ionbase-icons`. */
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

export interface ModalProps extends AriaModalOverlayProps {
  /** Whether the modal is shown. */
  isOpen?: boolean;
  /** Called with the next open state — `false` when the modal asks to close. */
  onOpenChange?: (isOpen: boolean) => void;
  /** Matches the Figma `Size` variant. */
  size?: ModalSize;
  /** Matches the Figma `Align` variant. */
  align?: ModalAlign;
  /** Required: the dialog's accessible name, wired via `aria-labelledby`. */
  title: React.ReactNode;
  /** Supporting copy under the title. */
  description?: React.ReactNode;
  /**
   * The featured slot above the title — an icon or an illustration. Rendered
   * inside a circular container that hugs it.
   */
  media?: React.ReactNode;
  /** Action row. Right-aligned when `align="left"`, centred when `"center"`. */
  footer?: React.ReactNode;
  /** Show the close button. Defaults to `true`. */
  showClose?: boolean;
  /** Accessible name for the close button. */
  closeLabel?: string;
  /** Body content. */
  children?: React.ReactNode;
  className?: string;
}

function ModalDialog(
  props: ModalProps & { state: ReturnType<typeof useOverlayTriggerState> },
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const {
    state,
    size = 'md',
    align = 'left',
    title,
    description,
    media,
    footer,
    showClose = true,
    closeLabel = 'Close dialog',
    children,
    className,
  } = props;

  const panelRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => panelRef.current!);

  /*
   * `useModalOverlay` supplies what makes this a modal rather than a styled
   * box: it traps focus inside the panel, marks everything outside it
   * `aria-hidden`, prevents the page behind from scrolling, and closes on
   * Escape and on an outside click. `useDialog` adds the dialog role and
   * moves focus in on open.
   */
  const { modalProps, underlayProps } = useModalOverlay(props, state, panelRef);
  const { dialogProps, titleProps } = useDialog({ role: 'dialog' }, panelRef);

  const closeRef = useRef<HTMLButtonElement>(null);
  const { buttonProps: closeButtonProps } = useButton(
    { onPress: () => state.close(), 'aria-label': closeLabel },
    closeRef,
  );

  const panelClassNames = [
    'ion-modal',
    `ion-modal--${size}`,
    `ion-modal--${align}`,
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div {...underlayProps} className="ion-modal__scrim">
      <div
        {...mergeProps(modalProps, dialogProps)}
        ref={panelRef}
        className={panelClassNames}
      >
        <div className="ion-modal__header">
          <div className="ion-modal__heading">
            {media && (
              <div className="ion-modal__media" aria-hidden="true">
                {media}
              </div>
            )}
            <h2 {...titleProps} className="ion-modal__title">
              {title}
            </h2>
            {description && (
              <p className="ion-modal__description">{description}</p>
            )}
          </div>
          {showClose && (
            <button
              {...closeButtonProps}
              ref={closeRef}
              type="button"
              className="ion-modal__close"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {children && <div className="ion-modal__body">{children}</div>}
        {footer && <div className="ion-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

const ModalDialogWithRef = forwardRef(ModalDialog);

/**
 * Modal — Figma `Modal` (792:1537).
 *
 * `Size` x `Align`, with the sections as props rather than variants. The panel
 * hugs its content at every size except `fullscreen`, which fills the viewport
 * and pushes the actions to the bottom edge.
 *
 * RENDERS NOTHING WHEN CLOSED, and mounts into a portal when open. Both come
 * from React Aria's `Overlay`, and both matter: a modal left in the tree while
 * closed is still focusable by keyboard, and one rendered inline inherits any
 * `overflow: hidden` or stacking context from wherever it was written.
 *
 * The scrim is part of this component in code, unlike in Figma — see the note
 * in modal.css.
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>((props, ref) => {
  const state = useOverlayTriggerState(props);

  if (!state.isOpen) return null;

  return (
    <Overlay>
      <ModalDialogWithRef {...props} state={state} ref={ref} />
    </Overlay>
  );
});

Modal.displayName = 'Modal';
