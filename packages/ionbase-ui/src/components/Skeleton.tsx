import React, { forwardRef } from 'react';

export type SkeletonVariant = 'text' | 'circle' | 'rect';

export interface SkeletonProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  variant?: SkeletonVariant;
  /** Any CSS length. Defaults to filling the width available. */
  width?: string;
  /** Any CSS length. `text` derives its height from the line box instead. */
  height?: string;
  /** `text` only: how many lines to draw. The last is drawn short. */
  lines?: number;
}

/**
 * Skeleton — the shape of content that has not arrived.
 *
 * IT IS HIDDEN FROM ASSISTIVE TECHNOLOGY, ALWAYS, AND THAT IS THE WHOLE POINT
 *
 * A skeleton is a picture of content, and a screen reader cannot use a picture
 * of content. Announcing it produces a stream of empty boxes between the user
 * and the thing they asked for. So every skeleton is `aria-hidden`, with no way
 * to opt out — a prop for that would only ever be used by mistake.
 *
 * WHICH MEANS THE CALLER OWES THE ANNOUNCEMENT, AND THIS COMPONENT CANNOT DO IT
 *
 * Hiding the placeholder is only half an answer: something still has to tell a
 * screen-reader user that the region is loading. That belongs on the region
 * being replaced — `aria-busy="true"` while it loads — because only the caller
 * knows where that region starts and ends. `Spinner` is the other half when the
 * wait deserves an announcement of its own.
 *
 *   <section aria-busy={isLoading}>
 *     {isLoading ? <Skeleton lines={3} /> : <Rows data={data} />}
 *   </section>
 *
 * This is the one component in the system whose correct use REQUIRES something
 * of the caller that the type system cannot check, which is why it is stated
 * here, in the contract, and in the story.
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', width, height, lines = 1, className, ...rest }, ref) => {
    const classNames = [
      'ion-skeleton',
      `ion-skeleton--${variant}`,
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    // Lengths travel as custom properties rather than inline width/height, so a
    // caller never writes a raw value into a style attribute the lint rules
    // read. See ProgressBar for the same trade.
    const style = {
      ...(width ? { '--ion-skeleton-width': width } : {}),
      ...(height ? { '--ion-skeleton-height': height } : {}),
    } as React.CSSProperties;

    if (variant === 'text' && lines > 1) {
      return (
        <div
          {...rest}
          ref={ref}
          aria-hidden="true"
          className="ion-skeleton-group"
          style={style}
        >
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className={`${classNames}${
                i === lines - 1 ? ' ion-skeleton--last' : ''
              }`}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        {...rest}
        ref={ref}
        aria-hidden="true"
        className={classNames}
        style={style}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
