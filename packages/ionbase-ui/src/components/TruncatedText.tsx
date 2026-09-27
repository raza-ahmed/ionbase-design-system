'use client';

import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { Button } from './Button.js';
import { Tooltip, type TooltipPlacement } from './Tooltip.js';

export type TruncatedTextOverflow = 'tooltip' | 'expand';

export interface TruncatedTextProps {
  /**
   * The whole text. Plain text only: it is what the tooltip shows, and a
   * link or a button inside a cut line would be cut with it.
   */
  children: string;
  /** Lines shown before the text is cut. Default 1. */
  lines?: number;
  /**
   * How the rest is reached once the text is cut.
   *
   * `tooltip` — the cut text becomes a tab stop and shows the whole text on
   * hover and on focus. For short text in a narrow place: a table cell, a
   * card's subtitle.
   *
   * `expand` — a Show more button below it opens the text in place. For a
   * paragraph, which a tooltip is too small to hold.
   */
  overflow?: TruncatedTextOverflow;
  /** `expand` only. Default "Show more". */
  showMoreLabel?: string;
  /** `expand` only. Default "Show less". */
  showLessLabel?: string;
  /** `tooltip` only: where the tooltip sits. Default `top`. */
  placement?: TooltipPlacement;
  className?: string;
}

/**
 * TruncatedText — long text cut to its space, with the whole of it still
 * reachable.
 *
 * NOT HOVER ONLY. A `title` attribute, or a tooltip on hover, leaves the rest
 * of the text to mouse users. Here a cut line is also a tab stop that opens
 * the same tooltip on focus, and a cut paragraph has a real Show more button.
 *
 * ONLY WHEN IT IS CUT. It measures itself, and while the text fits it is
 * plain text: no tab stop, no tooltip, no button. A narrower window can cut
 * it later; it measures again when its size changes.
 *
 * THE WHOLE TEXT IS ALWAYS THERE. It is cut by CSS, not by dropping
 * characters, so a screen reader reads all of it, find-in-page finds it, and
 * a copy copies it. The tooltip repeats text already read, so it is kept out
 * of the accessible description rather than read twice.
 *
 * IT INHERITS THE FONT. It sits inside whatever sets the type — a caption, a
 * table cell — and takes its size, weight and colour.
 */
export const TruncatedText = forwardRef<HTMLSpanElement, TruncatedTextProps>(
  (
    {
      children,
      lines = 1,
      overflow = 'tooltip',
      showMoreLabel = 'Show more',
      showLessLabel = 'Show less',
      placement,
      className,
    },
    ref,
  ) => {
    const textRef = useRef<HTMLSpanElement>(null);
    const textId = useId();
    const [isCut, setCut] = useState(false);
    const [isExpanded, setExpanded] = useState(false);

    useEffect(() => {
      const el = textRef.current;
      // Expanded, nothing is cut; the last measure stands, so Show less stays.
      if (!el || isExpanded) return;
      const measure = () =>
        setCut(
          el.scrollWidth > el.clientWidth ||
            // A pixel of rounding in the line box is not a cut line.
            el.scrollHeight > el.clientHeight + 1,
        );
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }, [children, lines, isExpanded]);

    const isTooltip = overflow === 'tooltip';
    const text = (
      <span
        ref={textRef}
        id={textId}
        className="ion-truncated__text"
        data-expanded={isExpanded || undefined}
        tabIndex={isTooltip && isCut ? 0 : undefined}
      >
        {children}
      </span>
    );

    return (
      <span
        ref={ref}
        className={[
          'ion-truncated',
          lines > 1 ? 'ion-truncated--lines' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          lines > 1
            ? ({ '--ion-truncated-lines': lines } as React.CSSProperties)
            : undefined
        }
      >
        {isTooltip ? (
          <Tooltip
            label={children}
            placement={placement}
            isDisabled={!isCut}
            describesTrigger={false}
          >
            {text}
          </Tooltip>
        ) : (
          text
        )}
        {!isTooltip && isCut && (
          <Button
            className="ion-truncated__toggle"
            variant="tertiary"
            size="sm"
            aria-expanded={isExpanded}
            aria-controls={textId}
            onPress={() => setExpanded((open) => !open)}
          >
            {isExpanded ? showLessLabel : showMoreLabel}
          </Button>
        )}
      </span>
    );
  },
);

TruncatedText.displayName = 'TruncatedText';
