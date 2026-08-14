import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { Popover, Button } from 'ionbase-ui';

const PLACEMENTS = ['top', 'bottom', 'left', 'right'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;

const meta: Meta<typeof Popover> = {
  title: 'Components/Popover',
  component: Popover,
  tags: ['autodocs'],
  argTypes: {
    placement: { control: 'select', options: PLACEMENTS },
    size: { control: 'select', options: SIZES },
  },
  args: {
    title: 'Filter results',
    content: 'Narrow the list down to what you are looking for.',
    placement: 'bottom',
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        component:
          "Measured from Figma `Popover` (825:1853). Four placements × three sizes.\n\n**It sits between Tooltip and Modal.** A tooltip is a hint that cannot hold focusable content; a modal is a task that takes over the page. A popover holds interactive content but stays attached to the control that opened it.\n\nFocus is contained, Escape and outside clicks close it, and the rest of the page is hidden from assistive tech while it is open — the same guarantees Modal gives. What differs is the framing: no visible scrim, anchored to its trigger, and `surface/raised` rather than Modal's `surface/overlay`.\n\n**`placement` names where the popover sits, not where the arrow points** — `top` is above the trigger, arrow on the panel's bottom edge. It is a preference: react-aria flips to the opposite side when there is no room, and the arrow moves with it.\n\n**`size` is a width only.** Height always hugs the content, and the body scrolls once it passes 60vh.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Popover>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '120px', display: 'flex', justifyContent: 'center' }}>
    {children}
  </div>
);

export const Default: Story = {
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
};

export const WithFooter: Story = {
  args: {
    footer: (
      <>
        <Button variant="tertiary" size="sm">
          Cancel
        </Button>
        <Button size="sm">Apply</Button>
      </>
    ),
  },
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
};

/** Body only — no header, so no title and no close button. */
export const BodyOnly: Story = {
  args: { title: undefined, showClose: false },
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
};

export const NoArrow: Story = {
  args: { hideArrow: true },
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '24px', padding: '120px' }}>
      {SIZES.map((size) => (
        <Popover key={size} {...args} size={size} title={`Size ${size}`}>
          <Button>{size}</Button>
        </Popover>
      ))}
    </div>
  ),
};

/**
 * A popover is a dialog, and it opens on press rather than hover.
 *
 * The trigger is the accessible owner: `aria-expanded` tracks the state and
 * `aria-controls` points at the panel once it exists.
 *
 * There is deliberately no `aria-haspopup="dialog"`. ARIA 1.1 allows the value,
 * but react-aria emits `aria-haspopup` only for menus and listboxes because
 * screen readers announce every other value as "menu" — which would describe
 * this panel as something it is not. `aria-expanded` already says a container
 * opens from here.
 */
export const OpensAsADialog: Story = {
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Open popover' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).not.toHaveAttribute('aria-haspopup');

    await userEvent.click(trigger);

    const dialog = await waitFor(() =>
      document.body.querySelector('.ion-popover'),
    );
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute(
      'aria-controls',
      dialog!.getAttribute('id'),
    );
  },
};

/**
 * The title names the dialog.
 *
 * `useDialog` wires `aria-labelledby` to the title, so the panel announces as
 * "Filter results, dialog" rather than an unnamed one. Without a title there
 * would be nothing to announce, which is why the close button carries its own
 * label rather than relying on the header.
 */
export const TitleNamesTheDialog: Story = {
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open popover' }));

    const dialog = await waitFor(() =>
      document.body.querySelector<HTMLElement>('.ion-popover'),
    );
    const labelledBy = dialog?.getAttribute('aria-labelledby');
    await expect(labelledBy).toBeTruthy();
    await expect(document.getElementById(labelledBy!)).toHaveTextContent(
      'Filter results',
    );
  },
};

/** Escape closes it — a dialog with no keyboard exit is a trap. */
export const EscapeCloses: Story = {
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open popover' }));
    await waitFor(() =>
      expect(document.body.querySelector('.ion-popover')).not.toBeNull(),
    );

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(document.body.querySelector('.ion-popover')).toBeNull(),
    );
  },
};

/** The close button closes it, and reports the change through `onOpenChange`. */
export const CloseButtonCloses: Story = {
  render: (args) => (
    <Frame>
      <Popover {...args} onOpenChange={fn()}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open popover' }));

    const close = await waitFor(() =>
      document.body.querySelector<HTMLElement>('.ion-popover__close'),
    );
    await userEvent.click(close!);

    await waitFor(() =>
      expect(document.body.querySelector('.ion-popover')).toBeNull(),
    );
  },
};

/**
 * A click outside closes it, which is what the transparent underlay is for.
 *
 * Modal's scrim is visible because a modal replaces the page; this one only
 * listens. Without it, the popover would stay open behind whatever the user
 * clicked next.
 */
export const OutsideClickCloses: Story = {
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open popover' }));

    const underlay = await waitFor(() =>
      document.body.querySelector<HTMLElement>('.ion-popover__underlay'),
    );
    await expect(underlay).not.toBeNull();

    await userEvent.click(underlay!);
    await waitFor(() =>
      expect(document.body.querySelector('.ion-popover')).toBeNull(),
    );
  },
};

/**
 * The arrow follows the RESOLVED placement, not the requested one.
 *
 * react-aria flips to the opposite side when there is no room. An arrow left
 * on the requested side would then point away from the trigger — so the side
 * class is read back from what react-aria resolved.
 *
 * This asks for `left` from a trigger pinned to the left edge, where there is
 * no room, and expects the panel to end up on the right.
 */
export const ArrowFollowsTheFlip: Story = {
  render: (args) => (
    <div style={{ padding: '120px 0', display: 'flex' }}>
      <Popover {...args} placement="left">
        <Button>Open popover</Button>
      </Popover>
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open popover' }));

    const panel = await waitFor(() =>
      document.body.querySelector<HTMLElement>('.ion-popover'),
    );
    await expect(panel).not.toBeNull();
    await expect(panel!.classList.contains('ion-popover--left')).toBe(false);
    await expect(panel!.classList.contains('ion-popover--right')).toBe(true);
  },
};

/**
 * Nothing renders while closed.
 *
 * Same contract as Modal: the panel is not merely hidden, it is absent, so its
 * content cannot be reached by tab order or by a screen reader's virtual
 * cursor while the popover is shut.
 */
export const ClosedRendersNothing: Story = {
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Open popover' }),
    ).toBeInTheDocument();
    await expect(document.body.querySelector('.ion-popover')).toBeNull();
    await expect(
      document.body.querySelector('.ion-popover__underlay'),
    ).toBeNull();
  },
};

/**
 * The close target is 32×32 around a 20px glyph — WCAG 2.2 SC 2.5.8 asks for
 * 24×24 minimum, and the icon on its own would fail.
 */
export const CloseTargetIsLargeEnough: Story = {
  render: (args) => (
    <Frame>
      <Popover {...args}>
        <Button>Open popover</Button>
      </Popover>
    </Frame>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open popover' }));

    const close = await waitFor(() =>
      document.body.querySelector<HTMLElement>('.ion-popover__close'),
    );
    const box = close!.getBoundingClientRect();
    await expect(box.width).toBeGreaterThanOrEqual(24);
    await expect(box.height).toBeGreaterThanOrEqual(24);
  },
};
