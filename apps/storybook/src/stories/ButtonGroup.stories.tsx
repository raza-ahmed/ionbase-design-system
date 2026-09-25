import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { page, userEvent as browserUser } from 'vitest/browser';
import { Button, ButtonGroup, Link, type ButtonGroupProps } from 'ionbase-ui';

/** A group whose buttons write what they did, so a test can read it. */
function Harness({
  width = 560,
  dir,
  ...props
}: Partial<ButtonGroupProps> & { width?: number | string; dir?: string }) {
  const [did, setDid] = useState('');
  return (
    <div dir={dir} style={{ width }} data-testid="box">
      <ButtonGroup {...props}>
        {props.children ?? [
          <Button
            key="dup"
            variant="tertiary"
            onPress={() => setDid('duplicated')}
          >
            Duplicate
          </Button>,
          <Button
            key="exp"
            variant="tertiary"
            onClick={() => setDid('exported')}
          >
            Export
          </Button>,
          <Button key="arc" variant="secondary" isDisabled>
            Archive
          </Button>,
          <Button key="save" onPress={() => setDid('saved')}>
            Save changes
          </Button>,
        ]}
      </ButtonGroup>
      <output data-testid="did">{did}</output>
    </div>
  );
}

const meta: Meta<typeof ButtonGroup> = {
  title: 'Components/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A row of actions — a dialog\'s Cancel and Confirm, a form\'s Back, Save and Next. It owns the gap (8px), the order (reading order, primary last — nothing is reversed), and what happens when the row runs out of room: `wrap` by default, or `overflow="menu"`, which moves the Buttons that do not fit into a More actions menu, first child first. `stack` puts them one per line on a phone. Each action is its own tab stop; a row of many controls on one thing is a Toolbar.',
      },
    },
  },
  render: () => <Harness />,
};

export default meta;
type Story = StoryObj<typeof ButtonGroup>;

export const Default: Story = {};
export const WithStart: Story = {
  render: () => (
    <Harness
      start={
        <Button variant="tertiary" key="back">
          Back
        </Button>
      }
    >
      <Button variant="secondary">Save and exit</Button>
      <Button>Next: Guardrails</Button>
    </Harness>
  ),
};
export const OverflowMenu: Story = {
  render: () => <Harness overflow="menu" width={300} />,
};

// ------------------------------------------------------------------ tests

const btn = (c: ReturnType<typeof within>, name: string) =>
  c.getByRole('button', { name });
const box = (el: Element) => el.getBoundingClientRect();

/** Drawn in reading order, primary last, 8px apart, at the end of the row. */
export const ReadingOrderPrimaryLastAtTheEnd: Story = {
  play: async ({ canvas, canvasElement }) => {
    const labels = canvas.getAllByRole('button').map((b) => b.textContent);
    await expect(labels).toEqual([
      'Duplicate',
      'Export',
      'Archive',
      'Save changes',
    ]);
    const [a, b] = [btn(canvas, 'Duplicate'), btn(canvas, 'Export')];
    await expect(Math.round(box(b).left - box(a).right)).toBe(8);
    const group = canvasElement.querySelector('.ion-button-group')!;
    await expect(Math.round(box(btn(canvas, 'Save changes')).right)).toBe(
      Math.round(box(group).right),
    );
    await expect(box(b).left).toBeGreaterThan(box(a).left);
  },
};

/** Right to left, the same order reads the other way: the primary is leftmost. */
export const RightToLeftMirrors: Story = {
  render: () => <Harness dir="rtl" />,
  play: async ({ canvas, canvasElement }) => {
    const group = canvasElement.querySelector('.ion-button-group')!;
    await expect(Math.round(box(btn(canvas, 'Save changes')).left)).toBe(
      Math.round(box(group).left),
    );
  },
};

/** `start` sits at the start edge, apart from the rest. */
export const StartSitsAtTheStartEdge: Story = {
  ...WithStart,
  play: async ({ canvas, canvasElement }) => {
    const group = canvasElement.querySelector('.ion-button-group')!;
    await expect(Math.round(box(btn(canvas, 'Back')).left)).toBe(
      Math.round(box(group).left),
    );
    await expect(Math.round(box(btn(canvas, 'Next: Guardrails')).right)).toBe(
      Math.round(box(group).right),
    );
  },
};

export const AlignCenterAndStart: Story = {
  render: () => (
    <>
      <Harness align="center" />
      <Harness align="start" />
    </>
  ),
  play: async ({ canvasElement }) => {
    const [center, start] = [
      ...canvasElement.querySelectorAll('.ion-button-group'),
    ];
    const buttons = (g: Element) => [...g.querySelectorAll('button')];
    const cb = buttons(center);
    const left = box(cb[0]).left - box(center).left;
    const right = box(center).right - box(cb[cb.length - 1]).right;
    await expect(Math.abs(left - right)).toBeLessThan(1.5);
    await expect(Math.round(box(buttons(start)[0]).left)).toBe(
      Math.round(box(start).left),
    );
  },
};

/** Out of room, the default wraps: every action stays, on a second line. */
export const WrapsByDefault: Story = {
  render: () => <Harness width={300} />,
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(4);
    await expect(
      canvas.queryByRole('button', { name: 'More actions' }),
    ).toBeNull();
    await expect(box(btn(canvas, 'Save changes')).top).toBeGreaterThan(
      box(btn(canvas, 'Duplicate')).bottom - 1,
    );
  },
};

/**
 * `menu`: the row stays on one line and inside its box. The first Buttons
 * move into More actions, which sits where they were; the primary stays.
 */
export const MenuMovesTheFirstButtonsIntoMore: Story = {
  ...OverflowMenu,
  play: async ({ canvas }) => {
    const more = btn(canvas, 'More actions');
    const save = btn(canvas, 'Save changes');
    await expect(
      canvas.queryByRole('button', { name: 'Duplicate' }),
    ).toBeNull();
    await expect(Math.round(box(more).top)).toBe(Math.round(box(save).top));
    await expect(box(more).right).toBeLessThan(box(save).left);
    const b = box(canvas.getByTestId('box'));
    for (const el of canvas.getAllByRole('button'))
      await expect(box(el).right).toBeLessThanOrEqual(b.right + 0.5);

    await userEvent.click(more);
    const menu = await within(document.body).findByRole('menu');
    const names = within(menu)
      .getAllByRole('menuitem')
      .map((m) => m.textContent);
    // Every hidden action, in the order it had in the row.
    await expect(names[0]).toBe('Duplicate');
    await expect(names).not.toContain('Save changes');
  },
};

/** A menu item presses the real Button: onPress and onClick both fire. */
export const AMenuItemPressesTheButton: Story = {
  render: () => <Harness overflow="menu" width={220} />,
  play: async ({ canvas }) => {
    const body = within(document.body);
    await userEvent.click(btn(canvas, 'More actions'));
    await userEvent.click(
      await body.findByRole('menuitem', { name: 'Duplicate' }),
    );
    await expect(canvas.getByTestId('did')).toHaveTextContent('duplicated');
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());

    await userEvent.click(btn(canvas, 'More actions'));
    await userEvent.click(
      await body.findByRole('menuitem', { name: 'Export' }),
    );
    await expect(canvas.getByTestId('did')).toHaveTextContent('exported');
  },
};

/** A disabled Button is a disabled menu item. */
export const DisabledStaysDisabledInTheMenu: Story = {
  render: () => <Harness overflow="menu" width={220} />,
  play: async ({ canvas }) => {
    await userEvent.click(btn(canvas, 'More actions'));
    const item = await within(document.body).findByRole('menuitem', {
      name: 'Archive',
    });
    await expect(item).toHaveAttribute('aria-disabled', 'true');
  },
};

/** With room again, every action comes back and More goes. */
export const MenuGivesActionsBackWithRoom: Story = {
  render: () => {
    const [w, setW] = useState(300);
    return (
      <>
        <button type="button" onClick={() => setW(640)}>
          Widen
        </button>
        <Harness overflow="menu" width={w} />
      </>
    );
  },
  play: async ({ canvas }) => {
    await expect(btn(canvas, 'More actions')).toBeInTheDocument();
    await userEvent.click(btn(canvas, 'Widen'));
    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: 'More actions' })).toBeNull(),
    );
    await expect(btn(canvas, 'Duplicate')).toBeVisible();
    // Everything shown, the row still sits at the end.
    const group = canvas.getByTestId('box').querySelector('.ion-button-group')!;
    await expect(Math.round(box(btn(canvas, 'Save changes')).right)).toBe(
      Math.round(box(group).right),
    );
  },
};

/** However narrow, the primary never moves into the menu. */
export const ThePrimaryNeverCollapses: Story = {
  render: () => <Harness overflow="menu" width={120} />,
  play: async ({ canvas }) => {
    await expect(btn(canvas, 'Save changes')).toBeVisible();
    await userEvent.click(btn(canvas, 'More actions'));
    const menu = await within(document.body).findByRole('menu');
    await expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((m) => m.textContent),
    ).toEqual(['Duplicate', 'Export', 'Archive']);
  },
};

/**
 * In a parent that sizes to its content — a page header's actions beside a
 * title that takes the rest — the row shrinks with the room and grows back.
 */
export const MenuRegrowsInAShrinkToFitParent: Story = {
  render: () => {
    const [w, setW] = useState(460);
    return (
      <>
        <button type="button" onClick={() => setW(900)}>
          Widen
        </button>
        <div style={{ display: 'flex', gap: 16, width: w }}>
          <h2 style={{ flex: 1, minWidth: 120, margin: 0 }}>Run 4821</h2>
          <div style={{ flex: '0 1 auto', minWidth: 0 }}>
            <Harness overflow="menu" width="auto" />
          </div>
        </div>
      </>
    );
  },
  play: async ({ canvas }) => {
    await expect(btn(canvas, 'More actions')).toBeInTheDocument();
    await userEvent.click(btn(canvas, 'Widen'));
    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: 'More actions' })).toBeNull(),
    );
  },
};

/**
 * Only Buttons collapse: a Link keeps its place, like the primary — and it
 * does not stop the Button after it from collapsing.
 */
export const OnlyButtonsCollapse: Story = {
  render: () => (
    <Harness overflow="menu" width={200}>
      <Link href="#docs">Read the docs</Link>
      <Button variant="tertiary">Duplicate</Button>
      <Button>Save changes</Button>
    </Harness>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'Read the docs' }),
    ).toBeVisible();
    await expect(btn(canvas, 'Save changes')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Duplicate' }),
    ).toBeNull();
    await expect(btn(canvas, 'More actions')).toBeVisible();
  },
};

/** Hidden actions are out of the Tab order: Tab goes More → the primary. */
export const HiddenActionsAreNotTabStops: Story = {
  ...OverflowMenu,
  play: async ({ canvas }) => {
    btn(canvas, 'More actions').focus();
    await browserUser.keyboard('{Tab}');
    await expect(document.activeElement?.textContent).not.toBe('Duplicate');
    await expect(
      ['Export', 'Archive', 'Save changes'].includes(
        document.activeElement?.textContent ?? '',
      ),
    ).toBe(true);
  },
};

/** `stack` on a phone: one per line, full width, in reading order. */
export const StackOnAPhone: Story = {
  render: () => <Harness stack overflow="menu" width="100%" />,
  play: async ({ canvas, canvasElement }) => {
    const [w, h] = [window.innerWidth, window.innerHeight];
    // Wide, it is an ordinary row: the primary is not full width.
    await expect(box(btn(canvas, 'Save changes')).width).toBeLessThan(300);
    await page.viewport(375, 700);
    try {
      await waitFor(() =>
        expect(
          canvas.queryByRole('button', { name: 'More actions' }),
        ).toBeNull(),
      );
      const group = canvasElement.querySelector('.ion-button-group')!;
      const bs = canvas.getAllByRole('button');
      await expect(bs.map((b) => b.textContent)).toEqual([
        'Duplicate',
        'Export',
        'Archive',
        'Save changes',
      ]);
      for (const b of bs)
        await expect(Math.round(box(b).width)).toBe(
          Math.round(box(group).width),
        );
      await expect(box(bs[3]).top).toBeGreaterThan(box(bs[0]).top);
    } finally {
      await page.viewport(w, h);
    }
  },
};
