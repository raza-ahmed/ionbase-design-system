import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { useParentSize } from '@visx/responsive';
import { scaleBand, scaleLinear } from '@visx/scale';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import {
  ChartLegend,
  ChartTooltip,
  chartAxisProps,
  chartGridProps,
  chartSeriesClass,
  chartTooltipProps,
  type ChartSeries,
} from 'ionbase-ui';

import type { AgentDay } from '../../data/agents';
import { formatDay } from '../../lib/dates';

/**
 * Runs per day, stacked by outcome. Drawn with visx, styled by IonBase: bars
 * take `ion-chart__bar` under a series class, so each outcome's bars and its
 * legend swatch read the same `--chart-<n>`.
 *
 * Stacked completed, then stopped, then failed, so failures sit on top of each
 * bar where the eye lands first. The colours come from the series numbers and
 * only distinguish; the legend and the tooltip name them.
 */
const SERIES: {
  key: keyof Omit<AgentDay, 'day'>;
  label: string;
  series: ChartSeries;
}[] = [
  { key: 'completed', label: 'Completed', series: 2 },
  { key: 'stopped', label: 'Stopped', series: 8 },
  { key: 'failed', label: 'Failed', series: 7 },
];

const MARGIN = { top: 8, right: 8, bottom: 28, left: 36 };
const HEIGHT = 220;

export function RunsByDayChart({ data }: { data: AgentDay[] }) {
  const { parentRef, width } = useParentSize({ debounceTime: 50 });
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const total = (d: AgentDay) => d.completed + d.failed + d.stopped;
  const max = Math.max(4, ...data.map(total));
  const x = scaleBand({
    domain: data.map((d) => d.day),
    range: [0, innerWidth],
    padding: 0.3,
  });
  const y = scaleLinear({
    domain: [0, max],
    range: [innerHeight, 0],
    nice: true,
  });
  const yTicks = y.ticks(4).filter(Number.isInteger);

  const {
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
  } = useTooltip<AgentDay>();

  const sum = data.reduce(
    (acc, d) => ({
      completed: acc.completed + d.completed,
      failed: acc.failed + d.failed,
      stopped: acc.stopped + d.stopped,
    }),
    { completed: 0, failed: 0, stopped: 0 },
  );
  const runs = sum.completed + sum.failed + sum.stopped;
  const busiest = data.reduce((a, d) => (total(d) > total(a) ? d : a), data[0]);

  return (
    <figure className="ion-chart demo-agent-chart">
      <ChartLegend
        items={SERIES.map((s) => ({ label: s.label, series: s.series }))}
      />
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
              {SERIES.map((s, si) => (
                <g key={s.key} className={chartSeriesClass(s.series)}>
                  {data.map((d) => {
                    const below = SERIES.slice(0, si).reduce(
                      (n, b) => n + d[b.key],
                      0,
                    );
                    const value = d[s.key];
                    if (value === 0) return null;
                    return (
                      <rect
                        key={d.day}
                        className="ion-chart__bar"
                        x={x(d.day)}
                        width={x.bandwidth()}
                        y={y(below + value)}
                        height={y(below) - y(below + value)}
                      />
                    );
                  })}
                </g>
              ))}
              <AxisLeft
                scale={y}
                tickValues={yTicks}
                hideAxisLine
                hideTicks
                {...chartAxisProps}
              />
              <AxisBottom
                top={innerHeight}
                scale={x}
                tickValues={data
                  .map((d) => d.day)
                  .filter(
                    (_, i) =>
                      i %
                        Math.max(
                          1,
                          Math.ceil(
                            data.length /
                              Math.max(2, Math.floor(innerWidth / 70)),
                          ),
                        ) ===
                      0,
                  )}
                tickFormat={(d) => formatDay(d as string)}
                hideTicks
                {...chartAxisProps}
              />
              {/* One hover target per day, the full column, so a short bar is easy to find. */}
              {data.map((d) => (
                <rect
                  key={d.day}
                  x={(x(d.day) ?? 0) - (x.step() - x.bandwidth()) / 2}
                  width={x.step()}
                  height={innerHeight}
                  fill="transparent"
                  onMouseMove={() =>
                    showTooltip({
                      tooltipData: d,
                      tooltipLeft:
                        MARGIN.left + (x(d.day) ?? 0) + x.bandwidth() / 2,
                      tooltipTop: MARGIN.top + y(total(d)),
                    })
                  }
                  onMouseLeave={hideTooltip}
                />
              ))}
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
              rows={[...SERIES].reverse().map((s) => ({
                label: s.label,
                value: String(tooltipData[s.key]),
                series: s.series,
              }))}
            />
          </TooltipWithBounds>
        )}
      </div>
      <figcaption className="ion-chart__caption">
        {runs} runs in 14 days: {sum.completed} completed, {sum.failed} failed,{' '}
        {sum.stopped} stopped. Busiest day {formatDay(busiest.day)}, with{' '}
        {total(busiest)}.
      </figcaption>
      <div className="ion-visually-hidden">
        <table>
          <caption>Runs per day by outcome</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              {SERIES.map((s) => (
                <th key={s.key} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <th scope="row">{formatDay(d.day)}</th>
                {SERIES.map((s) => (
                  <td key={s.key}>{d[s.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
