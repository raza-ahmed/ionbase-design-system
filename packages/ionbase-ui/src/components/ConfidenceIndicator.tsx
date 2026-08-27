import React, { forwardRef } from 'react';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface ConfidenceIndicatorProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  'children'
> {
  level: ConfidenceLevel;
  /**
   * What the level is based on. REQUIRED, and the reason this component exists
   * rather than a coloured dot: a confidence with no stated basis is a number
   * the reader has no way to weigh. "3 of 4 sources agree", "no matching
   * records found", "single unverified source".
   */
  basis: string;
  /** Override the level's word. Keep it a word, not a percentage. */
  label?: string;
}

const LEVEL_TEXT: Record<ConfidenceLevel, string> = {
  low: 'Low confidence',
  medium: 'Medium confidence',
  high: 'High confidence',
};

/**
 * ConfidenceIndicator — how much to trust the thing next to it.
 *
 * THERE IS NO PERCENTAGE PROP, AND THERE WILL NOT BE ONE
 *
 * "87% confident" reads as a measurement. Almost nowhere is it one: it is
 * usually a softmax score, a heuristic, or a number a model produced about
 * itself — none of which are calibrated probabilities, and all of which invite
 * a reader to treat two digits of precision as real. Three levels cannot
 * overclaim in that way.
 *
 * `basis` IS REQUIRED FOR THE SAME REASON. A level with nothing behind it is
 * decoration that changes behaviour: people act on "high confidence" whether or
 * not anything justifies it. Making the justification a required prop is the
 * only enforcement available here, and it is a type error rather than a policy
 * — which is the strongest kind this system can offer.
 *
 * It renders as text plus a three-bar meter, never the meter alone. The bars
 * differ in filled COUNT, not only in colour, so the reading survives greyscale
 * and forced-colours mode.
 */
export const ConfidenceIndicator = forwardRef<
  HTMLSpanElement,
  ConfidenceIndicatorProps
>(({ level, basis, label, className, ...rest }, ref) => {
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  return (
    <span
      {...rest}
      ref={ref}
      data-level={level}
      className={['ion-confidence', `ion-confidence--${level}`, className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <span className="ion-confidence__meter" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={[
              'ion-confidence__bar',
              i < filled ? 'ion-confidence__bar--on' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </span>
      <span className="ion-confidence__label">
        {label ?? LEVEL_TEXT[level]}
      </span>
      <span className="ion-confidence__basis">{basis}</span>
    </span>
  );
});

ConfidenceIndicator.displayName = 'ConfidenceIndicator';
