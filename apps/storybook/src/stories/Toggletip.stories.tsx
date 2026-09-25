import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { Button, Link, Modal, Toggletip } from 'ionbase-ui';

const meta: Meta<typeof Toggletip> = {
  title: 'Components/Toggletip',
  component: Toggletip,
  tags: ['autodocs'],
  args: { 'aria-label': 'About log retention' },
  parameters: {
    docs: {
      description: {
        component:
          'An "ⓘ" that opens an explanation on click — and stays open, so it can hold a link. Not a Tooltip: those open on hover, vanish on pointer-out and cannot be focused. Not a Popover: that is a dialog that traps focus and hides the page.\n\nThe bubble follows the button in the DOM, so Tab reaches a link inside it; its text is read out on open through a live region while focus stays on the button.',
      },
    },
  },
  render: (args) => (
    <div style={{ padding: '96px 24px 24px' }}>
      <span className="ion-text-body-sm" style={{ fontWeight: 500 }}>
        Keep run logs for{' '}
      </span>
      <Toggletip {...args}>
        Logs past the period are deleted every night.{' '}
        <Link href="#retention">How retention works</Link>
      </Toggletip>
      <p>
        <Button size="sm" variant="tertiary">
          Next field
        </Button>
      </p>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof Toggletip>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm' } };

// ------------------------------------------------------------------ tests

const trigger = (c: ReturnType<typeof within>) =>
  c.getByRole('button', { name: 'About log retention' });

export const IsANamedDisclosure: Story = {
  play: async ({ canvas }) => {
    const button = trigger(canvas);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    const bubble = document.getElementById(
      button.getAttribute('aria-controls')!,
    );
    // The bubble is in the page before it opens, and empty.
    await expect(bubble).toHaveAttribute('role', 'status');
    await expect(bubble).toBeEmptyDOMElement();
  },
};

/** Click opens it; hover does not — that is the whole difference from Tooltip. */
export const OpensOnClickNotHover: Story = {
  play: async ({ canvas }) => {
    const button = trigger(canvas);
    await userEvent.hover(button);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Logs past the period are deleted every night.',
    );
    // Focus stays on the button; the live region does the telling.
    await expect(button).toHaveFocus();
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  },
};

/** The bubble follows the button in the DOM, so the next Tab is its link. */
export const TabReachesTheLinkInside: Story = {
  play: async ({ canvas }) => {
    trigger(canvas).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.tab();
    await expect(
      canvas.getByRole('link', { name: 'How retention works' }),
    ).toHaveFocus();
  },
};

export const EscapeClosesAndReturnsFocus: Story = {
  play: async ({ canvas }) => {
    trigger(canvas).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    await expect(trigger(canvas)).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger(canvas)).toHaveFocus();
  },
};

export const PressingOutsideCloses: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(trigger(canvas));
    await userEvent.click(canvasElement.querySelector('p')!);
    await expect(trigger(canvas)).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Tabbing on past the bubble closes it — no bubble left behind a form. */
export const FocusLeavingCloses: Story = {
  play: async ({ canvas }) => {
    trigger(canvas).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.tab();
    await userEvent.tab();
    await expect(
      canvas.getByRole('button', { name: 'Next field' }),
    ).toHaveFocus();
    await waitFor(() =>
      expect(trigger(canvas)).toHaveAttribute('aria-expanded', 'false'),
    );
  },
};

/** Not modal: nothing is hidden from assistive technology while it is open. */
export const DoesNotHideThePage: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(trigger(canvas));
    await expect(
      canvasElement.querySelector(
        '[aria-hidden="true"]:not(svg):not(.ion-toggletip__arrow)',
      ),
    ).toBeNull();
    await expect(
      canvas.getByRole('button', { name: 'Next field' }),
    ).toBeVisible();
  },
};

/** Escape inside a Modal closes the toggletip alone; the dialog stays. */
export const EscapeInsideAModalClosesOnlyTheToggletip: Story = {
  // A real open state: with a no-op onOpenChange the dialog could never close,
  // and this test passed with the stopPropagation removed.
  render: function Render(args) {
    const [open, setOpen] = useState(true);
    return (
      <Modal isOpen={open} title="Workspace defaults" onOpenChange={setOpen}>
        <p>
          Keep run logs for{' '}
          <Toggletip {...args}>Logs past the period are deleted.</Toggletip>
        </p>
      </Modal>
    );
  },
  play: async () => {
    const body = within(document.body);
    const button = body.getByRole('button', { name: 'About log retention' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(body.getByRole('dialog')).toBeVisible();
    // And the dialog's own Escape still works once the toggletip is shut.
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
  },
};

/** A 24px target at both sizes, and no taller line for having one. */
export const TargetMeetsTheMinimum: Story = {
  args: { size: 'sm' },
  play: async ({ canvas, canvasElement }) => {
    const r = trigger(canvas).getBoundingClientRect();
    await expect(Math.round(r.width)).toBe(24);
    await expect(Math.round(r.height)).toBe(24);
    const glyph = trigger(canvas).querySelector('svg')!.getBoundingClientRect();
    await expect(Math.round(glyph.width)).toBe(16);
    const root = canvasElement.querySelector('.ion-toggletip')!;
    await expect(root.getBoundingClientRect().height).toBeLessThanOrEqual(16);
  },
};

/** With no room above, it flips below, and the arrow follows. */
export const FlipsWhenThereIsNoRoom: Story = {
  render: (args) => (
    <div style={{ position: 'absolute', top: 0, left: 24 }}>
      <Toggletip {...args}>
        Logs past the period are deleted every night.
      </Toggletip>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(trigger(canvas));
    const bubble = canvas.getByRole('status');
    await waitFor(() =>
      expect(bubble).toHaveClass('ion-toggletip__bubble--bottom'),
    );
    await expect(bubble.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      trigger(canvas).getBoundingClientRect().bottom,
    );
  },
};
