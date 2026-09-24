import React, { forwardRef } from 'react';
import { Badge, type BadgeIntent } from './Badge.js';
import { Skeleton } from './Skeleton.js';

/** Which direction of change is good news. */
export type StatTileGoodWhen = 'up' | 'down' | 'neutral';

/** How `change` is expressed. */
export type StatTileChangeUnit = 'percent' | 'points';

export interface StatGroupProps extends React.HTMLAttributes<HTMLDListElement> {
  /** StatTile elements. */
  children?: React.ReactNode;
}

export interface StatTileProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** What is being measured. Short: "Success rate", not a sentence. */
  label: string;
  /**
   * The figure, already formatted — "1.2k", "96.2%", "38s". Formatting is the
   * caller's: only it knows the locale, the precision and the unit.
   */
  value: React.ReactNode;
  /** Change against the comparison period. Omit when there is none. */
  change?: number;
  /**
   * `percent` for a relative change; `points` for a metric that is already a
   * percentage — 95% to 96% is +1 pt, and calling it +1.1% misreports it.
   */
  changeUnit?: StatTileChangeUnit;
  /**
   * Which direction is good news. `down` for costs, durations and queues;
   * `neutral` when a change is neither, so it is never coloured.
   */
  goodWhen?: StatTileGoodWhen;
  /** What `change` is measured against. */
  comparison?: string;
  /** Shows a placeholder for the value and change while data loads. */
  isLoading?: boolean;
}

const TrendUp = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M22 7l-8.5 8.5-5-5L2 17M16 7h6v6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrendDown = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M22 17l-8.5-8.5-5 5L2 7M16 17h6v-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * StatGroup — a row of StatTiles.
 *
 * A `<dl>`: each tile is a term (the label) and its description (the figure),
 * which is what a screen reader announces as a pair. The grid wraps on its own,
 * so four tiles are one row on a desktop and two on a phone with no breakpoint
 * in the caller's code.
 */
export const StatGroup = forwardRef<HTMLDListElement, StatGroupProps>(
  ({ className, children, ...rest }, ref) => (
    <dl
      {...rest}
      ref={ref}
      className={['ion-stat-group', className || ''].filter(Boolean).join(' ')}
    >
      {children}
    </dl>
  ),
);

StatGroup.displayName = 'StatGroup';

/**
 * StatTile — one headline figure, and how it moved.
 *
 * Promoted from the demo app, where it was built for the Overview KPI row and
 * survived three phases unchanged.
 *
 * GOOD AND BAD ARE NOT UP AND DOWN
 *
 * A rising median run time is bad news and a rising success rate is good, so
 * the colour comes from `goodWhen` and the direction together — never from the
 * sign alone. `neutral` never colours: a run count going up is not a verdict.
 * The verdict is also spoken, as visually hidden text after the change, so it
 * never rests on the badge's colour.
 *
 * The change is rounded BEFORE it is judged, so −0.04 reads "No change" rather
 * than a red "−0.0%".
 *
 * It must sit inside a StatGroup: the tile renders a `<dt>` and a `<dd>`, which
 * are only valid inside a `<dl>`.
 */
export const StatTile = forwardRef<HTMLDivElement, StatTileProps>(
  (
    {
      label,
      value,
      change,
      changeUnit = 'percent',
      goodWhen = 'up',
      comparison = 'vs previous period',
      isLoading = false,
      className,
      ...rest
    },
    ref,
  ) => {
    const rounded =
      change === undefined ? undefined : Number(change.toFixed(1));

    let intent: BadgeIntent = 'neutral';
    let icon: React.ReactNode;
    let text = 'No change';
    let verdict = '';
    if (rounded) {
      const up = rounded > 0;
      const good = goodWhen === 'neutral' ? null : up === (goodWhen === 'up');
      intent = good === null ? 'neutral' : good ? 'success' : 'error';
      icon = up ? <TrendUp /> : <TrendDown />;
      text = `${up ? '+' : '−'}${Math.abs(rounded).toFixed(1)}${
        changeUnit === 'percent' ? '%' : ' pts'
      }`;
      verdict = good === null ? '' : good ? ', better' : ', worse';
    }

    return (
      <div
        {...rest}
        ref={ref}
        aria-busy={isLoading || undefined}
        className={['ion-stat-tile', className || ''].filter(Boolean).join(' ')}
      >
        <dt className="ion-stat-tile__label">{label}</dt>
        <dd className="ion-stat-tile__body">
          {isLoading ? (
            <Skeleton
              variant="rect"
              width="60%"
              height="var(--type-h4-line-height)"
            />
          ) : (
            <>
              <span className="ion-stat-tile__value">{value}</span>
              {rounded !== undefined && (
                <span className="ion-stat-tile__change">
                  <Badge size="sm" intent={intent} icon={icon}>
                    {text}
                  </Badge>
                  {verdict && (
                    <span className="ion-visually-hidden">{verdict}</span>
                  )}
                  <span className="ion-stat-tile__comparison">
                    {comparison}
                  </span>
                </span>
              )}
            </>
          )}
        </dd>
      </div>
    );
  },
);

StatTile.displayName = 'StatTile';
