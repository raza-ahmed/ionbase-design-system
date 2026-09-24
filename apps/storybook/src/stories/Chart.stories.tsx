import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleLinear, scaleUtc } from '@visx/scale';
import { Bar, Line, LinePath } from '@visx/shape';
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

const meta: Meta<typeof ChartTooltip> = {
  title: 'Components/Chart',
  component: ChartTooltip,
  subcomponents: { ChartLegend },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'IonBase does not draw charts — [visx](https://airbnb.io/visx) does. IonBase styles them and supplies the two parts visx leaves to you: the tooltip panel and the legend. Drawn in Figma as `Chart Tooltip` and `Chart Legend`.\n\n- Axes: `<AxisBottom {...chartAxisProps} />`\n- Gridlines: `<GridRows {...chartGridProps} />`\n- A series: `className={chartSeriesClass(n)}` on a group, with `ion-chart__line`, `__area`, `__bar` or `__point` on the marks\n- Tooltip: `<TooltipWithBounds {...chartTooltipProps}><ChartTooltip … /></TooltipWithBounds>`\n\nAll colour is CSS, so the chart themes — switch the toolbar to Dark. The tooltip is for pointer users only: every chart still needs a text summary and the values in a table.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChartTooltip>;

/* ------------------------------------------------------------------ data */

const SERIES: { name: string; series: ChartSeries; base: number }[] = [
  { name: 'Production', series: 1, base: 96 },
  { name: 'Staging', series: 2, base: 92 },
];
const DAYS = 14;
const start = Date.UTC(2026, 8, 1);
const day = (i: number) => new Date(start + i * 86_400_000);
const rate = (base: number, i: number) =>
  Math.round((base + Math.sin(i * 0.9 + base) * 2.5) * 10) / 10;
const DATA = SERIES.map((s) => ({
  ...s,
  points: Array.from({ length: DAYS }, (_, i) => ({
    date: day(i),
    value: rate(s.base, i),
  })),
}));
const TARGET = 95;
const fmtDay = (d: Date) =>
  d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/* ----------------------------------------------------------------- chart */

const W = 560;
const H = 240;
const M = { top: 12, right: 16, bottom: 28, left: 40 };
const innerW = W - M.left - M.right;
const innerH = H - M.top - M.bottom;

function SuccessRate() {
  const x = scaleUtc({ domain: [day(0), day(DAYS - 1)], range: [0, innerW] });
  const y = scaleLinear({ domain: [85, 100], range: [innerH, 0] });
  const {
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
  } = useTooltip<number>();

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    const i = Math.round((px / innerW) * (DAYS - 1));
    const index = Math.max(0, Math.min(DAYS - 1, i));
    showTooltip({
      tooltipData: index,
      tooltipLeft: M.left + x(day(index)),
      tooltipTop: M.top + y(DATA[0].points[index].value),
    });
  };

  return (
    <figure className="ion-chart" style={{ maxWidth: W }}>
      <ChartLegend
        shape="line"
        items={SERIES.map((s) => ({ label: s.name, series: s.series }))}
      />
      <div style={{ position: 'relative' }}>
        <svg width={W} height={H} aria-hidden="true" data-testid="plot">
          <Group left={M.left} top={M.top}>
            <GridRows
              scale={y}
              width={innerW}
              numTicks={4}
              {...chartGridProps}
            />
            <Line
              className="ion-chart__reference"
              from={{ x: 0, y: y(TARGET) }}
              to={{ x: innerW, y: y(TARGET) }}
            />
            <text
              className="ion-chart__reference-label"
              x={4}
              y={y(TARGET) - 6}
            >
              Target {TARGET}%
            </text>
            {DATA.map((s) => (
              <g key={s.name} className={chartSeriesClass(s.series)}>
                <LinePath
                  className="ion-chart__line"
                  data={s.points}
                  x={(p) => x(p.date)}
                  y={(p) => y(p.value)}
                  curve={curveMonotoneX}
                />
                {tooltipOpen && tooltipData != null && (
                  <circle
                    className="ion-chart__point ion-chart__point--active"
                    cx={x(s.points[tooltipData].date)}
                    cy={y(s.points[tooltipData].value)}
                    r={4}
                  />
                )}
              </g>
            ))}
            {tooltipOpen && tooltipData != null && (
              <Line
                className="ion-chart__crosshair"
                from={{ x: x(day(tooltipData)), y: 0 }}
                to={{ x: x(day(tooltipData)), y: innerH }}
              />
            )}
            <AxisLeft
              scale={y}
              numTicks={4}
              tickFormat={(v) => `${v}%`}
              hideAxisLine
              hideTicks
              {...chartAxisProps}
            />
            <AxisBottom
              top={innerH}
              scale={x}
              numTicks={5}
              tickFormat={(d) => fmtDay(d as Date)}
              {...chartAxisProps}
            />
            <Bar
              data-testid="overlay"
              width={innerW}
              height={innerH}
              fill="transparent"
              onMouseMove={onMove}
              onMouseLeave={hideTooltip}
            />
          </Group>
        </svg>
        {tooltipOpen && tooltipData != null && (
          <TooltipWithBounds
            left={tooltipLeft}
            top={tooltipTop}
            {...chartTooltipProps}
          >
            <ChartTooltip
              title={fmtDay(day(tooltipData))}
              rows={DATA.map((s) => ({
                label: s.name,
                value: `${s.points[tooltipData].value.toFixed(1)}%`,
                series: s.series,
              }))}
            />
          </TooltipWithBounds>
        )}
      </div>
      <figcaption className="ion-chart__caption">
        Production held above the {TARGET}% target on most days; staging ran
        about four points lower.
      </figcaption>
      <table className="ion-visually-hidden">
        <caption>Daily success rate</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {SERIES.map((s) => (
              <th key={s.name} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DATA[0].points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{fmtDay(p.date)}</th>
              {DATA.map((s) => (
                <td key={s.name}>{s.points[i].value.toFixed(1)}%</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* --------------------------------------------------------------- helpers */

/** What a custom property paints, as the browser computes it. */
function resolved(prop: string) {
  const probe = document.createElement('div');
  probe.style.color = `var(${prop})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/* --------------------------------------------------------------- stories */

export const LineChart: Story = {
  render: () => <SuccessRate />,
};

/**
 * visx writes `#222` on axes and `#eaf0f6` on gridlines as attributes. The
 * classes from `chartAxisProps` and `chartGridProps` must win, or the chart
 * does not theme.
 */
export const AxesAndGridTakeTheTokens: Story = {
  render: () => <SuccessRate />,
  play: async ({ canvas }) => {
    const plot = canvas.getByTestId('plot');
    const tick = plot.querySelector('.ion-chart__tick')!;
    await expect(getComputedStyle(tick).fill).toBe(resolved('--text-tertiary'));
    const grid = plot.querySelector('.ion-chart__grid line')!;
    await expect(getComputedStyle(grid).stroke).toBe(
      resolved('--border-subtle'),
    );
    const axis = plot.querySelector('.ion-chart__axis-line')!;
    await expect(getComputedStyle(axis).stroke).toBe(
      resolved('--border-default'),
    );
  },
};

/** A series and its legend swatch read one token, so they cannot disagree. */
export const LegendMatchesItsSeries: Story = {
  render: () => <SuccessRate />,
  play: async ({ canvasElement }) => {
    for (const { series } of SERIES) {
      const line = canvasElement.querySelector(
        `svg .${chartSeriesClass(series)} .ion-chart__line`,
      )!;
      const swatch = canvasElement.querySelector(
        `.ion-chart-legend .${chartSeriesClass(series)} .ion-chart-swatch`,
      )!;
      await expect(getComputedStyle(line).stroke).toBe(
        resolved(`--chart-${series}`),
      );
      await expect(getComputedStyle(swatch).backgroundColor).toBe(
        resolved(`--chart-${series}`),
      );
    }
  },
};

/**
 * Hovering shows one panel — ours — with every series' value at that day.
 * `chartTooltipProps` turns off visx's own white box; if it did not, there
 * would be an inline background on the positioning element.
 */
export const TooltipShowsTheValuesUnderThePointer: Story = {
  render: () => <SuccessRate />,
  play: async ({ canvas, canvasElement }) => {
    const overlay = canvas.getByTestId('overlay');
    const box = overlay.getBoundingClientRect();
    overlay.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2,
      }),
    );
    const tip = await waitFor(() => {
      const t = canvasElement.querySelector<HTMLElement>('.ion-chart-tooltip');
      if (!t) throw new Error('no tooltip yet');
      return t;
    });
    const middle = Math.round((DAYS - 1) / 2);
    await expect(tip).toHaveTextContent(fmtDay(day(middle)));
    for (const s of DATA) {
      await expect(tip).toHaveTextContent(
        `${s.name}${s.points[middle].value.toFixed(1)}%`,
      );
    }
    const positioner = tip.parentElement!;
    await expect(positioner.style.backgroundColor).toBe('');
    await expect(getComputedStyle(tip).backgroundColor).toBe(
      resolved('--surface-raised'),
    );
  },
};

/** The rows are a description list: each value is announced with its label. */
export const Tooltip: Story = {
  render: () => (
    <ChartTooltip
      title="12 Sep"
      rows={[
        { label: 'Production', value: '96.2%', series: 1 },
        { label: 'Staging', value: '91.8%', series: 2 },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    const terms = canvas.getAllByRole('term');
    const values = canvas.getAllByRole('definition');
    await expect(terms.map((t) => t.textContent)).toEqual([
      'Production',
      'Staging',
    ]);
    await expect(values.map((v) => v.textContent)).toEqual(['96.2%', '91.8%']);
  },
};

export const Legend: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <ChartLegend
        items={SERIES.map((s) => ({ label: s.name, series: s.series }))}
      />
      <ChartLegend
        shape="line"
        items={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
          label: `Series ${n}`,
          series: n as ChartSeries,
        }))}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    const lists = canvas.getAllByRole('list');
    await expect(canvas.getAllByRole('listitem')).toHaveLength(10);
    await expect(lists[0]).toHaveTextContent('ProductionStaging');
  },
};
