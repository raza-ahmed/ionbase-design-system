import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, waitFor } from 'storybook/test';
import { ScrollProgress } from 'ionbase-ui';

const SECTIONS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'setup', label: 'Getting started' },
  { id: 'usage', label: 'Usage' },
  { id: 'api', label: 'API reference' },
  { id: 'faq', label: 'FAQ' },
];

/** Longer than any viewport will show — the panel caps and scrolls. */
const MANY_SECTIONS = Array.from({ length: 40 }, (_, i) => ({
  id: `s${i}`,
  label: `Section ${i + 1}`,
}));

const meta: Meta<typeof ScrollProgress> = {
  title: 'Components/ScrollProgress',
  component: ScrollProgress,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Line` / `Progress` (191:968) / `Progress Heading` (191:1021), re-synced August 2026 after the sizes, colours and spacing were retuned on the canvas.\n\n`progress` and `activeId` are props, not something this component tracks itself — the same reason `Select` takes `value` rather than reading scroll position from the DOM. Which container scrolls and how "the active section" is defined are facts only the consuming app has.\n\nThe disclosure follows the WAI-ARIA Disclosure pattern (`aria-expanded` + `aria-controls`), not a menu role: its rows sit in normal tab order rather than the roving-tabindex arrow-key model `role="menu"` would promise.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScrollProgress>;

export const Default: Story = {
  render: () => (
    <ScrollProgress progress={32} sections={SECTIONS} activeId="setup" />
  ),
};

/** A realistic wiring: the parent owns `progress`/`activeId`, `onSelect`
 *  updates them — the component itself holds no scroll-related state. */
export const Controlled: Story = {
  render: function Render() {
    const [activeId, setActiveId] = useState('usage');
    return (
      <ScrollProgress
        progress={54}
        sections={SECTIONS}
        activeId={activeId}
        onSelect={setActiveId}
      />
    );
  },
};

export const NearComplete: Story = {
  render: () => (
    <ScrollProgress progress={97} sections={SECTIONS} activeId="faq" />
  ),
};

/** Figma: tick width 24 (`spacing/24` — the instance override, not the `Line`
 *  component's own 32px frame), 2px stroke (`border-width/thick`, not the
 *  default 1px every other hairline in the system uses), 8px gap between
 *  ticks. The panel is a fixed 220 with 4px between rows and 6px/8px inside
 *  each one. */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => (
    <ScrollProgress progress={32} sections={SECTIONS} activeId="setup" />
  ),
  play: async ({ canvasElement }) => {
    const tick = canvasElement.querySelector(
      '.ion-scroll-progress__tick',
    ) as HTMLElement;
    const cs = getComputedStyle(tick);

    await expect(Math.round(tick.getBoundingClientRect().width)).toBe(24);
    await expect(cs.height).toBe('2px');

    const rail = canvasElement.querySelector(
      '.ion-scroll-progress__rail',
    ) as HTMLElement;
    await expect(getComputedStyle(rail).rowGap).toBe('8px');

    const panel = canvasElement.querySelector(
      '.ion-scroll-progress__panel',
    ) as HTMLElement;
    const panelStyle = getComputedStyle(panel);
    await expect(panelStyle.rowGap).toBe('4px');
    await expect(Math.round(panel.getBoundingClientRect().width)).toBe(220);

    const heading = canvasElement.querySelector(
      '.ion-scroll-progress__heading',
    ) as HTMLElement;
    const headingStyle = getComputedStyle(heading);
    await expect(headingStyle.paddingTop).toBe('6px');
    await expect(headingStyle.paddingLeft).toBe('8px');
  },
};

/**
 * The percentage is two type sizes, not one: the digits sit on `type/body-sm`
 * and the `%` a rung down on `type/caption`. It reads as an export artefact in
 * Figma and is not — the two spans carry different bound size variables.
 */
export const PercentSignIsARungDown: Story = {
  render: () => (
    <ScrollProgress progress={32} sections={SECTIONS} activeId="setup" />
  ),
  play: async ({ canvasElement }) => {
    const percent = canvasElement.querySelector(
      '.ion-scroll-progress__percent',
    ) as HTMLElement;
    const sign = canvasElement.querySelector(
      '.ion-scroll-progress__percent-sign',
    ) as HTMLElement;

    await expect(percent.textContent).toBe('32%');
    await expect(getComputedStyle(percent).fontSize).toBe('14px');
    await expect(getComputedStyle(sign).fontSize).toBe('12px');
  },
};

/**
 * The panel is a fixed 220 wide, so a heading longer than that truncates
 * rather than widening the flyout — Figma's own mockup shows every row
 * ellipsised. The full label stays in the accessible name, so a screen reader
 * still gets all of it.
 */
export const LongHeadingsTruncate: Story = {
  render: () => (
    <ScrollProgress
      progress={32}
      sections={[
        { id: 'intro', label: 'Progress tile for the articles truncated' },
        { id: 'setup', label: 'Progress tile for the articles completed' },
        { id: 'usage', label: 'Progress tile for the articles in review' },
      ]}
      activeId="setup"
    />
  ),
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector(
      '.ion-scroll-progress__heading',
    ) as HTMLElement;
    const cs = getComputedStyle(heading);

    await expect(cs.textOverflow).toBe('ellipsis');
    await expect(cs.whiteSpace).toBe('nowrap');
    // Overflowing, not merely capable of it — the row is genuinely clipped.
    await expect(heading.scrollWidth).toBeGreaterThan(heading.clientWidth);
  },
};

/**
 * A real document index is as long as the document, so the panel caps at 60vh
 * — the same rung `.ion-popover__body` uses — and scrolls past it. Figma draws
 * seven rows and stops, because a Figma frame has no viewport to overflow.
 *
 * The row-height assertion is the load-bearing one. Every row sets
 * `overflow: hidden` for its ellipsis, which drops the automatic minimum size
 * that normally stops a column flex item from shrinking — so without
 * `flex-shrink: 0` the panel would meet its cap by squashing forty rows
 * rather than by overflowing, and every other assertion here would still
 * pass. Negative-tested by removing that line.
 */
export const LongListScrollsRatherThanGrowing: Story = {
  render: () => (
    <ScrollProgress progress={12} sections={MANY_SECTIONS} activeId="s3" />
  ),
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector(
      '.ion-scroll-progress__panel',
    ) as HTMLElement;
    const cs = getComputedStyle(panel);

    await expect(cs.overflowY).toBe('auto');
    await expect(cs.overscrollBehaviorY).toBe('contain');

    await expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(
      window.innerHeight * 0.6 + 1,
    );
    await expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);

    const heading = canvasElement.querySelector(
      '.ion-scroll-progress__heading',
    ) as HTMLElement;
    await expect(Math.round(heading.getBoundingClientRect().height)).toBe(34);
  },
};

/** The active tick is `border/stronger`, every other tick `border/strong` —
 *  the one visual difference the compact rail has to communicate. */
export const ActiveTickIsHeavier: Story = {
  render: () => (
    <ScrollProgress progress={32} sections={SECTIONS} activeId="setup" />
  ),
  play: async ({ canvasElement }) => {
    const ticks = canvasElement.querySelectorAll('.ion-scroll-progress__tick');
    const active = getComputedStyle(ticks[1]); // 'setup' is index 1
    const inactive = getComputedStyle(ticks[0]);

    await expect(active.backgroundColor).not.toBe(inactive.backgroundColor);

    const stronger = getComputedStyle(document.documentElement)
      .getPropertyValue('--border-stronger')
      .trim();
    const rgb = `rgb(${[1, 3, 5].map((i) => parseInt(stronger.slice(i, i + 2), 16)).join(', ')})`;
    await expect(active.backgroundColor).toBe(rgb);
  },
};

/**
 * Hovering the trigger reveals the panel; the panel's rows sit in normal tab
 * order rather than a roving-tabindex menu, so `Tab` reaches each row exactly
 * like it would inside any other disclosure.
 */
export const HoverRevealsPanel: Story = {
  render: () => (
    <ScrollProgress progress={32} sections={SECTIONS} activeId="setup" />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: /Reading progress/ });
    const panel = canvasElement.querySelector(
      '.ion-scroll-progress__panel',
    ) as HTMLElement;

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(getComputedStyle(panel).visibility).toBe('hidden');

    await userEvent.hover(trigger);
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(getComputedStyle(panel).visibility).toBe('visible');
    });

    await userEvent.unhover(trigger);
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(getComputedStyle(panel).visibility).toBe('hidden');
    });
  },
};

/**
 * Clicking a row fires `onSelect` with that section's id and closes the
 * panel — the component reports the choice, matching Menu; it does not
 * scroll anywhere itself.
 */
export const SelectingARowReportsTheChoice: Story = {
  render: function Render() {
    const [activeId, setActiveId] = useState('setup');
    return (
      <ScrollProgress
        progress={32}
        sections={SECTIONS}
        activeId={activeId}
        onSelect={setActiveId}
      />
    );
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: /Reading progress/ });
    const panel = canvasElement.querySelector(
      '.ion-scroll-progress__panel',
    ) as HTMLElement;

    await userEvent.hover(trigger);
    // The panel's reveal is a CSS transition, so `aria-expanded` flipping
    // doesn't guarantee the row is accessible yet — wait for the transition
    // to actually finish before looking for it.
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(getComputedStyle(panel).visibility).toBe('visible');
    });

    const apiRow = canvas.getByRole('button', { name: 'API reference' });
    // `fireEvent`, not `userEvent.click`: the pointer simulator behind
    // `userEvent` moves to a target in one step rather than tracing a real
    // cursor path, so it can't cross the trigger-to-panel gap a real hover
    // does (that path — and the panel staying open across it — is what
    // `HoverRevealsPanel` covers). This test is about row-selection once
    // open, not the reveal itself.
    await fireEvent.click(apiRow);

    await waitFor(async () => {
      await expect(
        apiRow.classList.contains('ion-scroll-progress__heading--selected'),
      ).toBe(true);
      await expect(getComputedStyle(panel).visibility).toBe('hidden');
    });
  },
};

/** Escape closes the panel without requiring a click outside. */
export const EscapeCloses: Story = {
  render: () => (
    <ScrollProgress progress={32} sections={SECTIONS} activeId="setup" />
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: /Reading progress/ });
    const panel = canvasElement.querySelector(
      '.ion-scroll-progress__panel',
    ) as HTMLElement;

    await userEvent.hover(trigger);
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(getComputedStyle(panel).visibility).toBe('visible');
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(getComputedStyle(panel).visibility).toBe('hidden');
    });
  },
};
