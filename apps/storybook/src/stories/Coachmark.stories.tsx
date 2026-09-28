import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { I18nProvider } from 'react-aria';
import { Button, Coachmark, type CoachmarkProps } from 'ionbase-ui';

const meta: Meta<typeof Coachmark> = {
  title: 'Components/Coachmark',
  component: Coachmark,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem 2rem 14rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'A callout pointing at one thing on the page, to say what it is or what changed. Anchored to its `target` — an element id, or a ref — which is ringed while it shows. Several in a row are a **Tour**.\n\n**Only when asked.** It takes focus when it appears, so open it from a button — "What\'s new?", "Take the tour" — never on page load. **Not modal:** the page stays usable, and Escape closes it.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Coachmark>;

const doc = () => within(document.body);

/** A target, and a coachmark opened from a button beside it. */
function Asked(props: Partial<CoachmarkProps>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button id="c-target" size="sm" variant="secondary">
          Export runs
        </Button>
        <Button size="sm" variant="tertiary" onPress={() => setOpen(true)}>
          What’s new?
        </Button>
      </div>
      <p id="c-other">Everything else on the page.</p>
      <Coachmark
        target="c-target"
        title="Export is here now"
        isOpen={open}
        onClose={() => setOpen(false)}
        {...props}
      >
        Runs export as CSV from this button, filtered as the table is.
      </Coachmark>
    </>
  );
}

export const Default: Story = {
  render: () => (
    <>
      <Button id="c-default" size="sm" variant="secondary">
        Export runs
      </Button>
      <Coachmark
        target="c-default"
        title="Export is here now"
        onClose={() => {}}
      >
        Runs export as CSV from this button, filtered as the table is.
      </Coachmark>
    </>
  ),
};

/**
 * A dialog named by its title and described by its body — and not modal:
 * the rest of the page is neither hidden from assistive tech nor inert.
 */
export const IsANamedDialogThatIsNotModal: Story = {
  render: () => <Asked />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'What’s new?' }));
    const dialog = await doc().findByRole('dialog', {
      name: 'Export is here now',
    });
    await expect(dialog).toHaveAccessibleDescription(
      'Runs export as CSV from this button, filtered as the table is.',
    );
    await expect(dialog).not.toHaveAttribute('aria-modal');
    await expect(
      document.getElementById('c-other')!.closest('[aria-hidden="true"]'),
    ).toBeNull();
    await expect(
      document.getElementById('c-other')!.closest('[inert]'),
    ).toBeNull();
    // Asked for, it takes focus, so it is read out.
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    // Focused to be read out, not ringed: the target already is.
    await expect(getComputedStyle(dialog).outlineStyle).toBe('none');
    await userEvent.keyboard('{Escape}');
  },
};

/**
 * It points at its target: the target is ringed while it shows, the
 * coachmark sits under it with its arrow on the edge facing it, and the ring
 * goes when it closes.
 */
export const PointsAtItsTarget: Story = {
  render: () => <Asked />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'What’s new?' }));
    const dialog = await doc().findByRole('dialog');
    const target = document.getElementById('c-target')!;
    await expect(target).toHaveAttribute('data-ion-coachmark-target');
    await expect(getComputedStyle(target).outlineStyle).toBe('solid');
    await waitFor(() =>
      expect(dialog).toHaveAttribute('data-placement', 'bottom'),
    );
    await expect(dialog.getBoundingClientRect().top).toBeGreaterThan(
      target.getBoundingClientRect().bottom,
    );
    const arrow = dialog.querySelector('.ion-coachmark__arrow')!;
    await expect(arrow.getBoundingClientRect().top).toBeLessThan(
      dialog.getBoundingClientRect().top,
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(target).not.toHaveAttribute('data-ion-coachmark-target'),
    );
  },
};

/** Escape and the close button close it, and focus goes back to the button. */
export const EscapeAndCloseGiveFocusBack: Story = {
  render: () => <Asked />,
  play: async ({ canvas }) => {
    const asker = canvas.getByRole('button', { name: 'What’s new?' });
    await userEvent.click(asker);
    await doc().findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(doc().queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(asker));

    await userEvent.click(asker);
    const dialog = await doc().findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' }),
    );
    await waitFor(() =>
      expect(doc().queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(asker));
  },
};

/** No `onClose`, no close button — and Escape does nothing. */
export const NoCloseWithoutOnClose: Story = {
  render: () => (
    <>
      <Button id="c-plain" size="sm" variant="secondary">
        Export runs
      </Button>
      <Coachmark target="c-plain" title="Export is here now" />
    </>
  ),
  play: async () => {
    const dialog = await doc().findByRole('dialog');
    await expect(within(dialog).queryByRole('button')).toBeNull();
  },
};

/** One press shows a section and points at it: the target is drawn in the
 *  same commit as the coachmark, and it still appears, focused. */
function RevealAndPoint() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="tertiary" onPress={() => setOpen(true)}>
        Show me
      </Button>
      {open && (
        <Button id="c-revealed" size="sm" variant="secondary">
          Export runs
        </Button>
      )}
      <Coachmark
        target="c-revealed"
        title="Export is here now"
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export const ATargetDrawnWithItStillShows: Story = {
  render: () => <RevealAndPoint />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show me' }));
    const dialog = await doc().findByRole('dialog', {
      name: 'Export is here now',
    });
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    await expect(
      canvas
        .getByRole('button', { name: 'Export runs' })
        .hasAttribute('data-ion-coachmark-target'),
    ).toBe(true);
  },
};

/** A target that is not on the page is nothing to point at: nothing shows. */
export const AMissingTargetShowsNothing: Story = {
  render: () => <Coachmark target="not-on-this-page" title="Nowhere" />,
  play: async () => {
    await expect(doc().queryByRole('dialog')).toBeNull();
  },
};

/** `start` is logical: to the right of the target in a right-to-left page. */
export const StartIsTheRightInRightToLeft: Story = {
  render: () => (
    <I18nProvider locale="ar-EG">
      <div dir="rtl" style={{ paddingInline: '22rem 0' }}>
        <Button id="c-rtl" size="sm" variant="secondary">
          تصدير
        </Button>
        <Coachmark target="c-rtl" title="التصدير هنا الآن" placement="start" />
      </div>
    </I18nProvider>
  ),
  play: async () => {
    const dialog = await doc().findByRole('dialog');
    const target = document.getElementById('c-rtl')!;
    await waitFor(() =>
      expect(dialog).toHaveAttribute('data-placement', 'right'),
    );
    await expect(dialog.getBoundingClientRect().left).toBeGreaterThan(
      target.getBoundingClientRect().right,
    );
  },
};

/** `closeLabel` names the close button. */
export const CloseLabelNamesTheButton: Story = {
  render: () => <Asked closeLabel="Dismiss" />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'What’s new?' }));
    const dialog = await doc().findByRole('dialog');
    await expect(
      within(dialog).getByRole('button', { name: 'Dismiss' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

/**
 * A target taller than the window: centring it left the coachmark below the
 * fold on a phone. Placed, the coachmark scrolls itself into view.
 */
export const StaysInViewOnATallTarget: Story = {
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button size="sm" variant="secondary" onPress={() => setOpen(true)}>
          Show me
        </Button>
        <div style={{ height: '60vh' }}>Content above</div>
        <div
          id="c-tall"
          style={{ height: '250vh', border: '1px solid var(--border-subtle)' }}
        >
          A very tall card
        </div>
        <Coachmark
          target="c-tall"
          title="A tall thing"
          placement="top"
          isOpen={open}
          onClose={() => setOpen(false)}
        >
          It is taller than the window.
        </Coachmark>
      </>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show me' }));
    const dialog = await doc().findByRole('dialog');
    await waitFor(() => {
      const r = dialog.getBoundingClientRect();
      expect(r.top).toBeGreaterThanOrEqual(0);
      expect(r.bottom).toBeLessThanOrEqual(window.innerHeight);
    });
    // Whole, not collapsed: React Aria had capped it at the 0px it measured
    // above a target whose top was off screen.
    await expect(dialog).toHaveTextContent('It is taller than the window.');
    await expect(dialog.getBoundingClientRect().height).toBeGreaterThan(60);
    await userEvent.keyboard('{Escape}');
  },
};
