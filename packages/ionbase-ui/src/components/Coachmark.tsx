'use client';

import React, { useId, useLayoutEffect, useReducer, useRef } from 'react';
import {
  Overlay,
  mergeProps,
  useButton,
  useDialog,
  useOverlayPosition,
} from 'react-aria';
import type { Placement } from 'react-aria';

export type CoachmarkPlacement = 'top' | 'bottom' | 'start' | 'end';

export interface CoachmarkProps {
  /**
   * What the coachmark points at: an element's `id`, or a ref to it. Ids let
   * a tour be written as data, with no refs threaded through the page.
   */
  target: string | React.RefObject<HTMLElement | null>;
  /** Names the coachmark — it is a dialog, and this is its label. */
  title: string;
  /** What to know about the target. Linked as the dialog's description. */
  children?: React.ReactNode;
  /**
   * Which side of the target it sits on. Logical: `start` is the left in a
   * left-to-right page and the right in a right-to-left one. React Aria
   * flips it when there is no room.
   */
  placement?: CoachmarkPlacement;
  /** Shown or not. Defaults to shown: render it when a person asks for it. */
  isOpen?: boolean;
  /** The close button and Escape. Without it there is no close button. */
  onClose?: () => void;
  /** Actions under the body, end-aligned: a tour's Back and Next. */
  footer?: React.ReactNode;
  /** Where this is in a sequence — "2 of 4" — at the start of the footer. */
  progress?: string;
  /** The close button's name. Default "Close". */
  closeLabel?: string;
  className?: string;
}

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

const TARGET_ATTR = 'data-ion-coachmark-target';

const resolve = (target: CoachmarkProps['target']) =>
  typeof target === 'string'
    ? typeof document === 'undefined'
      ? null
      : document.getElementById(target)
    : target.current;

/** One placement, in its own component so `useDialog` runs when it mounts. */
function CoachmarkPanel({
  target,
  title,
  children,
  placement = 'bottom',
  onClose,
  footer,
  progress,
  closeLabel = 'Close',
  className,
}: Omit<CoachmarkProps, 'isOpen'>) {
  const panelRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const bodyId = useId();
  /*
   * Found during render, not in an effect: it is on the page already when
   * someone asks, and `useDialog` focuses the panel as it mounts — a panel
   * still hidden while an effect looked for its target could not take it.
   */
  const el = resolve(target);
  targetRef.current = el;

  useLayoutEffect(() => {
    if (!el) return;
    // Marked while it is pointed at, for the ring round it, and brought into
    // view: a coachmark about something off screen points at nothing.
    el.setAttribute(TARGET_ATTR, '');
    el.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    return () => el.removeAttribute(TARGET_ATTR);
  }, [el]);

  const {
    overlayProps,
    arrowProps,
    placement: side,
  } = useOverlayPosition({
    targetRef,
    overlayRef: panelRef,
    placement: placement as Placement,
    offset: 12,
    isOpen: !!el,
    shouldFlip: true,
    containerPadding: 16,
  });

  /*
   * Then the coachmark itself, once it has a position: a target taller than
   * the screen, centred, left the callout above the top of the window. A
   * frame later, after React Aria's own updates and the focus move; once per
   * placement, so a reader who scrolls away is not pulled back.
   */
  const placed =
    overlayProps.style?.top !== undefined ||
    overlayProps.style?.bottom !== undefined;
  const scrolled = useRef(false);
  useLayoutEffect(() => {
    if (!placed || scrolled.current) return;
    scrolled.current = true;
    const frame = requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView?.({
        block: 'nearest',
        inline: 'nearest',
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [placed]);

  /*
   * React Aria caps the height at the room it measured beside the target —
   * 0px above one whose top is off screen, which collapsed the panel to its
   * padding. The body is a sentence or two; it scrolls into view instead.
   * Cleared on the element after each placement, because React Aria writes
   * max-height there itself while it measures, where no prop reaches it.
   */
  useLayoutEffect(() => {
    if (panelRef.current) panelRef.current.style.maxHeight = 'none';
  });

  // A dialog, named by the title and described by the body. `useDialog`
  // moves focus to it when it mounts: it appears because someone asked.
  const { dialogProps, titleProps } = useDialog(
    { 'aria-describedby': children ? bodyId : undefined },
    panelRef,
  );

  const closeRef = useRef<HTMLButtonElement>(null);
  const { buttonProps: closeButtonProps } = useButton(
    { onPress: () => onClose?.(), 'aria-label': closeLabel },
    closeRef,
  );

  // Nothing to point at — gone, or not rendered at this width — is nothing
  // to show. A Tour skips the step before it gets here.
  if (!el) return null;

  return (
    <div
      {...mergeProps(dialogProps, overlayProps, {
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Escape' && onClose) {
            e.stopPropagation();
            onClose();
          }
        },
      })}
      ref={panelRef}
      // Not modal: the page behind stays usable, and nothing is hidden from
      // assistive tech. It is a pointer, not a task.
      aria-modal={undefined}
      data-placement={side ?? undefined}
      className={['ion-coachmark', className || ''].filter(Boolean).join(' ')}
    >
      <div
        {...arrowProps}
        className="ion-coachmark__arrow"
        aria-hidden="true"
      />
      <div className="ion-coachmark__header">
        <p {...titleProps} className="ion-coachmark__title">
          {title}
        </p>
        {onClose && (
          <button
            {...closeButtonProps}
            ref={closeRef}
            type="button"
            className="ion-coachmark__close"
          >
            <CloseIcon />
          </button>
        )}
      </div>
      {children && (
        <div id={bodyId} className="ion-coachmark__body">
          {children}
        </div>
      )}
      {(progress || footer) && (
        <div className="ion-coachmark__footer">
          {progress && (
            <span className="ion-coachmark__progress">{progress}</span>
          )}
          {footer && <div className="ion-coachmark__actions">{footer}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * Coachmark — a callout pointing at one thing on the page, to say what it is
 * or what changed. Anchored to its target, which is ringed while it shows.
 * Several in a row are a Tour.
 *
 * ONLY WHEN ASKED
 *
 * It takes focus when it appears, so it must appear because someone asked:
 * a "Take the tour" button, a "What's new?" link. Opened on page load, it
 * would pull a keyboard or screen-reader user out of whatever they came to
 * do. To tell people something changed without being asked, use a Banner.
 *
 * NOT MODAL
 *
 * The page behind stays usable and is not hidden from assistive tech: this
 * points at the page, and the page is the point. Focus is not trapped; it
 * goes back where it was when the coachmark closes, and Escape closes it.
 */
export function Coachmark({ isOpen = true, ...props }: CoachmarkProps) {
  /*
   * A target rendered in the same commit as the coachmark — a press that
   * shows a section and points at it — is not in the document yet while
   * this renders. Looked for again once it is, and the panel mounts then,
   * so `useDialog` still focuses it as it appears.
   */
  const [, recheck] = useReducer((n: number) => n + 1, 0);
  const found = isOpen && !!resolve(props.target);
  useLayoutEffect(() => {
    if (isOpen && !found && resolve(props.target)) recheck();
  });
  if (!isOpen || !found) return null;
  // i18n-exempt: a React key, never shown or read
  const key = `${typeof props.target === 'string' ? props.target : 'ref'}:${props.title}`;
  return (
    <Overlay>
      {/* Keyed by what it points at, so a new target is a new dialog —
          announced and focused — inside the same Overlay, whose FocusScope
          gives focus back once, when the last one closes. */}
      <CoachmarkPanel key={key} {...props} />
    </Overlay>
  );
}

Coachmark.displayName = 'Coachmark';
