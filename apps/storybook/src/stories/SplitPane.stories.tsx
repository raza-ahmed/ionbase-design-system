import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { page, userEvent } from 'vitest/browser';
import { SplitPane } from 'ionbase-ui';

const Pane = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{ padding: 16, background: 'var(--surface-muted)', height: '100%' }}
  >
    {children}
  </div>
);

const meta: Meta<typeof SplitPane> = {
  title: 'Components/SplitPane',
  component: SplitPane,
  tags: ['autodocs'],
  args: {
    label: 'Resize the request',
    start: <Pane>The request</Pane>,
    end: <Pane>The response</Pane>,
    collapse: 'never',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 800, height: 240 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Two panes and a divider a person moves — for two views read across, where which one needs the room depends on the reader.\n\n**The window-splitter pattern.** The divider is a focusable `separator` whose value is the first pane's share, in percent; the arrow keys move it, Home and End go to the bounds, Enter and a double-click put it back. **On a phone the panes stack** and the divider goes (`collapse`, mobile by default). For detail that opens and closes, use SidePanel; for columns nobody resizes, Grid.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SplitPane>;

const divider = (el: HTMLElement) =>
  within(el).getByRole('separator', { name: 'Resize the request' });
const startWidth = (el: HTMLElement) =>
  el
    .querySelector<HTMLElement>('.ion-split-pane__start')!
    .getBoundingClientRect().width;
const startHeight = (el: HTMLElement) =>
  el
    .querySelector<HTMLElement>('.ion-split-pane__start')!
    .getBoundingClientRect().height;

export const Default: Story = {};

export const Vertical: Story = { args: { orientation: 'vertical' } };

/** The window-splitter pattern: a named, focusable separator with a value. */
export const TheDividerIsASeparator: Story = {
  args: { defaultSize: 40 },
  play: async ({ canvasElement }) => {
    const sep = divider(canvasElement);
    await expect(sep).toHaveAttribute('tabindex', '0');
    await expect(sep).toHaveAttribute('aria-orientation', 'vertical');
    await expect(sep).toHaveAttribute('aria-valuenow', '40');
    await expect(sep).toHaveAttribute('aria-valuemin', '20');
    await expect(sep).toHaveAttribute('aria-valuemax', '80');
    const controlled = document.getElementById(
      sep.getAttribute('aria-controls')!,
    );
    await expect(controlled).toHaveTextContent('The request');
    await expect(startWidth(canvasElement)).toBeCloseTo(320, -1);
  },
};

/** Arrows move it 2%, Shift 10%; Home and End go to the bounds. */
export const TheKeyboardMovesIt: Story = {
  play: async ({ canvasElement }) => {
    const sep = divider(canvasElement);
    sep.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(sep).toHaveAttribute('aria-valuenow', '52');
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await expect(sep).toHaveAttribute('aria-valuenow', '62');
    await userEvent.keyboard('{ArrowLeft}');
    await expect(sep).toHaveAttribute('aria-valuenow', '60');
    await expect(startWidth(canvasElement)).toBeCloseTo(480, -1);
    await userEvent.keyboard('{Home}');
    await expect(sep).toHaveAttribute('aria-valuenow', '20');
    await userEvent.keyboard('{ArrowLeft}');
    await expect(sep).toHaveAttribute('aria-valuenow', '20');
    await userEvent.keyboard('{End}');
    await expect(sep).toHaveAttribute('aria-valuenow', '80');
  },
};

/** Enter and a double-click put it back where it started. */
export const EnterAndADoubleClickPutItBack: Story = {
  args: { defaultSize: 40 },
  play: async ({ canvasElement }) => {
    const sep = divider(canvasElement);
    sep.focus();
    await userEvent.keyboard('{End}');
    await userEvent.keyboard('{Enter}');
    await expect(sep).toHaveAttribute('aria-valuenow', '40');
    await userEvent.keyboard('{Home}');
    await userEvent.dblClick(sep);
    await expect(sep).toHaveAttribute('aria-valuenow', '40');
  },
};

/** Right to left: the first pane is on the right, so → shrinks it. */
export const RightToLeftFollowsTheArrow: Story = {
  decorators: [
    (Story) => (
      <div dir="rtl" style={{ width: 800, height: 240 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const sep = divider(canvasElement);
    sep.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(sep).toHaveAttribute('aria-valuenow', '48');
    const start = canvasElement.querySelector('.ion-split-pane__start')!;
    const end = canvasElement.querySelector('.ion-split-pane__end')!;
    await expect(start.getBoundingClientRect().left).toBeGreaterThan(
      end.getBoundingClientRect().left,
    );
  },
};

/** Stacked panes: a horizontal divider, moved with ↑ and ↓. */
export const VerticalUsesUpAndDown: Story = {
  args: { orientation: 'vertical' },
  play: async ({ canvasElement }) => {
    const sep = divider(canvasElement);
    await expect(sep).toHaveAttribute('aria-orientation', 'horizontal');
    sep.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(sep).toHaveAttribute('aria-valuenow', '50');
    await userEvent.keyboard('{ArrowDown}');
    await expect(sep).toHaveAttribute('aria-valuenow', '52');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    await expect(sep).toHaveAttribute('aria-valuenow', '48');
    await expect(startHeight(canvasElement)).toBeCloseTo(240 * 0.48, -1);
  },
};

/** A drag moves it with the pointer, within the bounds. */
export const DraggingMovesIt: Story = {
  render: (args) => (
    <>
      <SplitPane {...args} />
      <div
        data-testid="at-70"
        style={{ marginLeft: 560 - 5, width: 10, height: 10 }}
      />
      <div
        data-testid="at-95"
        style={{ marginLeft: 760 - 5, width: 10, height: 10 }}
      />
    </>
  ),
  decorators: [
    (Story) => (
      <div style={{ width: 800 }}>
        <div style={{ height: 240, display: 'flex', flexDirection: 'column' }}>
          <Story />
        </div>
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sep = divider(canvasElement);
    await userEvent.dragAndDrop(sep, canvas.getByTestId('at-70'));
    await expect(Number(sep.getAttribute('aria-valuenow'))).toBeCloseTo(70, -1);
    await expect(sep).not.toHaveAttribute('data-resizing');
    await expect(sep).toHaveFocus();
    await userEvent.dragAndDrop(sep, canvas.getByTestId('at-95'));
    await expect(sep).toHaveAttribute('aria-valuenow', '80');
  },
};

/** Controlled: `size` holds it, and `onSizeChange` reports the move. */
export const ControlledIsHeld: Story = {
  args: { size: 50, onSizeChange: fn() },
  play: async ({ canvasElement, args }) => {
    const sep = divider(canvasElement);
    sep.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onSizeChange).toHaveBeenLastCalledWith(52);
    await expect(sep).toHaveAttribute('aria-valuenow', '50');
  },
};

function Kept() {
  const [size, setSize] = useState(30);
  return (
    <>
      <SplitPane
        label="Resize the request"
        start={<Pane>The request</Pane>}
        end={<Pane>The response</Pane>}
        size={size}
        onSizeChange={setSize}
        collapse="never"
      />
      <output>{size}</output>
    </>
  );
}

/** Controlled and kept by the parent. */
export const ControlledAndKept: Story = {
  render: () => <Kept />,
  play: async ({ canvasElement }) => {
    const sep = divider(canvasElement);
    sep.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(
      '34',
    );
    await expect(sep).toHaveAttribute('aria-valuenow', '34');
  },
};

/** Each pane scrolls on its own, and its content cannot widen it. */
export const EachPaneScrollsOnItsOwn: Story = {
  args: {
    defaultSize: 30,
    start: (
      <Pane>
        <div style={{ width: 900 }}>A line far wider than its pane.</div>
      </Pane>
    ),
    end: <Pane>{'A long response. '.repeat(80)}</Pane>,
  },
  play: async ({ canvasElement }) => {
    await expect(startWidth(canvasElement)).toBeCloseTo(240, -1);
    const [start, end] = canvasElement.querySelectorAll<HTMLElement>(
      '.ion-split-pane__pane',
    );
    await expect(start.scrollWidth).toBeGreaterThan(start.clientWidth);
    await expect(end.scrollHeight).toBeGreaterThan(end.clientHeight);
    await expect(end.getBoundingClientRect().right).toBeLessThanOrEqual(
      canvasElement.querySelector('.ion-split-pane')!.getBoundingClientRect()
        .right + 0.5,
    );
  },
};

/** The grip marks the divider as movable, and turns to the focus colour. */
export const TheGripShowsItMoves: Story = {
  play: async ({ canvasElement }) => {
    const sep = divider(canvasElement);
    const grip = () => getComputedStyle(sep, '::after');
    await expect(grip().width).toBe('4px');
    await expect(grip().height).toBe('24px');
    const idle = grip().backgroundColor;
    await expect(idle).not.toBe('rgba(0, 0, 0, 0)');
    sep.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(grip().backgroundColor).not.toBe(idle);
  },
};

/** On a phone the panes stack, and the divider leaves the tab order. */
export const APhoneStacksThePanes: Story = {
  args: { collapse: 'mobile' },
  decorators: [(Story) => <Story />],
  play: async ({ canvasElement }) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    await page.viewport(390, 800);
    try {
      const sep =
        canvasElement.querySelector<HTMLElement>('[role="separator"]')!;
      await expect(getComputedStyle(sep).display).toBe('none');
      const [start, end] = canvasElement.querySelectorAll<HTMLElement>(
        '.ion-split-pane__pane',
      );
      await expect(end.getBoundingClientRect().top).toBeGreaterThan(
        start.getBoundingClientRect().bottom - 0.5,
      );
      await expect(start.getBoundingClientRect().width).toBeCloseTo(
        end.getBoundingClientRect().width,
        0,
      );
    } finally {
      await page.viewport(width, height);
    }
  },
};
