import React, { forwardRef } from 'react';

/**
 * Chart parts for charts drawn with visx.
 *
 * IonBase does not draw charts, and does not depend on visx. visx owns scales,
 * shapes and layout; these own what a chart looks like and the two pieces
 * every chart needs and no charting library supplies — a tooltip panel and a
 * legend. See `styles/chart.css` for the classes, and why they are classes.
 */

/** Which of `--chart-1…8` a series takes. Series are coloured in order. */
export type ChartSeries = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** The class that colours a series: its line, bar, area, points and swatch. */
export const chartSeriesClass = (series: ChartSeries) =>
  `ion-chart-series-${series}`;

/**
 * Spread onto visx `AxisLeft` / `AxisBottom` / `Axis`. Themes the axis line,
 * tick marks and tick labels through `chart.css`, overriding the `#222` visx
 * writes as attributes.
 *
 *   <AxisBottom scale={x} top={h} {...chartAxisProps} />
 *
 * Passing your own `tickLabelProps` replaces this one — keep
 * `className: 'ion-chart__tick'` in it.
 */
export const chartAxisProps = {
  axisLineClassName: 'ion-chart__axis-line',
  tickClassName: 'ion-chart__axis-tick',
  labelClassName: 'ion-chart__axis-label',
  tickLabelProps: { className: 'ion-chart__tick' },
};

/**
 * Spread onto visx `GridRows` / `GridColumns`. Gridlines take `border/subtle`,
 * the quietest rule, so they sit behind the data rather than competing with it.
 */
export const chartGridProps = {
  className: 'ion-chart__grid',
};

/**
 * Spread onto visx `Tooltip` / `TooltipWithBounds` / `TooltipInPortal`, with a
 * `ChartTooltip` inside. visx then only positions it; the panel is ours.
 */
export const chartTooltipProps = {
  unstyled: true,
  applyPositionStyle: true,
};

const cx = (...c: (string | false | undefined)[]) =>
  c.filter(Boolean).join(' ');

/* ----------------------------------------------------------- ChartTooltip */

export interface ChartTooltipRow {
  /** The series or measure, e.g. "Success rate". */
  label: React.ReactNode;
  /** Already formatted — the tooltip cannot know the unit or precision. */
  value: React.ReactNode;
  /** Shows the series' swatch beside the label, matching the legend. */
  series?: ChartSeries;
}

export interface ChartTooltipProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  /** What the pointer is over — usually the x value, e.g. a date. */
  title?: React.ReactNode;
  /** One row per series at that point. */
  rows?: ChartTooltipRow[];
  /** Free content after the rows, for anything that is not label/value. */
  children?: React.ReactNode;
}

/**
 * ChartTooltip — the panel that shows the values under the pointer.
 *
 * Put it inside visx's Tooltip with `chartTooltipProps`, so visx places it and
 * this draws it: raised, rimmed and shadowed like Popover and Toast.
 *
 * IT IS NOT THE ACCESSIBLE WAY TO THE DATA. It appears on hover, so a keyboard
 * or screen-reader user never sees it. Every chart still needs a text summary
 * and the values in a table (visually hidden is fine) — the tooltip is a
 * convenience for pointer users, never the only route to a number.
 */
export const ChartTooltip = forwardRef<HTMLDivElement, ChartTooltipProps>(
  ({ title, rows, children, className, ...rest }, ref) => (
    <div {...rest} ref={ref} className={cx('ion-chart-tooltip', className)}>
      {title != null && <div className="ion-chart-tooltip__title">{title}</div>}
      {rows && rows.length > 0 && (
        <dl className="ion-chart-tooltip__rows">
          {rows.map((row, i) => (
            <div key={i} className="ion-chart-tooltip__row">
              <dt
                className={cx(
                  'ion-chart-tooltip__label',
                  row.series && chartSeriesClass(row.series),
                )}
              >
                {row.series && (
                  <span className="ion-chart-swatch" aria-hidden="true" />
                )}
                {row.label}
              </dt>
              <dd className="ion-chart-tooltip__value">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </div>
  ),
);

ChartTooltip.displayName = 'ChartTooltip';

/* ------------------------------------------------------------ ChartLegend */

export type ChartLegendShape = 'square' | 'line';

export interface ChartLegendItem {
  label: React.ReactNode;
  series: ChartSeries;
}

export interface ChartLegendProps extends Omit<
  React.HTMLAttributes<HTMLUListElement>,
  'children'
> {
  /** One per series, in the order the series are drawn. */
  items: ChartLegendItem[];
  /** `square` for bars and areas, `line` for line charts. */
  shape?: ChartLegendShape;
}

/**
 * ChartLegend — which colour is which series.
 *
 * Colour alone never identifies a series (SC 1.4.1), so any chart with more
 * than one series needs this, or direct labels on the lines. The swatch reads
 * the same `--chart-<n>` as the series itself, through `chartSeriesClass`, so
 * the two cannot drift apart.
 */
export const ChartLegend = forwardRef<HTMLUListElement, ChartLegendProps>(
  ({ items, shape = 'square', className, ...rest }, ref) => (
    <ul {...rest} ref={ref} className={cx('ion-chart-legend', className)}>
      {items.map((item, i) => (
        <li
          key={i}
          className={cx(
            'ion-chart-legend__item',
            chartSeriesClass(item.series),
          )}
        >
          <span
            className={cx(
              'ion-chart-swatch',
              shape === 'line' && 'ion-chart-swatch--line',
            )}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  ),
);

ChartLegend.displayName = 'ChartLegend';
