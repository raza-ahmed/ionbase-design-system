'use client';

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useToolbar } from 'react-aria';

export type ToolbarOrientation = 'horizontal' | 'vertical';

export interface ToolbarProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'role'
> {
  /** Names the toolbar — "Bulk actions", "Formatting". Required, or `aria-labelledby`. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Which arrow keys move between controls. Horizontal: ← →; vertical: ↑ ↓. */
  orientation?: ToolbarOrientation;
  /** Buttons, MenuTriggers, a SegmentedControl, and a vertical Divider between groups. */
  children?: React.ReactNode;
}

/**
 * Arrow keys that belong to the control, not to the toolbar.
 *
 * `useToolbar` handles arrows in the capture phase, before the focused control
 * sees them. For a button that is right. For a text field it takes the caret
 * away — ← and → would jump to the next control instead of moving through the
 * text — and for a native <select>, a combobox or a slider it takes the value
 * away. Those keys are the control's, so the toolbar lets them through.
 */
function ownsArrowKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'reset', 'submit'].includes(
      target.type,
    );
  }
  const role = target.getAttribute('role');
  return (
    role === 'combobox' ||
    role === 'slider' ||
    role === 'spinbutton' ||
    role === 'textbox' ||
    role === 'radio' ||
    role === 'tab'
  );
}

const ARROWS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/**
 * Toolbar — a row of controls that act on one thing, reached as one stop.
 *
 * React Aria's `useToolbar` gives it `role="toolbar"` and `aria-orientation`,
 * arrow keys between its controls (mirrored in right-to-left), Tab that leaves
 * the whole toolbar rather than walking every button, and focus returned to the
 * control used last when Tab brings the user back. A toolbar inside a toolbar
 * becomes a `group`, so nesting one for grouping is safe.
 *
 * Every control keeps its own tab stop in the DOM — React Aria moves focus to
 * the first or last control on Tab and lets the browser take it from there —
 * so nothing here rewrites a child's `tabIndex`, and a control that mounts
 * later (the bulk actions appearing on selection) needs no registration.
 *
 * WHAT IT IS NOT FOR
 *
 * A filter bar. Tab leaves a toolbar in one press, so a search field inside one
 * strands the filters after it: Tab skips them and ← → belong to the caret.
 * That is WAI-ARIA's own caution about text fields in toolbars. A table's
 * search and filters stay ordinary tab stops; the toolbar is the row of
 * actions — the batch bar, a record's actions, an editor's formatting.
 */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(
  (props, forwardedRef) => {
    const {
      orientation = 'horizontal',
      className,
      children,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      onKeyDownCapture,
      ...rest
    } = props;
    const ref = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current!);

    const { toolbarProps } = useToolbar(
      {
        orientation,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
      },
      ref,
    );

    const handleKeyDownCapture = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDownCapture?.(e);
      if (ARROWS.has(e.key) && ownsArrowKeys(e.target)) return;
      toolbarProps.onKeyDownCapture?.(e);
    };

    return (
      <div
        {...rest}
        {...toolbarProps}
        ref={ref}
        onKeyDownCapture={handleKeyDownCapture}
        className={[
          'ion-toolbar',
          orientation === 'vertical' ? 'ion-toolbar--vertical' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    );
  },
);

Toolbar.displayName = 'Toolbar';
