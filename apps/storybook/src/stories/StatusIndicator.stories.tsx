import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { StatusIndicator, type StatusIndicatorIntent } from 'ionbase-ui';

const ALL: [StatusIndicatorIntent, string][] = [
  ['success', 'Running'],
  ['warning', 'Expiring'],
  ['error', 'Failing'],
  ['information', 'Draft'],
  ['neutral', 'Paused'],
  ['progress', 'Deploying'],
];

const meta: Meta<typeof StatusIndicator> = {
  title: 'Components/StatusIndicator',
  component: StatusIndicator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "A status as a shape, a colour and a word together — the fix for a table's coloured dots, which say nothing to anyone who cannot tell the colours apart (WCAG 1.4.1). Every intent has its own shape; only the shape is coloured, and the word keeps the text colour. It does not announce itself when it changes.",
      },
    },
  },
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {ALL.map(([intent, label]) => (
        <StatusIndicator key={intent} intent={intent}>
          {label}
        </StatusIndicator>
      ))}
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof StatusIndicator>;

export const AllIntents: Story = {};
export const Medium: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12 }}>
      {ALL.map(([intent, label]) => (
        <StatusIndicator key={intent} intent={intent} size="md">
          {label}
        </StatusIndicator>
      ))}
    </div>
  ),
};

// ------------------------------------------------------------------ tests

const indicators = (el: HTMLElement) =>
  [...el.querySelectorAll('.ion-status')] as HTMLElement[];

/**
 * Six intents, six shapes: with the colour taken away, every status still
 * looks different.
 */
export const EveryIntentHasItsOwnShape: Story = {
  play: async ({ canvasElement }) => {
    const shapes = indicators(canvasElement).map(
      (s) => s.querySelector('svg')!.innerHTML,
    );
    await expect(shapes).toHaveLength(6);
    await expect(new Set(shapes).size).toBe(6);
  },
};

/**
 * The word is the name: the icon is hidden from assistive tech, and there is
 * no role or live region — a table of them does not announce each change.
 */
export const TheWordIsTheName: Story = {
  play: async ({ canvas, canvasElement }) => {
    for (const s of indicators(canvasElement)) {
      await expect(s.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      await expect(s).not.toHaveAttribute('role');
      await expect(s).not.toHaveAttribute('aria-live');
    }
    await expect(canvas.getByText('Failing')).toBeVisible();
  },
};

/**
 * Only the shape is coloured. The word keeps the text colour in every
 * intent; the shapes take their intent's colour, and those differ.
 */
export const OnlyTheShapeIsColoured: Story = {
  play: async ({ canvasElement }) => {
    const [first, ...rest] = indicators(canvasElement);
    const text = (s: HTMLElement) =>
      getComputedStyle(s.querySelector('.ion-status__label')!).color;
    const icon = (s: HTMLElement) =>
      getComputedStyle(s.querySelector('.ion-status__icon')!).color;
    for (const s of rest) await expect(text(s)).toBe(text(first));
    const icons = indicators(canvasElement).map(icon);
    await expect(new Set(icons).size).toBe(6);
    await expect(icons).not.toContain(text(first));
  },
};

/** In progress spins; nothing else moves. */
export const OnlyProgressMoves: Story = {
  play: async ({ canvasElement }) => {
    for (const s of indicators(canvasElement)) {
      const moving =
        getComputedStyle(s.querySelector('svg')!).animationName !== 'none';
      await expect(moving).toBe(s.dataset.intent === 'progress');
    }
  },
};

/** 16px shapes by default, for table cells; 20px at `md`. */
export const SizesAre16And20: Story = {
  render: () => (
    <>
      <StatusIndicator intent="success">Running</StatusIndicator>
      <StatusIndicator intent="success" size="md">
        Running
      </StatusIndicator>
    </>
  ),
  play: async ({ canvasElement }) => {
    const [sm, md] = indicators(canvasElement).map(
      (s) => s.querySelector('svg')!.getBoundingClientRect().width,
    );
    await expect([sm, md]).toEqual([16, 20]);
  },
};

/** In a narrow cell it stays one line: the shape never ends up alone. */
export const StaysOnOneLine: Story = {
  render: () => (
    <div style={{ width: 40 }}>
      <StatusIndicator intent="warning">Needs review</StatusIndicator>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [s] = indicators(canvasElement);
    // One 20px line.
    await expect(s.getBoundingClientRect().height).toBeLessThanOrEqual(20);
  },
};

/** Neutral is the default intent. */
export const NeutralByDefault: Story = {
  render: () => <StatusIndicator>Paused</StatusIndicator>,
  play: async ({ canvasElement }) => {
    await expect(indicators(canvasElement)[0]).toHaveClass(
      'ion-status--neutral',
    );
  },
};

/** Other attributes reach the element — a `title`, a test id. */
export const PassesAttributesThrough: Story = {
  render: () => (
    <StatusIndicator intent="error" title="Since 09:12" data-testid="s">
      Failing
    </StatusIndicator>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('s')).toHaveAttribute(
      'title',
      'Since 09:12',
    );
  },
};
