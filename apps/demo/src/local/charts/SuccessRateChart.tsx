import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { Group } from '@visx/group';
import { useParentSize } from '@visx/responsive';
import { scaleLinear, scaleUtc } from '@visx/scale';
import { LinePath } from '@visx/shape';

import { formatDay, type IsoDay } from '../../lib/dates';

/**
 * LOCAL STAND-IN — gap list: no line-chart primitive. Axis and gridline colour
 * come from classes in charts.css, not from visx's `stroke`/`fill` props, so
 * the chart follows `data-theme` like everything else.
 */
const TARGET = 95;
const MARGIN = { top: 12, right: 12, bottom: 28, left: 40 };
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

  return (
    <figure className="demo-chart">
      <div ref={parentRef}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} aria-hidden="true">
            <Group left={MARGIN.left} top={MARGIN.top}>
              {yTicks.map((t) => (
                <line
                  key={t}
                  className="demo-chart__grid"
                  x1={0}
                  x2={innerWidth}
                  y1={y(t)}
                  y2={y(t)}
                />
              ))}
              <line
                className="demo-chart__target"
                x1={0}
                x2={innerWidth}
                y1={y(TARGET)}
                y2={y(TARGET)}
              />
              <text className="demo-chart__tick" x={4} y={y(TARGET) - 6}>
                Target {TARGET}%
              </text>
              <LinePath<Point>
                className="demo-chart__line"
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
                      ? 'demo-chart__point demo-chart__point--miss'
                      : 'demo-chart__point'
                  }
                  cx={x(dateOf(p))}
                  cy={y(p.rate)}
                  r={3}
                >
                  <title>{`${formatDay(p.day)} — ${p.rate.toFixed(1)}%`}</title>
                </circle>
              ))}
              <AxisLeft
                scale={y}
                tickValues={yTicks}
                tickFormat={(v) => `${v}%`}
                hideAxisLine
                hideTicks
                axisClassName="demo-chart__axis"
                tickLabelProps={{ className: 'demo-chart__tick' }}
              />
              <AxisBottom
                top={innerHeight}
                scale={x}
                numTicks={Math.max(2, Math.min(7, Math.floor(innerWidth / 90)))}
                tickFormat={(d) =>
                  formatDay((d as Date).toISOString().slice(0, 10))
                }
                hideTicks
                axisClassName="demo-chart__axis"
                tickLabelProps={{ className: 'demo-chart__tick' }}
              />
            </Group>
          </svg>
        )}
      </div>

      <figcaption className="ion-text-body-sm demo-muted demo-chart__caption">
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
