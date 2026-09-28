'use client';

import React, { useId, useRef, useState } from 'react';

export type SplitPaneOrientation = 'horizontal' | 'vertical';
export type SplitPaneCollapse = 'tablet' | 'mobile' | 'never';

export interface SplitPaneProps {
  /** The first pane: the start side, or the top. Its size is the value. */
  start: React.ReactNode;
  /** The second pane, which takes the rest. */
  end: React.ReactNode;
  /**
   * `horizontal` puts the panes side by side with a vertical divider;
   * `vertical` stacks them with a horizontal one. A vertical split needs a
   * height from its container.
   */
  orientation?: SplitPaneOrientation;
  /**
   * The divider's name, and so the resize control's: "Resize the run list".
   * It names what moving it changes — the first pane.
   */
  label: string;
  /** The first pane's share, in percent, for an uncontrolled split. Default 50. */
  defaultSize?: number;
  /** The first pane's share, in percent, controlled. Pair with `onSizeChange`. */
  size?: number;
  /** Fires with the new share, in percent, rounded to a whole number. */
  onSizeChange?: (size: number) => void;
  /** The smallest share the first pane can be given. Default 20. */
  minSize?: number;
  /** The largest share. Default 80. */
  maxSize?: number;
  /**
   * The breakpoint at and below which a side-by-side split stacks, and the
   * divider goes: `mobile` (767px) by default, `tablet` (1023px), or
   * `never`. Grid's breakpoints. A vertical split never collapses.
   */
  collapse?: SplitPaneCollapse;
  className?: string;
  style?: React.CSSProperties;
}

/** Arrow keys move the divider this many percent; with Shift, five times. */
const STEP = 2;

const clampTo = (min: number, max: number) => (n: number) =>
  Math.round(Math.min(max, Math.max(min, n)));

/**
 * SplitPane — two panes and a divider between them that a person moves.
 *
 * THE WINDOW-SPLITTER PATTERN
 *
 * The divider is a focusable `separator` whose value is the first pane's
 * share, 0 to 100, bounded by `minSize` and `maxSize`, and it controls that
 * pane (`aria-controls`). The arrow keys along its axis move it, Shift for
 * a bigger step; Home and End go to the bounds; a double-click, or Enter,
 * puts it back where it started. The same handle Table's column resize is.
 *
 * PERCENT, NOT PIXELS
 *
 * The share survives the window being resized, and the value a screen
 * reader announces means something without knowing the width.
 *
 * ONE COLUMN ON A PHONE
 *
 * Side by side, two panes on a phone are two unreadable strips. At the
 * `collapse` breakpoint they stack and the divider is removed — from the
 * tab order too, since `display: none` takes it out.
 */
export function SplitPane({
  start,
  end,
  orientation = 'horizontal',
  label,
  defaultSize = 50,
  size: sizeProp,
  onSizeChange,
  minSize = 20,
  maxSize = 80,
  collapse = 'mobile',
  className,
  style,
}: SplitPaneProps) {
  const clamp = clampTo(minSize, maxSize);
  const [inner, setInner] = useState(() => clamp(defaultSize));
  const size = sizeProp === undefined ? inner : clamp(sizeProp);
  const set = (next: number) => {
    const value = clamp(next);
    if (value === size) return;
    if (sizeProp === undefined) setInner(value);
    onSizeChange?.(value);
  };

  const startId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const horizontal = orientation === 'horizontal';

  const isRtl = () =>
    !!rootRef.current && getComputedStyle(rootRef.current).direction === 'rtl';

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? STEP * 5 : STEP;
    /*
     * The arrow moves the divider the way it points. Side by side in a
     * right-to-left page the first pane is on the right, so → shrinks it.
     */
    const grow = horizontal
      ? isRtl()
        ? 'ArrowLeft'
        : 'ArrowRight'
      : 'ArrowDown';
    const shrink = horizontal
      ? isRtl()
        ? 'ArrowRight'
        : 'ArrowLeft'
      : 'ArrowUp';
    if (e.key === grow) set(size + step);
    else if (e.key === shrink) set(size - step);
    else if (e.key === 'Home') set(minSize);
    else if (e.key === 'End') set(maxSize);
    else if (e.key === 'Enter') set(defaultSize);
    else return;
    e.preventDefault();
  };

  const shareAt = (e: React.PointerEvent) => {
    const box = rootRef.current!.getBoundingClientRect();
    if (!horizontal) return ((e.clientY - box.top) / box.height) * 100;
    const x = isRtl() ? box.right - e.clientX : e.clientX - box.left;
    return (x / box.width) * 100;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // No text selected across both panes while dragging.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    dragging.current = true;
    e.currentTarget.dataset.resizing = 'true';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) set(shareAt(e));
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    delete e.currentTarget.dataset.resizing;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={rootRef}
      className={[
        'ion-split-pane',
        `ion-split-pane--${orientation}`,
        horizontal && collapse !== 'never'
          ? `ion-split-pane--collapse-${collapse}`
          : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        { ...style, '--ion-split-pane-size': `${size}%` } as React.CSSProperties
      }
    >
      <div id={startId} className="ion-split-pane__pane ion-split-pane__start">
        {start}
      </div>
      <div
        role="separator"
        tabIndex={0}
        // The divider's own axis: side by side, it is a vertical line.
        aria-orientation={horizontal ? 'vertical' : 'horizontal'}
        aria-label={label}
        aria-controls={startId}
        aria-valuenow={size}
        aria-valuemin={minSize}
        aria-valuemax={maxSize}
        className="ion-split-pane__divider"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onDoubleClick={() => set(defaultSize)}
      />
      <div className="ion-split-pane__pane ion-split-pane__end">{end}</div>
    </div>
  );
}

SplitPane.displayName = 'SplitPane';
