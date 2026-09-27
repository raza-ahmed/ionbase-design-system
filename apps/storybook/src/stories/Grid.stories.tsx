import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { renderToStaticMarkup } from 'react-dom/server';
import { Grid, type GridGap } from 'ionbase-ui';

const Cell = ({
  children,
  h = 48,
}: {
  children?: React.ReactNode;
  h?: number;
}) => (
  <div
    data-cell
    style={{
      minHeight: h,
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      background: 'var(--surface-muted)',
      borderRadius: 6,
    }}
  >
    {children}
  </div>
);

const meta: Meta<typeof Grid> = {
  title: 'Components/Grid',
  component: Grid,
  tags: ['autodocs'],
  argTypes: {
    collapse: {
      control: 'inline-radio',
      options: ['mobile', 'tablet', 'never'],
    },
    columns: { control: 'select', options: [1, 2, 3, 4, 5, 6, 12] },
    gap: {
      control: 'select',
      options: [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Columns that line up across rows, with gaps from the spacing scale. `columns` is a count or each column’s share (`[2, 1]`); fixed columns fall to one at `collapse` — the tokens’ tablet or mobile breakpoint. `minColumnWidth` fills each row with as many columns as fit instead. Layout only — it adds no role; `as` picks the element that means something.',
      },
    },
  },
  render: (args) => (
    <Grid {...args}>
      {['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((t) => (
        <Cell key={t}>{t}</Cell>
      ))}
    </Grid>
  ),
};

export default meta;
type Story = StoryObj<typeof Grid>;

export const Default: Story = {};
export const ThreeColumns: Story = { args: { columns: 3 } };
export const MainAndAside: Story = {
  args: { columns: [2, 1], collapse: 'tablet', gap: 12 },
};
export const Filling: Story = { args: { minColumnWidth: 200 } };

const probe = (token: string) => {
  const el = document.createElement('div');
  el.style.width = `var(${token})`;
  document.body.append(el);
  const w = getComputedStyle(el).width;
  el.remove();
  return w;
};
const px = (token: string) => parseFloat(probe(token));
const grid = (el: HTMLElement, sel = '.ion-grid') =>
  el.querySelector(sel) as HTMLElement;
const cells = (g: Element) =>
  [...g.children].map((c) => c.getBoundingClientRect());
/** How many cells share the first row. */
const perRow = (g: Element) => {
  const r = cells(g);
  return r.filter((c) => Math.round(c.top) === Math.round(r[0].top)).length;
};

/** Two equal columns, 16 apart across and down — the defaults. */
export const TheDefaultIsTwoEqualColumns: Story = {
  play: async ({ canvasElement }) => {
    const g = grid(canvasElement);
    const [a, b, c] = cells(g);
    await expect(perRow(g)).toBe(2);
    await expect(a.width).toBeCloseTo(b.width, 1);
    await expect(b.left - a.right).toBeCloseTo(px('--spacing-16'), 1);
    await expect(c.top - a.bottom).toBeCloseTo(px('--spacing-16'), 1);
    await expect(getComputedStyle(g).display).toBe('grid');
  },
};

/** A count makes that many equal columns, and they line up across rows. */
export const ColumnsLineUpAcrossRows: Story = {
  render: () => (
    <Grid columns={3}>
      <Cell>A short one</Cell>
      <Cell>{'A cell with a great deal more text in it '.repeat(2)}</Cell>
      <Cell>C</Cell>
      <Cell>D</Cell>
      <Cell>E</Cell>
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    const g = grid(canvasElement);
    const r = cells(g);
    await expect(perRow(g)).toBe(3);
    // The second row's cells start where the first row's did, whatever
    // their content — what a wrapping Stack cannot do.
    await expect(r[3].left).toBeCloseTo(r[0].left, 1);
    await expect(r[4].left).toBeCloseTo(r[1].left, 1);
    await expect(r[1].width).toBeCloseTo(r[0].width, 1);
  },
};

/** Fractions share the row: `[2, 1]` is a main column twice its aside. */
export const FractionsShareTheRow: Story = {
  render: () => (
    <Grid columns={[2, 1]} collapse="never" gap={12}>
      <Cell>Main</Cell>
      <Cell>Aside</Cell>
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    const [a, b] = cells(grid(canvasElement));
    await expect(a.width / b.width).toBeCloseTo(2, 1);
    await expect(b.left - a.right).toBeCloseTo(px('--spacing-12'), 1);
  },
};

const GAPS: GridGap[] = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64];

/** Every gap is its spacing token, across and down, measured between cells. */
export const EveryGapIsItsToken: Story = {
  render: () => (
    <div>
      {GAPS.map((g) => (
        <Grid key={g} gap={g} collapse="never" data-gap={g}>
          <Cell />
          <Cell />
          <Cell />
        </Grid>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const el of canvasElement.querySelectorAll<HTMLElement>(
      '[data-gap]',
    )) {
      const want = px(`--spacing-${el.dataset.gap}`);
      const [a, b, c] = cells(el);
      await expect(b.left - a.right).toBeCloseTo(want, 1);
      await expect(c.top - a.bottom).toBeCloseTo(want, 1);
    }
  },
};

/** `rowGap` sets the rows apart on their own; the columns keep `gap`. */
export const RowGapSetsTheRowsApart: Story = {
  render: () => (
    <Grid gap={8} rowGap={32} collapse="never">
      <Cell />
      <Cell />
      <Cell />
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    const [a, b, c] = cells(grid(canvasElement));
    await expect(b.left - a.right).toBeCloseTo(px('--spacing-8'), 1);
    await expect(c.top - a.bottom).toBeCloseTo(px('--spacing-32'), 1);
  },
};

/** A Grid inside a Grid keeps its own gaps, even when the outer sets `rowGap`. */
export const NestedGridsKeepTheirGaps: Story = {
  render: () => (
    <Grid rowGap={48} gap={24} collapse="never" data-g="outer">
      <Grid gap={4} collapse="never" data-g="inner">
        <Cell />
        <Cell />
        <Cell />
      </Grid>
      <Cell />
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    const [a, b, c] = cells(grid(canvasElement, '[data-g="inner"]'));
    await expect(b.left - a.right).toBeCloseTo(px('--spacing-4'), 1);
    await expect(c.top - a.bottom).toBeCloseTo(px('--spacing-4'), 1);
  },
};

/** Cells in a row stretch to the tallest; `align="start"` keeps each its own. */
export const CellsStretchToTheTallest: Story = {
  render: () => (
    <div>
      <Grid collapse="never" data-g="stretch">
        <Cell h={40} />
        <Cell h={96} />
      </Grid>
      <Grid collapse="never" align="start" data-g="start">
        <Cell h={40} />
        <Cell h={96} />
      </Grid>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [a, b] = cells(grid(canvasElement, '[data-g="stretch"]'));
    await expect(a.height).toBe(b.height);
    const [c, d] = cells(grid(canvasElement, '[data-g="start"]'));
    await expect(c.height).toBe(40);
    await expect(d.height).toBe(96);
  },
};

/**
 * A filling grid fits as many columns as the space holds at the minimum —
 * and on a space narrower than the minimum, one column that does not
 * overflow it.
 */
export const AFillingGridFollowsTheSpace: Story = {
  render: () => (
    <div>
      {[680, 440, 150].map((w) => (
        <div key={w} style={{ width: w }}>
          <Grid minColumnWidth={200} data-w={w}>
            {[1, 2, 3, 4].map((n) => (
              <Cell key={n}>{n}</Cell>
            ))}
          </Grid>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const at = (w: number) => grid(canvasElement, `[data-w="${w}"]`);
    // 680: three of 200 and two gaps of 16 fit; four do not.
    await expect(perRow(at(680))).toBe(3);
    await expect(perRow(at(440))).toBe(2);
    await expect(perRow(at(150))).toBe(1);
    const narrow = at(150);
    await expect(narrow.scrollWidth).toBeLessThanOrEqual(narrow.clientWidth);
    // And the columns in a row are the same width.
    const [a, b] = cells(at(680));
    await expect(a.width).toBeCloseTo(b.width, 1);
  },
};

/** A filling grid with fewer cards than fit keeps them at a column's width. */
export const AFewCardsKeepTheirWidth: Story = {
  render: () => (
    <div style={{ width: 680 }}>
      <Grid minColumnWidth={200}>
        <Cell>Only one</Cell>
      </Grid>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [a] = cells(grid(canvasElement));
    await expect(a.width).toBeLessThan(300);
  },
};

/** A wide child scrolls in its cell; it does not widen the column or the page. */
export const AWideChildCannotWidenTheGrid: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Grid collapse="never">
        {/* The scroller is inside the cell, as a Table's region is: the cell
            itself has nothing that lets it shrink below its content. */}
        <div>
          <div data-wide style={{ overflow: 'auto' }}>
            <div style={{ whiteSpace: 'nowrap' }}>
              run_4821-h3-contract-clause-checker-7f3a91c2-review-queue
            </div>
          </div>
        </div>
        <Cell>B</Cell>
      </Grid>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const g = grid(canvasElement);
    await expect(g.scrollWidth).toBeLessThanOrEqual(g.clientWidth);
    const [a, b] = cells(g);
    await expect(a.width).toBeCloseTo(b.width, 1);
    await expect(b.right).toBeLessThanOrEqual(g.getBoundingClientRect().right);
    const wide = canvasElement.querySelector('[data-wide]') as HTMLElement;
    await expect(wide.scrollWidth).toBeGreaterThan(wide.clientWidth);
  },
};

/**
 * Fixed columns fall to one at the tokens' breakpoints: `tablet` at 1023px
 * and below, `mobile` at 767px and below; `never` keeps them.
 */
export const ColumnsCollapseAtTheBreakpoints: Story = {
  render: () => (
    <div>
      {(['tablet', 'mobile', 'never'] as const).map((c) => (
        <Grid key={c} collapse={c} data-c={c}>
          <Cell />
          <Cell />
        </Grid>
      ))}
      {/* A filling grid has no breakpoint: `collapse` does not apply. */}
      <Grid minColumnWidth={160} collapse="mobile" data-c="fill">
        <Cell />
        <Cell />
      </Grid>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const at = (c: string) => grid(canvasElement, `[data-c="${c}"]`);
    const [w, h] = [window.innerWidth, window.innerHeight];
    try {
      await page.viewport(1200, 800);
      await waitFor(() => expect(perRow(at('tablet'))).toBe(2));
      await expect(perRow(at('mobile'))).toBe(2);

      await page.viewport(1024, 800);
      await waitFor(() => expect(perRow(at('tablet'))).toBe(2));

      await page.viewport(1023, 800);
      await waitFor(() => expect(perRow(at('tablet'))).toBe(1));
      await expect(perRow(at('mobile'))).toBe(2);

      await page.viewport(768, 800);
      await waitFor(() => expect(perRow(at('mobile'))).toBe(2));

      await page.viewport(767, 800);
      await waitFor(() => expect(perRow(at('mobile'))).toBe(1));
      await expect(perRow(at('tablet'))).toBe(1);
      await expect(perRow(at('never'))).toBe(2);
      await expect(perRow(at('fill'))).toBe(2);
      // Fallen to one, the cells are still the gap apart.
      const [a, b] = cells(at('mobile'));
      await expect(b.top - a.bottom).toBeCloseTo(px('--spacing-16'), 1);
    } finally {
      await page.viewport(w, h);
    }
  },
};

/** Off the scale, off the counts, off the steps: each is a type error. */
export const ValuesOffTheirStepsAreTypeErrors: Story = {
  render: () => (
    <div>
      {/* @ts-expect-error — 10 is not a step of the spacing scale. */}
      <Grid gap={10}>
        <Cell />
      </Grid>
      {/* @ts-expect-error — seven columns do not divide the layout grid. */}
      <Grid columns={7}>
        <Cell />
      </Grid>
      {/* @ts-expect-error — a minimum width off its steps. */}
      <Grid minColumnWidth={250}>
        <Cell />
      </Grid>
    </div>
  ),
};

/** `as="ul"` is a list — no bullets, no indent, still a list to a screen reader. */
export const AsAList: Story = {
  render: () => (
    <Grid as="ul" minColumnWidth={160} aria-label="Agents">
      <li>Refund triage</li>
      <li>Contract clause checker</li>
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole('list', { name: 'Agents' });
    await expect(list.tagName).toBe('UL');
    await expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    const s = getComputedStyle(list);
    await expect(s.listStyleType).toBe('none');
    await expect(s.paddingLeft).toBe('0px');
    await expect(s.marginTop).toBe('0px');
  },
};

/** It adds no role, and a caller's style merges with its own. */
export const ItAddsNoRole: Story = {
  render: () => (
    <Grid style={{ marginTop: 4 }}>
      <Cell />
      <Cell />
    </Grid>
  ),
  play: async ({ canvasElement }) => {
    const g = grid(canvasElement);
    await expect(g.tagName).toBe('DIV');
    await expect(g).not.toHaveAttribute('role');
    await expect(g.style.marginTop).toBe('4px');
    await expect(perRow(g)).toBe(2);
  },
};

/** No client code: it renders on a server. */
export const ItRendersOnAServer: Story = {
  play: async () => {
    const html = renderToStaticMarkup(
      <Grid as="section" columns={[2, 1]} collapse="tablet" gap={12}>
        <div>A</div>
      </Grid>,
    );
    await expect(html).toContain('<section');
    await expect(html).toContain('ion-grid--collapse-tablet');
    await expect(html).toContain('ion-grid--gap-12');
    await expect(html).toContain('minmax(0, 2fr) minmax(0, 1fr)');
  },
};
