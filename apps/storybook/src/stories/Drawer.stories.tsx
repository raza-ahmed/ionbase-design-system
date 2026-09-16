import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Button, Drawer } from 'ionbase-ui';

const meta: Meta<typeof Drawer> = {
  title: 'Components/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: 'select',
      options: ['start', 'end', 'top', 'bottom'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    isOpen: true,
    title: 'Filter invoices',
    description: 'Narrow the list without leaving the table.',
    children: 'Filter controls go here.',
  },
  parameters: {
    docs: {
      description: {
        component:
          "A modal panel anchored to an edge.\n\n**It is a modal, not a sidebar.** It takes focus, traps it, closes on Escape and outside click, and marks the rest of the page inert — all of `Modal`'s behaviour, differing only in where the panel sits. A persistent side panel that does none of those things is layout, and belongs in the page.\n\n**Reach for `Modal` for decisions.** A drawer suits work that is long or list-shaped, because an edge panel can be tall without fighting the viewport. A destructive confirmation belongs in a Modal, where the button cannot sit below the fold.\n\n**`start` and `end` follow writing direction**, so a right-hand drawer in English is a left-hand one in Arabic with no second variant.\n\nThe panel is the block — `.ion-drawer`, not `.ion-drawer__panel` — matching `popover.css`. That is load-bearing: the contrast gate resolves a translucent hover colour's backdrop from the block's background, and with the surface on an element class the close button's hover pairing came back unmeasured.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Drawer>;

export const Default: Story = {};

export const Placements: Story = {
  render: function Render(args) {
    const [placement, setPlacement] = React.useState<
      'start' | 'end' | 'top' | 'bottom'
    >('end');
    return (
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {(['start', 'end', 'top', 'bottom'] as const).map((p) => (
          <Button key={p} variant="secondary" onPress={() => setPlacement(p)}>
            {p}
          </Button>
        ))}
        <Drawer {...args} placement={placement} />
      </div>
    );
  },
};

export const WithFooter: Story = {
  args: {
    footer: (
      <>
        <Button variant="secondary">Reset</Button>
        <Button>Apply</Button>
      </>
    ),
  },
};

/** Closed renders nothing at all — not a hidden node, not a display:none. */
export const ClosedRendersNothing: Story = {
  args: { isOpen: false },
  play: async ({ canvasElement }) => {
    await expect(document.querySelector('.ion-drawer')).toBeNull();
    await expect(document.querySelector('.ion-drawer__scrim')).toBeNull();
    await expect(canvasElement.textContent).not.toContain('Filter invoices');
  },
};

/**
 * Portalled, labelled and modal — the three properties that make it a dialog
 * rather than a styled box.
 */
export const IsALabelledModalDialog: Story = {
  play: async ({ canvasElement }) => {
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    await expect(dialog).not.toBeNull();
    await expect(canvasElement.contains(dialog)).toBe(false);

    const labelledBy = dialog.getAttribute('aria-labelledby');
    await expect(labelledBy).toBeTruthy();
    await expect(document.getElementById(labelledBy!)?.textContent).toBe(
      'Filter invoices',
    );
    // NOT an aria-modal assertion. React Aria makes the rest of the page inert
    // by setting aria-hidden on the body's other children rather than by
    // setting aria-modal on the dialog, so the attribute is absent by design —
    // Modal's equivalent test checks the same way, for the same reason.
    const outside = Array.from(document.body.children).filter(
      (el) => !el.contains(dialog),
    );
    await expect(outside.length).toBeGreaterThan(0);
    await expect(
      outside.some((el) => el.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
  },
};

/** The panel is the block, which is what the contrast gate reads the backdrop from. */
export const PanelCarriesTheBlockClass: Story = {
  args: { placement: 'start', size: 'lg' },
  play: async () => {
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    await expect(dialog).toHaveClass('ion-drawer');
    await expect(dialog).toHaveClass('ion-drawer--start');
    await expect(dialog).toHaveClass('ion-drawer--lg');
  },
};
