import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { StatGroup, StatTile } from 'ionbase-ui';

const meta: Meta<typeof StatTile> = {
  title: 'Components/StatTile',
  component: StatTile,
  tags: ['autodocs'],
  argTypes: {
    goodWhen: { control: 'inline-radio', options: ['up', 'down', 'neutral'] },
    changeUnit: { control: 'inline-radio', options: ['percent', 'points'] },
  },
  args: {
    label: 'Success rate',
    value: '96.2%',
    change: 1.1,
    changeUnit: 'points',
  },
  // A tile is only valid inside a StatGroup, so the single-tile stories render
  // one. Stories with their own `render` replace this, group and all.
  render: (args) => (
    <StatGroup style={{ maxWidth: '16rem' }}>
      <StatTile {...args} />
    </StatGroup>
  ),
  parameters: {
    docs: {
      description: {
        component:
          "One headline figure and how it moved. Drawn in Figma as `Stat Tile` (1412:343) and `Stat Group` (1412:344); promoted from the demo app's Overview KPI row.\n\n**Good and bad are not up and down.** A rising median run time is bad news and a rising success rate good, so the badge colour comes from `goodWhen` and the sign together. `neutral` never colours. The verdict is also spoken, so it never rests on colour.\n\nAlways inside a `StatGroup`: the tile renders a `<dt>` and `<dd>`, valid only inside a `<dl>`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatTile>;

export const Default: Story = {};

export const Overview: Story = {
  render: () => (
    <StatGroup aria-label="This week">
      <StatTile label="Runs" value="1.2k" change={4.1} goodWhen="neutral" />
      <StatTile
        label="Success rate"
        value="96.2%"
        change={1.1}
        changeUnit="points"
      />
      <StatTile
        label="Awaiting approval"
        value="3"
        change={-2}
        goodWhen="down"
      />
      <StatTile
        label="Median run time"
        value="41s"
        change={12}
        goodWhen="down"
      />
    </StatGroup>
  ),
};

export const Loading: Story = { args: { isLoading: true } };

/** The label is the term and the figure its description, inside one <dl>. */
export const IsADescriptionList: Story = {
  play: async ({ canvasElement }) => {
    const dl = canvasElement.querySelector('dl') as HTMLElement;
    await expect(dl).toHaveClass('ion-stat-group');
    await expect(dl.querySelector('dt')).toHaveTextContent('Success rate');
    await expect(dl.querySelector('dd')).toHaveTextContent('96.2%');
  },
};

/**
 * A rise is not automatically good. With `goodWhen="down"` a rising figure is
 * coloured as an error and announced as worse — the case the default `up`
 * gets wrong for every cost, duration and queue.
 */
export const RisingIsBadWhenDownIsGood: Story = {
  args: {
    label: 'Median run time',
    value: '41s',
    change: 12,
    changeUnit: 'percent',
    goodWhen: 'down',
  },
  play: async ({ canvasElement }) => {
    const badge = canvasElement.querySelector('.ion-badge') as HTMLElement;
    await expect(badge).toHaveClass('ion-badge--error');
    await expect(badge).toHaveTextContent('+12.0%');
    await expect(
      canvasElement.querySelector('.ion-stat-tile__change'),
    ).toHaveTextContent(', worse');
  },
};

/** The verdict is text as well as colour. */
export const VerdictIsSpoken: Story = {
  play: async ({ canvasElement }) => {
    const badge = canvasElement.querySelector('.ion-badge') as HTMLElement;
    await expect(badge).toHaveClass('ion-badge--success');
    await expect(
      canvasElement.querySelector(
        '.ion-stat-tile__change .ion-visually-hidden',
      ),
    ).toHaveTextContent(', better');
  },
};

/** `neutral` never colours and never passes a verdict. */
export const NeutralNeverColours: Story = {
  args: {
    label: 'Runs',
    value: '1.2k',
    change: 4.1,
    changeUnit: 'percent',
    goodWhen: 'neutral',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.ion-badge')).toHaveClass(
      'ion-badge--neutral',
    );
    await expect(
      canvasElement.querySelector(
        '.ion-stat-tile__change .ion-visually-hidden',
      ),
    ).toBeNull();
  },
};

/**
 * Rounded before it is judged: −0.04 is "No change", not a red "−0.0%".
 */
export const RoundsBeforeJudging: Story = {
  args: { change: -0.04 },
  play: async ({ canvasElement }) => {
    const badge = canvasElement.querySelector('.ion-badge') as HTMLElement;
    await expect(badge).toHaveTextContent('No change');
    await expect(badge).toHaveClass('ion-badge--neutral');
  },
};

/** A percentage metric moves in points: 95% to 96% is +1.0 pts. */
export const PointsForAPercentageMetric: Story = {
  args: { change: 1, changeUnit: 'points' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.ion-badge')).toHaveTextContent(
      '+1.0 pts',
    );
  },
};

/** No `change`, no badge and no comparison — never a made-up "No change". */
export const NoChangeWithoutAComparison: Story = {
  args: { change: undefined },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.ion-badge')).toBeNull();
    await expect(
      canvasElement.querySelector('.ion-stat-tile__comparison'),
    ).toBeNull();
  },
};

/** Loading keeps the label, hides the figure, and marks the tile busy. */
export const LoadingIsBusy: Story = {
  args: { isLoading: true },
  play: async ({ canvasElement }) => {
    const tile = canvasElement.querySelector('.ion-stat-tile') as HTMLElement;
    await expect(tile).toHaveAttribute('aria-busy', 'true');
    await expect(tile.querySelector('dt')).toHaveTextContent('Success rate');
    await expect(tile.querySelector('.ion-stat-tile__value')).toBeNull();
    await expect(tile.querySelector('.ion-skeleton')).not.toBeNull();
  },
};

/**
 * The group wraps by tile width with no breakpoint: four tiles in 360px sit
 * two to a row.
 */
export const GroupWrapsWithoutBreakpoints: Story = {
  render: () => (
    <StatGroup style={{ width: '360px' }}>
      <StatTile label="Runs" value="1.2k" />
      <StatTile label="Success rate" value="96.2%" />
      <StatTile label="Awaiting approval" value="3" />
      <StatTile label="Median run time" value="41s" />
    </StatGroup>
  ),
  play: async ({ canvasElement }) => {
    const tops = [...canvasElement.querySelectorAll('.ion-stat-tile')].map(
      (t) => Math.round(t.getBoundingClientRect().top),
    );
    await expect(tops[0]).toBe(tops[1]);
    await expect(tops[2]).toBeGreaterThan(tops[1]);
    await expect(tops[2]).toBe(tops[3]);
  },
};
