import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, waitFor } from 'storybook/test';
import { ScrollProgress } from '@ionbase/react';

const SECTIONS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'setup', label: 'Getting started' },
  { id: 'usage', label: 'Usage' },
  { id: 'api', label: 'API reference' },
  { id: 'faq', label: 'FAQ' },
];

const meta: Meta<typeof ScrollProgress> = {
  title: 'Components/ScrollProgress',
  component: ScrollProgress,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Line` / `Progress` / `Progress Heading` (191:927).\n\n`progress` and `activeId` are props, not something this component tracks itself — the same reason `Select` takes `value` rather than reading scroll position from the DOM. Which container scrolls and how "the active section" is defined are facts only the consuming app has.\n\nThe disclosure follows the WAI-ARIA Disclosure pattern (`aria-expanded` + `aria-controls`), not a menu role: its rows sit in normal tab order rather than the roving-tabindex arrow-key model `role="menu"` would promise.',
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

/** Figma: tick width 32, 2px stroke (`border-width/thick`, not the default
 *  1px every other hairline in the system uses), 12px gap between ticks. */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => (
    <ScrollProgress progress={32} sections={SECTIONS} activeId="setup" />
  ),
  play: async ({ canvasElement }) => {
    const tick = canvasElement.querySelector(
      '.ion-scroll-progress__tick',
    ) as HTMLElement;
    const cs = getComputedStyle(tick);

    await expect(Math.round(tick.getBoundingClientRect().width)).toBe(32);
    await expect(cs.height).toBe('2px');

    const rail = canvasElement.querySelector(
      '.ion-scroll-progress__rail',
    ) as HTMLElement;
    await expect(getComputedStyle(rail).rowGap).toBe('12px');
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
