import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { Modal, Button, Icon } from 'ionbase-ui';
import { Info } from 'ionbase-icons/icons/info';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'fullscreen'] },
    align: { control: 'select', options: ['left', 'center'] },
    showClose: { control: 'boolean' },
  },
  args: {
    isOpen: true,
    size: 'md',
    align: 'left',
    showClose: true,
    title: 'Dialog title',
    description:
      'Supporting copy that explains what this dialog is asking for.',
  },
  parameters: {
    docs: {
      description: {
        component:
          "Measured from Figma `Modal` (792:1537). `Size` x `Align`, with the sections as props rather than variants.\n\n**Renders nothing when closed, and portals when open.** A modal left in the tree while closed is still keyboard-focusable, and one rendered inline inherits any `overflow: hidden` or stacking context from wherever it was written.\n\nFocus trap, outside-click, Escape, scroll lock and `aria-hidden` on the rest of the page all come from React Aria's `useModalOverlay` — none of it is reimplemented here.\n\n**The scrim is part of this component in code**, unlike in Figma, where the panel is modelled alone so it can be dropped into any layout.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

const Actions = () => (
  <>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary-brand">Confirm</Button>
  </>
);

export const Default: Story = { args: { footer: <Actions /> } };

export const WithBody: Story = {
  args: {
    footer: <Actions />,
    children:
      'Body content goes here. Anything can be placed in this slot — a form, a list, a longer explanation.',
  },
};

export const Centered: Story = {
  args: {
    align: 'center',
    media: <Icon as={Info} />,
    footer: <Actions />,
  },
};

export const WithMedia: Story = {
  args: { media: <Icon as={Info} />, footer: <Actions /> },
};

export const Small: Story = { args: { size: 'sm', footer: <Actions /> } };
export const Large: Story = { args: { size: 'lg', footer: <Actions /> } };
export const Fullscreen: Story = {
  args: { size: 'fullscreen', footer: <Actions /> },
};

export const NoClose: Story = {
  args: { showClose: false, footer: <Actions /> },
};

/**
 * Closed means *not rendered*, not merely invisible.
 *
 * A dialog hidden with CSS is still in the tree: its buttons stay in the tab
 * order and a screen reader still walks it. Asserting absence from the DOM is
 * the only version of this that can fail if someone swaps the early return for
 * a `display: none`.
 */
export const ClosedRendersNothing: Story = {
  args: { isOpen: false, footer: <Actions /> },
  play: async ({ canvasElement }) => {
    await expect(document.querySelector('.ion-modal')).toBeNull();
    await expect(document.querySelector('.ion-modal__scrim')).toBeNull();
    await expect(canvasElement.textContent).not.toContain('Dialog title');
  },
};

/**
 * The dialog is portalled, labelled and modal.
 *
 * `aria-labelledby` pointing at the title is what gives the dialog its
 * accessible name — without it a screen reader announces "dialog" and nothing
 * else. `aria-modal` is what tells assistive tech the rest of the page is
 * inert; React Aria also hides it for real, which the last assertion checks
 * rather than trusting the attribute alone.
 */
export const DialogIsLabelledAndModal: Story = {
  args: { footer: <Actions /> },
  play: async ({ canvasElement }) => {
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    await expect(dialog).not.toBeNull();

    // Portalled out of the story root, not rendered inline.
    await expect(canvasElement.contains(dialog)).toBe(false);

    const labelledBy = dialog.getAttribute('aria-labelledby');
    await expect(labelledBy).toBeTruthy();
    await expect(document.getElementById(labelledBy!)?.textContent).toBe(
      'Dialog title',
    );
  },
};

/**
 * Escape closes, and the component does not implement it.
 *
 * This asserts the wiring to `useModalOverlay` rather than a keydown handler of
 * our own — if the modal is ever rebuilt on a plain div, this is what notices
 * that Escape, the focus trap and the scroll lock all left with it.
 */
export const EscapeClosesTheDialog: Story = {
  args: { footer: <Actions />, onOpenChange: fn() },
  play: async ({ userEvent, args }) => {
    await expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};

/**
 * The close button is a 32px target around a 20px glyph.
 *
 * WCAG 2.2 SC 2.5.8 asks for 24x24 minimum, and the icon alone would be 20 —
 * so the box is the thing under test, not the icon. Measured from the rendered
 * rect rather than the stylesheet, because that is what a finger hits.
 */
export const CloseTargetMeetsMinimumSize: Story = {
  args: { footer: <Actions />, onOpenChange: fn() },
  play: async ({ userEvent, args }) => {
    const close = document.querySelector('.ion-modal__close') as HTMLElement;
    await expect(close).not.toBeNull();
    await expect(close).toHaveAttribute('aria-label', 'Close dialog');

    const box = close.getBoundingClientRect();
    await expect(Math.round(box.width)).toBeGreaterThanOrEqual(24);
    await expect(Math.round(box.height)).toBeGreaterThanOrEqual(24);
    await expect(Math.round(box.width)).toBe(32);

    await userEvent.click(close);
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};

/**
 * Centred alignment centres the actions too.
 *
 * Right-aligned buttons under centred copy read as broken, so the footer moves
 * with the text. Figma needs an invisible spacer to achieve the centring; CSS
 * does not, and this asserts the result rather than the mechanism — the
 * heading's centre should sit on the panel's centre, not 24px off it.
 */
export const CentredContentIsActuallyCentred: Story = {
  args: { align: 'center', media: <Icon as={Info} />, footer: <Actions /> },
  play: async () => {
    const panel = document.querySelector('.ion-modal') as HTMLElement;
    const heading = document.querySelector(
      '.ion-modal__heading',
    ) as HTMLElement;
    const footer = document.querySelector('.ion-modal__footer') as HTMLElement;

    await expect(getComputedStyle(footer).justifyContent).toBe('center');

    const p = panel.getBoundingClientRect();
    const h = heading.getBoundingClientRect();
    // Within a pixel of the panel's centre — the Figma bug was 24px off.
    await expect(
      Math.abs(h.left + h.width / 2 - (p.left + p.width / 2)),
    ).toBeLessThan(1.5);
  },
};

/**
 * Fullscreen is a different layout, not another width.
 *
 * It meets the viewport edges, so radius, border and shadow are removed rather
 * than reduced. Asserted from the resolved style: a fullscreen dialog that
 * kept a 12px radius would show four rounded corners against the screen edge.
 */
export const FullscreenDropsItsEdges: Story = {
  args: { size: 'fullscreen', footer: <Actions /> },
  play: async () => {
    const panel = document.querySelector('.ion-modal') as HTMLElement;
    const cs = getComputedStyle(panel);

    await expect(cs.borderTopLeftRadius).toBe('0px');
    await expect(cs.borderTopWidth).toBe('0px');
    await expect(cs.boxShadow).toBe('none');

    // ...and the scrim drops its padding, or "fullscreen" would float in a frame.
    const scrim = document.querySelector('.ion-modal__scrim') as HTMLElement;
    await expect(getComputedStyle(scrim).paddingTop).toBe('0px');
  },
};

/**
 * The panel never exceeds the viewport, which Figma cannot express.
 *
 * Figma panels hug their content because a Figma frame has no viewport to
 * overflow. A real one does, and a dialog taller than the screen is
 * unreachable at both ends — so the panel is capped and the body scrolls
 * underneath a fixed header and footer.
 */
export const LongBodyScrollsInsteadOfOverflowing: Story = {
  args: {
    footer: <Actions />,
    children: Array.from({ length: 40 }, (_, i) => (
      <p key={i}>Paragraph {i + 1} of a deliberately over-long dialog body.</p>
    )),
  },
  play: async () => {
    const panel = document.querySelector('.ion-modal') as HTMLElement;
    const body = document.querySelector('.ion-modal__body') as HTMLElement;

    await expect(getComputedStyle(body).overflowY).toBe('auto');
    // The body is what scrolls, not the panel.
    await expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    await expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(
      window.innerHeight,
    );
  },
};

/**
 * ...and centred content stays centred with no close button.
 *
 * The spacer is gated on `:has(.ion-modal__close)` precisely so it disappears
 * with the button. Left unconditional it would push the content 24px the other
 * way — the same bug mirrored, and invisible unless something asserts the
 * no-close case too.
 */
export const CentredStaysCentredWithoutClose: Story = {
  args: {
    align: 'center',
    showClose: false,
    media: <Icon as={Info} />,
    footer: <Actions />,
  },
  play: async () => {
    await expect(document.querySelector('.ion-modal__close')).toBeNull();

    const panel = document.querySelector('.ion-modal') as HTMLElement;
    const heading = document.querySelector(
      '.ion-modal__heading',
    ) as HTMLElement;

    const p = panel.getBoundingClientRect();
    const h = heading.getBoundingClientRect();
    await expect(
      Math.abs(h.left + h.width / 2 - (p.left + p.width / 2)),
    ).toBeLessThan(1.5);
  },
};
