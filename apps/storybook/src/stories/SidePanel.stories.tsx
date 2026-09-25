import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import {
  Badge,
  Button,
  SidePanel,
  SidePanelLayout,
  Toggletip,
  type SidePanelProps,
} from 'ionbase-ui';

const RUNS = [
  { id: 'run_4821', task: 'Reconcile March invoices', outcome: 'Completed' },
  { id: 'run_4822', task: 'Draft refund replies', outcome: 'Rejected' },
  { id: 'run_4823', task: 'Tag new tickets', outcome: 'Failed' },
];

/**
 * A list with a detail panel beside it. The panel is opened by picking a
 * row, and stays open while another is picked — the list is never blocked.
 */
function Composed({
  panel,
  wide = false,
  initial = null,
}: {
  panel?: Partial<SidePanelProps>;
  wide?: boolean;
  initial?: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(initial);
  const run = RUNS.find((r) => r.id === selected);
  return (
    <>
      <SidePanelLayout>
        <div>
          <h2 className="ion-text-h6">Runs</h2>
          <ul
            style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 4 }}
          >
            {RUNS.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={r.id === selected}
                  onClick={() => setSelected(r.id)}
                >
                  {r.task}
                </button>
              </li>
            ))}
          </ul>
          {wide && (
            <div style={{ overflowX: 'auto' }} data-testid="wide">
              <div style={{ width: 2000, height: 8 }} />
            </div>
          )}
        </div>
        <SidePanel
          overlayBelow={false}
          size="sm"
          {...panel}
          isOpen={!!run}
          onOpenChange={(open) => !open && setSelected(null)}
          title={run?.task}
          description={run?.id}
          footer={
            <Button size="sm" variant="secondary">
              Open run
            </Button>
          }
        >
          <p>
            <Badge size="sm">{run?.outcome}</Badge>{' '}
            <Toggletip aria-label="About outcomes" size="sm">
              How a run ended.
            </Toggletip>
          </p>
        </SidePanel>
      </SidePanelLayout>
      <button type="button">After the layout</button>
    </>
  );
}

const meta: Meta<typeof SidePanel> = {
  title: 'Components/SidePanel',
  component: SidePanel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Detail that opens beside the content and leaves it usable — pick a row, read it in the panel, pick the next. Not a Drawer: a Drawer is a modal dialog that traps focus and hides the page. This is a labelled region in the page's own flow.\n\nOpening focuses its title; closing with focus inside returns focus to where the user last was outside. Escape closes it from inside. Below 768px there is no room beside the content, so it opens as a Drawer.",
      },
    },
  },
  render: () => <Composed initial="run_4821" />,
};

export default meta;
type Story = StoryObj<typeof SidePanel>;

export const Default: Story = {};

// ------------------------------------------------------------------ tests

const rowButton = (c: ReturnType<typeof within>, task: string) =>
  c.getByRole('button', { name: task });

/** A region named by its title — not a dialog, and nothing is hidden. */
export const IsANamedRegionNotADialog: Story = {
  play: async ({ canvas, canvasElement }) => {
    const region = canvas.getByRole('region', {
      name: 'Reconcile March invoices',
    });
    await expect(region.tagName).toBe('SECTION');
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(
      canvasElement.querySelector('[aria-hidden="true"]:not(svg), [inert]'),
    ).toBeNull();
    // Rendered in place, in reading order after the content.
    await expect(
      canvasElement.querySelector('.ion-side-panel-layout')!.lastElementChild,
    ).toBe(region);
  },
};

export const ClosedRendersNothing: Story = {
  render: () => <Composed />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('region')).toBeNull();
  },
};

/** Opening moves focus to the title, so the panel is announced. */
export const OpeningFocusesTheTitle: Story = {
  render: () => <Composed />,
  play: async ({ canvas }) => {
    await userEvent.click(rowButton(canvas, 'Draft refund replies'));
    await expect(
      canvas.getByRole('heading', { name: 'Draft refund replies' }),
    ).toHaveFocus();
  },
};

/**
 * With the panel open the list still works, and picking another row swaps
 * the content without pulling focus into the panel.
 */
export const TheListStaysUsable: Story = {
  play: async ({ canvas }) => {
    const next = rowButton(canvas, 'Tag new tickets');
    await userEvent.click(next);
    await expect(
      canvas.getByRole('region', { name: 'Tag new tickets' }),
    ).toBeInTheDocument();
    await expect(next).toHaveFocus();
  },
};

/**
 * Escape from inside closes it, and focus goes back to the last thing used
 * outside — the row picked most recently, not the one that first opened it.
 */
export const EscapeInsideClosesAndReturnsFocus: Story = {
  render: () => <Composed />,
  play: async ({ canvas }) => {
    await userEvent.click(rowButton(canvas, 'Reconcile March invoices'));
    await userEvent.click(rowButton(canvas, 'Tag new tickets'));
    canvas.getByRole('button', { name: 'Close panel' }).focus();
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('region')).toBeNull();
    await expect(rowButton(canvas, 'Tag new tickets')).toHaveFocus();
  },
};

/** Escape outside the panel is the page's, and leaves the panel open. */
export const EscapeOutsideLeavesItOpen: Story = {
  play: async ({ canvas }) => {
    rowButton(canvas, 'Draft refund replies').focus();
    await userEvent.keyboard('{Escape}');
    await expect(canvas.getByRole('region')).toBeInTheDocument();
  },
};

/** Escape in a Toggletip inside the panel closes the toggletip only. */
export const EscapeInANestedToggletipClosesOnlyIt: Story = {
  play: async ({ canvas }) => {
    const tip = canvas.getByRole('button', { name: 'About outcomes' });
    tip.focus();
    await userEvent.keyboard('{Enter}');
    await expect(tip).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    await expect(tip).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByRole('region')).toBeInTheDocument();
  },
};

export const CloseButtonClosesAndReturnsFocus: Story = {
  render: () => <Composed />,
  play: async ({ canvas }) => {
    await userEvent.click(rowButton(canvas, 'Draft refund replies'));
    await userEvent.click(canvas.getByRole('button', { name: 'Close panel' }));
    await expect(canvas.queryByRole('region')).toBeNull();
    await expect(rowButton(canvas, 'Draft refund replies')).toHaveFocus();
  },
};

/** No trap: Tab walks out of the panel into the rest of the page. */
export const TabLeavesThePanel: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: 'Open run' }).focus();
    await browserUser.keyboard('{Tab}');
    await expect(
      canvas.getByRole('button', { name: 'After the layout' }),
    ).toHaveFocus();
  },
};

/** Below the breakpoint it is a Drawer — modal, because it covers the list. */
export const NarrowOpensAsADrawer: Story = {
  render: () => (
    <Composed initial="run_4822" panel={{ overlayBelow: 100_000 }} />
  ),
  play: async () => {
    const body = within(document.body);
    const dialog = await body.findByRole('dialog', {
      name: 'Draft refund replies',
    });
    await expect(dialog).toBeVisible();
    await expect(
      body.queryByRole('region', { name: 'Draft refund replies' }),
    ).toBeNull();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};

/** A wide table beside it scrolls in its own column; the panel stays on screen. */
export const WideContentDoesNotPushItOff: Story = {
  render: () => <Composed initial="run_4821" wide />,
  play: async ({ canvas, canvasElement }) => {
    const layout = canvasElement
      .querySelector('.ion-side-panel-layout')!
      .getBoundingClientRect();
    const panel = canvas.getByRole('region').getBoundingClientRect();
    await expect(panel.right).toBeLessThanOrEqual(layout.right + 0.5);
    await expect(Math.round(panel.width)).toBe(352); // 22rem
    const wide = canvas.getByTestId('wide');
    await expect(wide.scrollWidth).toBeGreaterThan(wide.clientWidth);
  },
};

/** It sticks while the page scrolls, and its own body scrolls past the screen. */
export const StaysInViewAndScrollsItsBody: Story = {
  play: async ({ canvas, canvasElement }) => {
    const region = canvas.getByRole('region');
    const style = getComputedStyle(region);
    await expect(style.position).toBe('sticky');
    await expect(parseFloat(style.maxHeight)).toBeLessThanOrEqual(
      window.innerHeight,
    );
    const body = canvasElement.querySelector('.ion-side-panel__body')!;
    await expect(getComputedStyle(body).overflowY).toBe('auto');
  },
};
