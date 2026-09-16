import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Accordion, AccordionItem } from 'ionbase-ui';

const meta: Meta<typeof Accordion> = {
  title: 'Components/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  argTypes: { headingLevel: { control: 'select', options: [2, 3, 4, 5, 6] } },
  parameters: {
    docs: {
      description: {
        component:
          "Sections that collapse, with the document's heading structure intact.\n\n**The trigger is a button inside a heading**, and both parts are load-bearing. The heading is how a screen-reader user navigates a long page — pressing `h` moves between sections, and an accordion built from divs removes every one of those stops. The button is what makes the section operable by keyboard and announced as expandable; a heading with a click handler is neither.\n\n**`headingLevel` has no safe default beyond 3.** The right level depends on the document around it and nothing here can see that. Two accordions at the wrong level produce a page whose outline is nonsense while looking perfectly fine.\n\n**Collapsed panels are hidden, not unmounted.** Unmounting loses form state in a collapsed section — the classic multi-step-form bug where answers vanish when a section is folded away — and breaks in-page search, which cannot find text that is not there.",
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Accordion>;

const Sections = (props: React.ComponentProps<typeof Accordion>) => (
  <Accordion {...props}>
    <AccordionItem id="billing" title="Billing">
      Invoices, payment method and billing address.
    </AccordionItem>
    <AccordionItem id="members" title="Members">
      Who can see this workspace, and what they can do in it.
    </AccordionItem>
    <AccordionItem id="danger" title="Danger zone" isDisabled>
      Deleting the workspace cannot be undone.
    </AccordionItem>
  </Accordion>
);

export const Default: Story = { render: (args) => <Sections {...args} /> };

export const StartsOpen: Story = {
  render: (args) => <Sections {...args} defaultExpandedKeys={['billing']} />,
};

export const AllowsMultiple: Story = {
  render: (args) => (
    <Sections
      {...args}
      allowsMultiple
      defaultExpandedKeys={['billing', 'members']}
    />
  ),
};

/** The trigger reports its state, and opening one closes the last. */
export const TogglesAndReportsState: Story = {
  render: (args) => <Sections {...args} />,
  play: async ({ canvas, userEvent }) => {
    const billing = canvas.getByRole('button', { name: 'Billing' });
    const members = canvas.getByRole('button', { name: 'Members' });
    await expect(billing).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(billing);
    await expect(billing).toHaveAttribute('aria-expanded', 'true');

    // Single-open: the second closes the first.
    await userEvent.click(members);
    await expect(members).toHaveAttribute('aria-expanded', 'true');
    await expect(billing).toHaveAttribute('aria-expanded', 'false');
  },
};

/**
 * The structural contract. A trigger that is not inside a heading removes every
 * `h` stop from a long settings page, and the loss is invisible to everyone not
 * navigating by headings.
 */
export const TriggerLivesInsideAHeading: Story = {
  render: (args) => <Sections {...args} headingLevel={4} />,
  play: async ({ canvas }) => {
    const heading = canvas.getByRole('heading', { level: 4, name: 'Billing' });
    await expect(heading).toBeInTheDocument();
    await expect(heading.querySelector('button[aria-expanded]')).not.toBeNull();
  },
};

/**
 * Collapsed keeps its DOM. Pinned because unmounting is the tempting
 * implementation and it silently eats form state.
 */
export const CollapsedPanelKeepsItsContent: Story = {
  render: (args) => <Sections {...args} />,
  play: async ({ canvas, canvasElement }) => {
    const billing = canvas.getByRole('button', { name: 'Billing' });
    const panelId = billing.getAttribute('aria-controls')!;
    const panel = canvasElement.querySelector(`#${CSS.escape(panelId)}`)!;

    await expect(panel).toHaveAttribute('hidden');
    await expect(panel.textContent).toContain('Invoices');
  },
};

/** A disabled section cannot be opened. */
export const DisabledSectionDoesNotOpen: Story = {
  render: (args) => <Sections {...args} />,
  play: async ({ canvas }) => {
    const danger = canvas.getByRole('button', { name: 'Danger zone' });
    await expect(danger).toBeDisabled();
    await expect(danger).toHaveAttribute('aria-expanded', 'false');
  },
};
