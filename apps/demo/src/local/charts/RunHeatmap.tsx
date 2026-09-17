import { Group } from '@visx/group';
import { HeatmapRect } from '@visx/heatmap';
import { useParentSize } from '@visx/responsive';

/**
 * LOCAL STAND-IN — gap list: IonBase has categorical `chart/1…8` tokens but no
 * sequential ramp, so intensity is `chart/1` at six fixed opacity steps. Steps,
 * not a continuous visx colour scale: a scale interpolates colours in JS and
 * cannot interpolate `var(--…)`, while a class per step themes with the page.
 * All colour is in charts.css, as CSS — CSS beats SVG presentation attributes,
 * which is also why nothing here passes `fill`.
 */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STEPS = 6;
const LEFT = 36;
const BOTTOM = 22;

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

interface Column {
  hour: number;
  bins: { weekday: number; count: number }[];
}

export function RunHeatmap({ data }: { data: number[][] }) {
  const max = Math.max(1, ...data.flat());
  const step = (count: number) =>
    count === 0 ? 0 : Math.max(1, Math.ceil((count / max) * (STEPS - 1)));

  const columns: Column[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    bins: WEEKDAYS.map((_, weekday) => ({
      weekday,
      count: data[weekday][hour],
    })),
  }));

  let peak = { weekday: 0, hour: 0, count: -1 };
  data.forEach((row, weekday) =>
    row.forEach((count, hour) => {
      if (count > peak.count) peak = { weekday, hour, count };
    }),
  );

  // A hook, not <ParentSize>: in visx 4 ParentSize draws inside an absolutely
  // positioned box, so a container without a fixed height clips the chart to
  // nothing.
  const { parentRef, width } = useParentSize({ debounceTime: 50 });
  const binWidth = (width - LEFT) / 24;
  const binHeight = Math.min(28, Math.max(14, binWidth));
  const height = binHeight * 7 + BOTTOM;

  return (
    <figure className="demo-chart">
      <div ref={parentRef}>
        {width > 0 && (
          <svg width={width} height={height} aria-hidden="true">
            {WEEKDAYS.map((d, i) => (
              <text
                key={d}
                className="demo-chart__tick"
                x={0}
                y={i * binHeight + binHeight / 2}
                dominantBaseline="middle"
              >
                {d}
              </text>
            ))}
            {[0, 6, 12, 18].map((h) => (
              <text
                key={h}
                className="demo-chart__tick"
                x={LEFT + h * binWidth}
                y={height - 4}
              >
                {hourLabel(h)}
              </text>
            ))}
            <Group left={LEFT}>
              <HeatmapRect<Column, Column['bins'][number]>
                data={columns}
                bins={(c) => c.bins}
                count={(b) => b.count}
                xScale={(i) => i * binWidth}
                yScale={(i) => i * binHeight}
                binWidth={binWidth}
                binHeight={binHeight}
                gap={2}
              >
                {(cells) =>
                  cells.flat().map((cell) => (
                    <rect
                      key={`${cell.row}-${cell.column}`}
                      className={`demo-heat demo-heat--${step(cell.count ?? 0)}`}
                      x={cell.x}
                      y={cell.y}
                      width={Math.max(0, cell.width)}
                      height={Math.max(0, cell.height)}
                      rx={2}
                    >
                      <title>{`${WEEKDAYS[cell.row]} ${hourLabel(cell.column)} — ${cell.count} runs`}</title>
                    </rect>
                  ))
                }
              </HeatmapRect>
            </Group>
          </svg>
        )}
      </div>

      <figcaption className="demo-chart__caption">
        <span className="ion-text-body-sm demo-muted">
          Busiest: {WEEKDAYS[peak.weekday]} {hourLabel(peak.hour)} UTC,{' '}
          {peak.count} runs.
        </span>
        <span className="demo-legend" aria-hidden="true">
          <span className="ion-text-caption demo-muted">Fewer</span>
          <svg width={STEPS * 14} height={12}>
            {Array.from({ length: STEPS }, (_, i) => (
              <rect
                key={i}
                className={`demo-heat demo-heat--${i}`}
                x={i * 14}
                width={12}
                height={12}
                rx={2}
              />
            ))}
          </svg>
          <span className="ion-text-caption demo-muted">More</span>
        </span>
      </figcaption>

      {/* A table cannot shrink below its content, so the wrapper is what hides it. */}
      <div className="ion-visually-hidden">
        <table>
          <caption>Agent runs by weekday and hour (UTC)</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              {columns.map((c) => (
                <th key={c.hour} scope="col">
                  {hourLabel(c.hour)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={WEEKDAYS[i]}>
                <th scope="row">{WEEKDAYS[i]}</th>
                {row.map((count, h) => (
                  <td key={h}>{count}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
