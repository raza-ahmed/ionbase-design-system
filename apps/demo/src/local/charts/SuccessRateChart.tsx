import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { useParentSize } from '@visx/responsive';
import { scaleLinear, scaleUtc } from '@visx/scale';
import { Bar, Line, LinePath } from '@visx/shape';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import {
  ChartTooltip,
  chartAxisProps,
  chartGridProps,
  chartSeriesClass,
  chartTooltipProps,
} from 'ionbase-ui';

import { formatDay, type IsoDay } from '../../lib/dates';

/**
 * Drawn with visx, styled by IonBase: `chartAxisProps` and `chartGridProps`
 * theme the axes and gridlines, the series takes `chartSeriesClass`, and the
 * hover panel is `ChartTooltip`. The tooltip is a convenience for a pointer —
 * the caption and the hidden table below are how everyone else reads it.
 */
const TARGET = 95;
const MARGIN = { top: 12, right: 28, bottom: 28, left: 40 };
const HEIGHT = 220;

interface Point {
  day: IsoDay;
  rate: number;
}

const dateOf = (p: Point) => new Date(Date.parse(p.day));

export function SuccessRateChart({ data }: { data: Point[] }) {
  const mean = data.reduce((a, p) => a + p.rate, 0) / data.length;
  const lowest = data.reduce((lo, p) => (p.rate < lo.rate ? p : lo), data[0]);
  const below = data.filter((p) => p.rate < TARGET).length;

  // A hook, not <ParentSize>: in visx 4 ParentSize draws inside an absolutely
  // positioned box, so a container without a fixed height clips the chart to
  // nothing.
  const { parentRef, width } = useParentSize({ debounceTime: 50 });
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = scaleUtc({
    domain: [dateOf(data[0]), dateOf(data[data.length - 1])],
    range: [0, innerWidth],
  });
  const floor = Math.min(90, Math.floor(lowest.rate / 5) * 5);
  const y = scaleLinear({
    domain: [floor, 100],
    range: [innerHeight, 0],
  });
  const yTicks = y.ticks(4);

  const {
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
  } = useTooltip<Point>();
  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const at = x.invert(px).getTime();
    const p = data.reduce((best, q) =>
      Math.abs(dateOf(q).getTime() - at) < Math.abs(dateOf(best).getTime() - at)
        ? q
        : best,
    );
    showTooltip({
      tooltipData: p,
      tooltipLeft: MARGIN.left + x(dateOf(p)),
      tooltipTop: MARGIN.top + y(p.rate),
    });
  };

  return (
    <figure className="ion-chart">
      <div ref={parentRef} style={{ position: 'relative' }}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} aria-hidden="true">
            <Group left={MARGIN.left} top={MARGIN.top}>
              <GridRows
                scale={y}
                width={innerWidth}
                tickValues={yTicks}
                {...chartGridProps}
              />
              <Line
                className="ion-chart__reference"
                from={{ x: 0, y: y(TARGET) }}
                to={{ x: innerWidth, y: y(TARGET) }}
              />
              <text
                className="ion-chart__reference-label"
                x={4}
                y={y(TARGET) - 6}
              >
                Target {TARGET}%
              </text>
              {tooltipData && (
                <Line
                  className="ion-chart__crosshair"
                  from={{ x: x(dateOf(tooltipData)), y: 0 }}
                  to={{ x: x(dateOf(tooltipData)), y: innerHeight }}
                />
              )}
              <g className={chartSeriesClass(1)}>
                <LinePath<Point>
                  className="ion-chart__line"
                  data={data}
                  x={(p) => x(dateOf(p))}
                  y={(p) => y(p.rate)}
                  curve={curveMonotoneX}
                />
                {data.map((p) => (
                  <circle
                    key={p.day}
                    className={
                      p.rate < TARGET
                        ? `ion-chart__point ion-chart__point--active ${chartSeriesClass(7)}`
                        : p === tooltipData
                          ? 'ion-chart__point ion-chart__point--active'
                          : 'ion-chart__point'
                    }
                    cx={x(dateOf(p))}
                    cy={y(p.rate)}
                    r={p === tooltipData ? 4 : 3}
                  />
                ))}
              </g>
              <AxisLeft
                scale={y}
                tickValues={yTicks}
                tickFormat={(v) => `${v}%`}
                hideAxisLine
                hideTicks
                {...chartAxisProps}
              />
              <AxisBottom
                top={innerHeight}
                scale={x}
                numTicks={Math.max(2, Math.min(7, Math.floor(innerWidth / 90)))}
                tickFormat={(d) =>
                  formatDay((d as Date).toISOString().slice(0, 10))
                }
                hideTicks
                {...chartAxisProps}
              />
              <Bar
                width={innerWidth}
                height={innerHeight}
                fill="transparent"
                onMouseMove={onMove}
                onMouseLeave={hideTooltip}
              />
            </Group>
          </svg>
        )}
        {tooltipOpen && tooltipData && (
          <TooltipWithBounds
            left={tooltipLeft}
            top={tooltipTop}
            {...chartTooltipProps}
          >
            <ChartTooltip
              title={formatDay(tooltipData.day)}
              rows={[
                {
                  label: 'Success rate',
                  value: `${tooltipData.rate.toFixed(1)}%`,
                  series: tooltipData.rate < TARGET ? 7 : 1,
                },
              ]}
            />
          </TooltipWithBounds>
        )}
      </div>

      <figcaption className="ion-chart__caption">
        Average {mean.toFixed(1)}%. Lowest {lowest.rate.toFixed(1)}% on{' '}
        {formatDay(lowest.day)}.{' '}
        {below === 0
          ? `Every day met the ${TARGET}% target.`
          : `${below} of ${data.length} days missed the ${TARGET}% target.`}
      </figcaption>

      {/* A table cannot shrink below its content, so the wrapper is what hides it. */}

      <div className="ion-visually-hidden">
        <table>
          <caption>Daily run success rate</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Success rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.day}>
                <th scope="row">{formatDay(p.day)}</th>
                <td>{p.rate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
