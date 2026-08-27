import React, { forwardRef } from 'react';

export interface StreamingTextProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** The text so far. Re-render with more of it; this component appends nothing. */
  children?: React.ReactNode;
  /** More is still arriving. Shows the cursor and marks the region busy. */
  isStreaming?: boolean;
  /**
   * Rows of height to hold while the text is short, so the page below does not
   * climb the screen as tokens arrive. Costs blank space at the start and buys
   * a layout that does not move under a reader.
   */
  minLines?: number;
  /** Accessible name for the region. */
  label?: string;
  /** Hide the trailing cursor. The text still marks itself busy. */
  hideCursor?: boolean;
}

/**
 * StreamingText — model output arriving a token at a time.
 *
 * IT IS NOT A LIVE REGION, AND THAT IS THE WHOLE DESIGN
 *
 * The obvious implementation — `aria-live="polite"` on the container — is the
 * one that makes a screen reader unusable. Every token mutation queues an
 * announcement, so the user hears the answer re-read, stuttered, dozens of
 * times, and cannot get ahead of it. `aria-live="off"` is not an oversight
 * here; it is the accessible choice.
 *
 * What it does instead: `aria-busy` while streaming, so assistive tech knows
 * the region is unsettled and can wait. The text is ordinary readable content
 * throughout — a screen-reader user navigates into it whenever they want,
 * exactly like sighted users reading ahead of the cursor.
 *
 * ANNOUNCING COMPLETION IS THE CALLER'S CALL, not this component's. Some
 * surfaces want "response complete"; a chat with ten turns on screen does not
 * want ten of them. Render your own `role="status"` when you want it.
 *
 * THE HEIGHT IS RESERVED, NOT ANIMATED. `minLines` holds space in `lh` units so
 * the content below stays still. A container that grows token by token drags
 * the whole page, which is worse for someone using magnification than the wait.
 *
 * The cursor is CSS and `aria-hidden`. It stops blinking under
 * `prefers-reduced-motion` — a blinking element is a WCAG 2.3.1 concern and a
 * genuine problem for some vestibular and attention conditions.
 */
export const StreamingText = forwardRef<HTMLDivElement, StreamingTextProps>(
  (
    {
      children,
      isStreaming = false,
      minLines,
      label,
      hideCursor = false,
      className,
      style,
      ...rest
    },
    ref,
  ) => (
    <div
      {...rest}
      ref={ref}
      aria-busy={isStreaming || undefined}
      aria-live="off"
      aria-label={label}
      role={label ? 'region' : undefined}
      data-streaming={isStreaming || undefined}
      style={
        minLines
          ? ({
              '--ion-streaming-min-lines': minLines,
              ...style,
            } as React.CSSProperties)
          : style
      }
      className={[
        'ion-streaming-text',
        minLines ? 'ion-streaming-text--reserved' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
      {isStreaming && !hideCursor && (
        <span className="ion-streaming-text__cursor" aria-hidden="true" />
      )}
    </div>
  ),
);

StreamingText.displayName = 'StreamingText';
