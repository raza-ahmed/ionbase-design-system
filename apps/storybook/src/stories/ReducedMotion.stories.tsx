import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { commands } from 'vitest/browser';
import {
  Accordion,
  AccordionItem,
  Button,
  ProgressBar,
  Slider,
  Spinner,
  StatusIndicator,
} from 'ionbase-ui';

/**
 * `prefers-reduced-motion: reduce`, emulated. One global block in index.css
 * takes every `ion-*` transition and animation to a single 0.01ms run; the
 * loops that must keep moving to mean anything out-rank it and slow down.
 *
 * These run under the test runner, which owns the emulation. In the Storybook
 * UI, turn on "Emulate CSS media feature prefers-reduced-motion" in DevTools
 * to see the same thing.
 */
const meta: Meta = {
  title: 'Foundations/Reduced motion',
  parameters: {
    docs: {
      description: {
        component:
          'Reduced motion takes every transition to its end state at once, and stops every animation after one frame — except the two loops whose movement is the message. **Spinner** and the indeterminate **ProgressBar** keep moving, slowed to twice and two and a half times the `cycle` rung, because a still spinner cannot be told from a hung one. The working glyphs in StatusIndicator, AgentActivity and ToolCall stop instead: their arc says "in progress" without turning.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** 0.01ms, as the browser reports it. */
const NO_MOTION = '1e-05s';

const reduced = async () => {
  await commands.reducedMotion(true);
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r)),
  );
};

/** The emulation is real: the query matches. */
export const TheModeIsOn: Story = {
  render: () => <Button>Save</Button>,
  play: async () => {
    await reduced();
    await expect(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    ).toBe(true);
  },
};

/** A transition on an element, and inside one, goes to its end at once. */
export const TransitionsFinishAtOnce: Story = {
  render: () => (
    <>
      <Button>Save</Button>
      <Accordion>
        <AccordionItem id="one" title="Details">
          Content
        </AccordionItem>
      </Accordion>
    </>
  ),
  play: async ({ canvasElement }) => {
    await reduced();
    const button = within(canvasElement).getByRole('button', { name: 'Save' });
    await expect(getComputedStyle(button).transitionDuration).toContain(
      NO_MOTION,
    );
    const indicator = canvasElement.querySelector<HTMLElement>(
      '.ion-accordion__indicator',
    )!;
    await expect(getComputedStyle(indicator).transitionDuration).toBe(
      NO_MOTION,
    );
  },
};

/** `::before` and `::after` too — Slider's thumb halo moved until 0.135.0. */
export const APseudoElementFinishesAtOnce: Story = {
  render: () => <Slider label="Volume" defaultValue={40} />,
  play: async ({ canvasElement }) => {
    const thumb =
      canvasElement.querySelector<HTMLElement>('.ion-slider__thumb')!;
    await expect(getComputedStyle(thumb, '::before').transitionDuration).toBe(
      '0.12s',
    );
    await reduced();
    await expect(getComputedStyle(thumb, '::before').transitionDuration).toBe(
      NO_MOTION,
    );
  },
};

/** Slowed, not stopped: a still spinner cannot be told from a hung one. */
export const ASpinnerKeepsTurningSlowly: Story = {
  render: () => <Spinner label="Loading" />,
  play: async ({ canvasElement }) => {
    await reduced();
    const ring =
      canvasElement.querySelector<HTMLElement>('.ion-spinner__ring')!;
    await expect(getComputedStyle(ring).animationDuration).toBe('2.4s');
    await expect(getComputedStyle(ring).animationIterationCount).toBe(
      'infinite',
    );
    await new Promise((r) => setTimeout(r, 100));
    const [turn] = ring.getAnimations();
    await expect(turn?.playState).toBe('running');
  },
};

/** The indeterminate bar keeps sliding, slower. */
export const AnIndeterminateBarKeepsSliding: Story = {
  render: () => <ProgressBar label="Importing" />,
  play: async ({ canvasElement }) => {
    await reduced();
    const fill = canvasElement.querySelector<HTMLElement>(
      '.ion-progress-bar__fill',
    )!;
    await expect(getComputedStyle(fill).animationDuration).toBe('3s');
    await expect(getComputedStyle(fill).animationIterationCount).toBe(
      'infinite',
    );
    await new Promise((r) => setTimeout(r, 100));
    await expect(fill.getAnimations()[0]?.playState).toBe('running');
  },
};

/** A working glyph turns once per `cycle`, and stops: its arc is the signal. */
export const AWorkingGlyphStops: Story = {
  render: () => <StatusIndicator intent="progress">Running</StatusIndicator>,
  play: async ({ canvasElement }) => {
    const arc = canvasElement.querySelector<SVGElement>(
      '.ion-status__icon svg',
    )!;
    await expect(getComputedStyle(arc).animationDuration).toBe('1.2s');
    await reduced();
    await expect(getComputedStyle(arc).animationName).toBe('none');
  },
};
