'use client';

import React, { useRef } from 'react';
import { Overlay, usePopover, useDialog, mergeProps } from 'react-aria';
import type { OverlayTriggerState } from 'react-stately';

/*
 * The overlay both pickers open. Internal, like the calendar it holds.
 *
 * NOT `Popover`, and the difference is not laziness. `Popover` takes a trigger
 * element, clones a ref onto it and runs its own `useOverlayTriggerState`. The
 * pickers already have a state — `useDatePickerState` owns whether the calendar
 * is open, because it is the same object that owns the value and has to close
 * the overlay when a complete date arrives. Wrapping that in a second trigger
 * state would give the calendar two owners that disagree the first time a date
 * is picked with the keyboard.
 *
 * `Popover`'s chrome is wrong here too: a titled header with a close button
 * above a calendar that already has a month header and closes on selection.
 * What is shared is the mechanism, and that comes from `usePopover` rather than
 * from the component.
 */

interface CalendarPopoverProps {
  state: OverlayTriggerState;
  triggerRef: React.RefObject<HTMLElement | null>;
  /** `dialogProps` from `useDatePicker` / `useDateRangePicker`. */
  dialogProps: React.HTMLAttributes<HTMLElement>;
  children: React.ReactNode;
  className?: string;
}

/**
 * The panel, in its own component because it is mounted only while open.
 *
 * `useDialog` focuses the panel and resolves the title id in effects keyed on
 * the ref — effects that run when the component CALLING the hook mounts. Called
 * beside `useDatePickerState` in the picker, that moment is when the field
 * mounts, with the calendar not yet in the DOM: the dialog never takes focus,
 * so Escape never reaches it, and `aria-labelledby` is silently dropped. Same
 * split as `Popover` / `PopoverPanel` and `Drawer`, for the same reason.
 */
export function CalendarPopover({
  state,
  triggerRef,
  dialogProps,
  children,
  className,
}: CalendarPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const { popoverProps, underlayProps } = usePopover(
    {
      triggerRef,
      popoverRef,
      /*
       * Aligned to the START of the field rather than centred under it. The
       * calendar is much wider than a small date field and narrower than a wide
       * one, and a centred overlay would sit at a different offset in each —
       * which reads as a positioning bug rather than a choice. Anchored left,
       * the month grid and the first segment share an edge.
       */
      placement: 'bottom start',
      offset: 8,
    },
    state,
  );

  /*
   * MODAL, unlike Combobox's listbox, and this is the opposite call from the
   * one that file makes. A combobox must not move focus, because the user is
   * still typing into the input that drives the list. A calendar is the
   * opposite: the grid IS the input while it is open, arrow keys belong to it,
   * and the date field behind it must not be receiving the same keystrokes.
   * `usePopover` contains focus and hides the rest of the page from assistive
   * tech for exactly this case.
   */
  const { dialogProps: innerDialogProps } = useDialog({}, popoverRef);

  return (
    <Overlay>
      {/*
        Transparent, and only there to catch the outside click — the page stays
        visible because the field being edited is part of the context. Modal's
        scrim is visible because a modal replaces the page; this does not.
      */}
      <div {...underlayProps} className="ion-calendar-popover__underlay" />
      <div
        {...mergeProps(popoverProps, innerDialogProps, dialogProps)}
        ref={popoverRef}
        className={['ion-calendar-popover', className]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </Overlay>
  );
}

CalendarPopover.displayName = 'CalendarPopover';
