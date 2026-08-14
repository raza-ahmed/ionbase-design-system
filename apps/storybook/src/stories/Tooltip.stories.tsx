import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { Tooltip, Button } from 'ionbase-ui';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    delay: { control: 'number' },
  },
  args: {
    label: 'Explains what the thing it points at does.',
    placement: 'top',
    // Stories drive this with real pointer and keyboard events; the default
    // 400ms warmup would make every one of them a waiting game.
    delay: 0,
  },
  parameters: {
    docs: {
      description: {
        component:
          "Measured from Figma `Tooltip` (801:1568). Four placements.\n\n**`placement` names where the tooltip sits, not where the arrow points** — `top` is above the trigger, arrow on the bubble's bottom edge. It is a preference rather than a guarantee: react-aria flips to the opposite side when there is no room, and the arrow moves with it.\n\n**Focus opens it, not just hover.** A hover-only tooltip is invisible to keyboard and switch users. Escape dismisses it, and only one tooltip is open at a time.\n\nA tooltip is a hint, not a container: text only, no focusable content. Anything more belongs in a popover.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '80px', display: 'flex', justifyContent: 'center' }}>
    {children}
  </div>
);

export const Default: Story = {
  render: (args) => (
    <Frame>
      <Tooltip {...args}>
        <Button>Hover me</Button>
      </Tooltip>
    </Frame>
  ),
};

export const WithTitle: Story = {
  args: { title: 'Tooltip title' },
  render: (args) => (
    <Frame>
      <Tooltip {...args}>
        <Button>Hover me</Button>
      </Tooltip>
    </Frame>
  ),
};

export const Placements: Story = {
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, max-content)',
        gap: '80px',
        padding: '100px',
        justifyContent: 'center',
      }}
    >
      {(['top', 'bottom', 'left', 'right'] as const).map((p) => (
        <Tooltip {...args} key={p} placement={p} label={`Placed ${p}`}>
          <Button variant="secondary">{p}</Button>
        </Tooltip>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  args: { isDisabled: true },
  render: (args) => (
    <Frame>
      <Tooltip {...args}>
        <Button>No tooltip</Button>
      </Tooltip>
    </Frame>
  ),
};

/**
 * Closed means not rendered.
 *
 * A tooltip hidden with CSS still sits in the accessibility tree, so a screen
 * reader reads a hint for something the user is nowhere near. Asserting
 * absence from the document is what makes that fail.
 */
export const HiddenUntilTriggered: Story = {
  render: (args) => (
    <Frame>
      <Tooltip {...args}>
        <Button>Hover me</Button>
      </Tooltip>
    </Frame>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Hover me' }),
    ).toBeVisible();
    await expect(document.querySelector('.ion-tooltip')).toBeNull();
    await expect(document.querySelector('[role="tooltip"]')).toBeNull();
  },
};

/*
 * THERE IS NO HOVER-OPENS-IT TEST, AND THAT IS DELIBERATE.
 *
 * This is the stronger form of the pulse rule in AGENTS.md. For Button and
 * NavItem the browser drops `:hover` after an attribute has already been set,
 * so a MutationObserver can still catch it. A tooltip has no such node: its
 * open state IS the element, and it only exists while the hover is SUSTAINED.
 *
 * Instrumented on the runner rather than guessed. `pointerover`,
 * `pointerenter` and `mouseenter` all fire on the trigger — the pointer
 * genuinely arrives — and 50ms later there is no tooltip in the document. The
 * open and the close land in the same batch, so React never commits a node and
 * there is nothing for an observer to observe.
 *
 * Hover therefore cannot be asserted here at all, and a test that tried would
 * be permanently red or quietly weakened until it passed. The open/close
 * contract is covered through focus instead, which holds: `FocusOpensIt`,
 * `EscapeDismissesIt` and `DescribesItsTrigger`. Hover still works in a real
 * browser — the `Default` story above demonstrates it.
 */

/**
 * The trigger is described by the tooltip.
 *
 * `aria-describedby` is the whole point of the component: without it the hint
 * is decoration a screen reader never reaches. Resolved by id rather than
 * checking the attribute exists, and opened with the keyboard because focus
 * holds where hover does not.
 */
export const DescribesItsTrigger: Story = {
  render: (args) => (
    <Frame>
      <Tooltip {...args}>
        <Button>Focus me</Button>
      </Tooltip>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Focus me' });
    await userEvent.tab();

    const tip = await waitFor(() => {
      const el = document.querySelector('[role="tooltip"]');
      if (!el) throw new Error('tooltip not open');
      return el as HTMLElement;
    });

    const describedBy = trigger.getAttribute('aria-describedby');
    await expect(describedBy).toBeTruthy();
    await expect(document.getElementById(describedBy!)).toBe(tip);
    await expect(tip.textContent).toContain('Explains what the thing');
  },
};

/**
 * Keyboard focus opens it too — the assertion that matters most here.
 *
 * A hover-only tooltip is invisible to keyboard and switch users, and it is
 * the easiest thing to lose in a rewrite because it looks fine to whoever is
 * testing with a mouse.
 */
export const FocusOpensIt: Story = {
  render: (args) => (
    <Frame>
      <Tooltip {...args}>
        <Button>Focus me</Button>
      </Tooltip>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(document.querySelector('[role="tooltip"]')).toBeNull();

    await userEvent.tab();
    await expect(
      canvas.getByRole('button', { name: 'Focus me' }),
    ).toHaveFocus();

    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull(),
    );
  },
};

/**
 * Escape dismisses it while the trigger keeps focus.
 *
 * Both halves matter: a tooltip you cannot dismiss obscures whatever is under
 * it, and one that steals focus on close loses the user's place. React Aria
 * supplies this — the assertion is here so a hand-rolled replacement cannot
 * quietly drop it.
 */
export const EscapeDismissesIt: Story = {
  render: (args) => (
    <Frame>
      <Tooltip {...args}>
        <Button>Focus me</Button>
      </Tooltip>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Focus me' });

    await userEvent.tab();
    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull(),
    );

    await userEvent.keyboard('{Escape}');

    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')).toBeNull(),
    );
    await expect(trigger).toHaveFocus();
  },
};

/**
 * `isDisabled` suppresses the tooltip without unmounting the trigger.
 *
 * The trigger has to keep working — a disabled tooltip is a disabled hint, not
 * a disabled button — so this asserts both halves.
 */
export const DisabledNeverOpens: Story = {
  args: { isDisabled: true },
  render: (args) => (
    <Frame>
      <Tooltip {...args}>
        <Button>No tooltip</Button>
      </Tooltip>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'No tooltip' });

    await userEvent.hover(trigger);
    await userEvent.tab();

    await expect(document.querySelector('[role="tooltip"]')).toBeNull();
    await expect(trigger).toBeVisible();
  },
};

/**
 * The arrow follows the RESOLVED placement, not the requested one.
 *
 * React Aria flips the tooltip when there is no room on the preferred side. If
 * the arrow modifier were driven by the prop it would keep pointing at the
 * side the tooltip is no longer on — an arrow aimed at nothing.
 *
 * Asserted by placing the trigger hard against the top of the viewport and
 * asking for `top`, which cannot be honoured.
 */
export const ArrowFollowsTheFlippedPlacement: Story = {
  args: { placement: 'top' },
  render: (args) => (
    <div style={{ padding: 0, display: 'flex', justifyContent: 'center' }}>
      <Tooltip {...args}>
        <Button>Pinned to the top edge</Button>
      </Tooltip>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', {
      name: 'Pinned to the top edge',
    });
    // Focus, not hover: headless Chromium drops a hover before the geometry
    // can be measured, and this story is about WHERE the tooltip lands.
    await userEvent.tab();

    const tip = await waitFor(() => {
      const el = document.querySelector('.ion-tooltip');
      if (!el) throw new Error('tooltip not open');
      return el as HTMLElement;
    });

    // Whatever side it resolved to, the class and the geometry must agree:
    // the tooltip sits on the side its modifier claims.
    const side = ['top', 'bottom', 'left', 'right'].find((s) =>
      tip.classList.contains(`ion-tooltip--${s}`),
    );
    await expect(side).toBeTruthy();

    const t = trigger.getBoundingClientRect();
    const b = tip.getBoundingClientRect();
    if (side === 'top') await expect(b.bottom).toBeLessThanOrEqual(t.top + 1);
    if (side === 'bottom')
      await expect(b.top).toBeGreaterThanOrEqual(t.bottom - 1);
    if (side === 'left') await expect(b.right).toBeLessThanOrEqual(t.left + 1);
    if (side === 'right')
      await expect(b.left).toBeGreaterThanOrEqual(t.right - 1);
  },
};

/**
 * The bubble wraps rather than growing without limit.
 *
 * Figma cannot show this: a Figma frame has no viewport, so a long hint just
 * makes a very wide component. Here it has to stay a hint.
 */
export const LongLabelWraps: Story = {
  args: {
    label:
      'A deliberately long hint that keeps going well past any reasonable single line, to prove the bubble wraps instead of running off the side of the screen.',
  },
  render: (args) => (
    <Frame>
      <Tooltip {...args}>
        <Button>Hover me</Button>
      </Tooltip>
    </Frame>
  ),
  play: async ({ userEvent }) => {
    // Focus, not hover — see the note in the flipped-placement story.
    await userEvent.tab();

    const bubble = await waitFor(() => {
      const el = document.querySelector('.ion-tooltip__bubble');
      if (!el) throw new Error('tooltip not open');
      return el as HTMLElement;
    });

    await expect(bubble.getBoundingClientRect().width).toBeLessThanOrEqual(280);
    // ...and it actually wrapped rather than being clipped.
    await expect(bubble.scrollHeight).toBeGreaterThan(24);
  },
};
