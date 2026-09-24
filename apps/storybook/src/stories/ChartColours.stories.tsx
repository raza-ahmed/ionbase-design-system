import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

/**
 * Chart colour has no component — a chart is drawn by the product, with its
 * own charting library — so these stories show the tokens doing the jobs a
 * product will give them. Every colour here is a CSS custom property, never a
 * hex, so switching the toolbar theme re-colours everything.
 */
const meta: Meta = {
  title: 'Foundations/Chart colours',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "`--chart-1…8` colour categorical series, in order. `--chart-sequential-1…5` colour magnitude, low to high, with `--surface-sunken` as zero. Both theme — switch the toolbar to Dark: the ramp runs deep-to-pale there, so high always means furthest from the ground.\n\n**Bin, do not add steps.** GitHub's contribution graph uses four greens and an empty square. Past five to seven steps of one hue, neighbours stop being told apart, so a wide range is binned into the steps rather than given more of them. For a genuinely continuous scale, blend between neighbouring steps with `color-mix()` — the blend still themes.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const SERIES = [
  'Blue',
  'Green',
  'Purple',
  'Orange',
  'Pink',
  'Yellow',
  'Red',
  'Gray',
];
const STEPS = 5;

const caption: React.CSSProperties = {
  color: 'var(--text-tertiary)',
  fontFamily: 'var(--font-family-sans)',
  fontSize: 'var(--type-caption)',
  lineHeight: 'var(--type-caption-line-height)',
};

const swatch = (color: string): React.CSSProperties => ({
  width: 56,
  height: 40,
  borderRadius: 'var(--radius-sm)',
  background: color,
});

export const Palette: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-24)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {SERIES.map((name, i) => (
          <div key={name} style={{ display: 'grid', gap: 4 }}>
            <div style={swatch(`var(--chart-${i + 1})`)} />
            <code style={caption}>--chart-{i + 1}</code>
            <span style={caption}>{name}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {['--surface-sunken', ...ramp()].map((v, i) => (
          <div key={v} style={{ display: 'grid', gap: 4 }}>
            <div style={swatch(`var(${v})`)} />
            <code style={caption}>{v}</code>
            <span style={caption}>{i === 0 ? 'Zero' : `Step ${i}`}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

function ramp() {
  return Array.from({ length: STEPS }, (_, i) => `--chart-sequential-${i + 1}`);
}

/* ------------------------------------------------ a contribution graph */

/** Seeded, so the story and its test see the same year every run. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEEKS = 53;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A year of daily counts: quiet weekends, some empty days, a few big ones. */
function year(): number[][] {
  const rand = mulberry32(2026);
  return Array.from({ length: WEEKS }, () =>
    DAYS.map((_, d) => {
      const weekend = d === 0 || d === 6;
      if (rand() < (weekend ? 0.6 : 0.15)) return 0;
      const base = weekend ? 4 : 14;
      return Math.round(base * rand() ** 2 * (rand() < 0.05 ? 8 : 1)) + 1;
    }),
  );
}

/**
 * GitHub's rule, generalised: zero is its own level, and the non-zero days are
 * split into equal-sized groups by rank. Rank rather than value, so one huge
 * day does not push every other day into the bottom step.
 *
 * Each cut is the TOP of its group and a day climbs past it only by exceeding
 * it. Cutting at the bottom instead — `count >= cut` — puts the smallest count
 * above the first cut, and step 1 is never drawn: the test below caught that.
 */
function binByRank(counts: number[], steps = STEPS) {
  const sorted = counts.filter((c) => c > 0).sort((a, b) => a - b);
  const cuts = Array.from(
    { length: steps - 1 },
    (_, i) => sorted[Math.floor(((i + 1) * sorted.length) / steps) - 1],
  );
  return (count: number) =>
    count === 0 ? 0 : 1 + cuts.filter((c) => count > c).length;
}

const levelColour = (level: number) =>
  level === 0 ? 'var(--surface-sunken)' : `var(--chart-sequential-${level})`;

function ContributionGraph() {
  const data = year();
  const level = binByRank(data.flat());
  const total = data.flat().reduce((a, b) => a + b, 0);
  const cell = 11;
  const gap = 3;

  return (
    <figure style={{ margin: 0, display: 'grid', gap: 8, maxWidth: '100%' }}>
      <div style={{ overflowX: 'auto' }}>
        <div
          role="img"
          aria-label={`${total} runs in the last year, darker is more`}
          data-testid="graph"
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridTemplateRows: `repeat(7, ${cell}px)`,
            gridAutoColumns: `${cell}px`,
            gap,
            width: 'max-content',
          }}
        >
          {data.flatMap((week, w) =>
            week.map((count, d) => (
              <div
                key={`${w}-${d}`}
                title={`${DAYS[d]}, week ${w + 1}: ${count} runs`}
                data-count={count}
                data-level={level(count)}
                style={{
                  borderRadius: 2,
                  background: levelColour(level(count)),
                }}
              />
            )),
          )}
        </div>
      </div>
      <figcaption
        style={{
          ...caption,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <span>{total} runs in the last year</span>
        <span
          aria-hidden="true"
          style={{ display: 'inline-flex', alignItems: 'center', gap }}
        >
          Less
          {Array.from({ length: STEPS + 1 }, (_, i) => (
            <span
              key={i}
              style={{
                width: cell,
                height: cell,
                borderRadius: 2,
                background: levelColour(i),
              }}
            />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * GitHub-style: 371 days into zero plus the five steps, by rank. The graph is
 * one image with a text summary — 371 focusable cells would be a trap for a
 * keyboard — and each cell keeps its count in a tooltip for a pointer.
 */
export const ContributionGraphStory: Story = {
  name: 'Contribution graph',
  render: () => <ContributionGraph />,
  play: async ({ canvas }) => {
    const cells = [
      ...canvas
        .getByTestId('graph')
        .querySelectorAll<HTMLElement>('[data-level]'),
    ];
    await expect(cells).toHaveLength(WEEKS * 7);

    // Every level is used, zero is the sunken ground, and a bigger day is
    // never drawn lighter than a smaller one.
    const levels = new Set(cells.map((c) => c.dataset.level));
    await expect([...levels].sort()).toEqual(['0', '1', '2', '3', '4', '5']);
    const byCount = [...cells].sort(
      (a, b) => Number(a.dataset.count) - Number(b.dataset.count),
    );
    for (let i = 1; i < byCount.length; i++) {
      await expect(Number(byCount[i].dataset.level)).toBeGreaterThanOrEqual(
        Number(byCount[i - 1].dataset.level),
      );
    }

    // Each level paints exactly its token.
    for (const cell of cells.slice(0, 60)) {
      const n = Number(cell.dataset.level);
      await expect(getComputedStyle(cell).backgroundColor).toBe(
        resolved(n === 0 ? '--surface-sunken' : `--chart-sequential-${n}`),
      );
    }
  },
};

/* -------------------------------------------------- continuous scale */

/**
 * A value in [0, 1] as a blend of the two steps either side of it. Five stops,
 * four segments; `color-mix()` does the interpolation in the browser, so the
 * result still follows the theme — which a JS colour scale cannot do, because
 * it cannot read `var()`.
 */
function continuous(t: number) {
  const x = Math.min(1, Math.max(0, t)) * (STEPS - 1);
  const i = Math.min(STEPS - 2, Math.floor(x));
  const into = Math.round((x - i) * 100);
  return `color-mix(in oklab, var(--chart-sequential-${i + 1}) ${100 - into}%, var(--chart-sequential-${i + 2}))`;
}

export const Continuous: Story = {
  render: () => (
    <figure style={{ margin: 0, display: 'grid', gap: 8 }}>
      <div
        data-testid="strip"
        role="img"
        aria-label="A continuous scale from lowest to highest"
        style={{ display: 'flex', height: 32 }}
      >
        {Array.from({ length: 41 }, (_, i) => (
          <div
            key={i}
            data-t={i / 40}
            style={{ flex: 1, background: continuous(i / 40) }}
          />
        ))}
      </div>
      <figcaption style={caption}>
        <code>color-mix()</code> between neighbouring steps — use it only when
        the value really is continuous. A reader still cannot tell 41 shades
        apart, so pair it with a labelled axis or a tooltip.
      </figcaption>
    </figure>
  ),
  play: async ({ canvas }) => {
    const parts = [
      ...canvas.getByTestId('strip').querySelectorAll<HTMLElement>('[data-t]'),
    ];
    const bg = (el: HTMLElement) => rgb(getComputedStyle(el).backgroundColor);
    const token = (n: number) => rgb(resolved(`--chart-sequential-${n}`));
    // The ends are the ramp's own ends, and the middle is its own step 3.
    await expect(near(bg(parts[0]), token(1))).toBe(true);
    await expect(near(bg(parts[40]), token(5))).toBe(true);
    await expect(near(bg(parts[20]), token(3))).toBe(true);
    // Between two stops is neither of them.
    await expect(near(bg(parts[5]), token(1))).toBe(false);
    await expect(near(bg(parts[5]), token(2))).toBe(false);
  },
};

/* ------------------------------------------------------------ helpers */

/** What a custom property paints, as the browser computes it. */
function resolved(prop: string) {
  const probe = document.createElement('div');
  probe.style.background = `var(${prop})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

/** Any computed colour → rounded sRGB channels, so oklab and rgb compare. */
function rgb(color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
}

/** Equal within a rounding step — a colour round-tripped through oklab. */
function near(a: number[], b: number[]) {
  return a.every((v, i) => Math.abs(v - b[i]) <= 2);
}

/**
 * High means furthest from the ground in both themes: pale-to-deep in Light,
 * deep-to-pale in Dark. Checked by flipping the theme, because a ramp that
 * only reads right in one mode is the defect these tokens were built to fix.
 */
export const RampTurnsRoundInDark: Story = {
  render: Palette.render,
  play: async () => {
    const root = document.documentElement;
    const before = root.getAttribute('data-theme');
    const lum = (prop: string) => {
      const [r, g, b] = rgb(resolved(prop)).map((v) => {
        const x = v / 255;
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    try {
      root.setAttribute('data-theme', 'light');
      await expect(lum('--chart-sequential-5')).toBeLessThan(
        lum('--chart-sequential-1'),
      );
      root.setAttribute('data-theme', 'dark');
      await expect(lum('--chart-sequential-5')).toBeGreaterThan(
        lum('--chart-sequential-1'),
      );
    } finally {
      if (before) root.setAttribute('data-theme', before);
      else root.removeAttribute('data-theme');
    }
  },
};
