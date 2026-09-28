import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { AppSwitcher, Link, LogoMark, type AppSwitcherApp } from 'ionbase-ui';

const APPS: AppSwitcherApp[] = [
  {
    id: 'ops',
    name: 'Ops',
    href: '#ops',
    description: 'Agents, runs and approvals',
    icon: <LogoMark size="sm" />,
  },
  { id: 'docs', name: 'Docs', href: '#docs', description: 'Guides and API' },
  { id: 'billing', name: 'Billing', href: '#billing' },
  { id: 'status', name: 'Status', href: '#status' },
  { id: 'admin', name: 'Admin', href: '#admin' },
];

const meta: Meta<typeof AppSwitcher> = {
  title: 'Components/AppSwitcher',
  component: AppSwitcher,
  tags: ['autodocs'],
  args: { apps: APPS, currentApp: 'ops' },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: '1rem 2rem 22rem',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'The nine-dot button in a suite\'s header and the grid of products it opens. **Links, not a menu:** each product is a place with an address — it opens in a new tab with a modifier and its address can be copied — so the panel is a Popover holding links, reached with Tab. The product you are in is `aria-current="true"`, with a border as well as a tint.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AppSwitcher>;

const doc = () => within(document.body);
const open = async (canvas: ReturnType<typeof within>, name = 'Apps') => {
  await userEvent.click(canvas.getByRole('button', { name }));
  return doc().findByRole('dialog', { name });
};

export const Default: Story = {
  play: async ({ canvas }) => {
    const dialog = await open(canvas);
    await expect(within(dialog).getAllByRole('link')).toHaveLength(5);
  },
};

export const WithAFooter: Story = {
  args: {
    footer: <Link href="#all-apps">All apps</Link>,
  },
  play: async ({ canvas }) => {
    const dialog = await open(canvas);
    await expect(
      within(dialog).getByRole('link', { name: 'All apps' }),
    ).toBeInTheDocument();
  },
};

/** An icon-only button: named by `label`, and it says the panel is open. */
export const TheButtonIsNamedAndExpands: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Apps' });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    await doc().findByRole('dialog');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
  },
};

/** A dialog named by `label`, which takes focus and keeps it. */
export const OpensAFocusedDialog: Story = {
  play: async ({ canvas }) => {
    const dialog = await open(canvas);
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    // Tab runs through the products, in order, and stays in the panel.
    await userEvent.tab();
    await expect(document.activeElement).toHaveAccessibleName('Ops');
    for (let i = 0; i < 5; i++) await userEvent.tab();
    await expect(dialog.contains(document.activeElement)).toBe(true);
  },
};

/** Links, each to a product's home, and the current one marked. */
export const ProductsAreLinksAndOneIsCurrent: Story = {
  play: async ({ canvas }) => {
    const dialog = await open(canvas);
    const links = within(dialog).getAllByRole('link');
    await expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '#ops',
      '#docs',
      '#billing',
      '#status',
      '#admin',
    ]);
    await expect(links.map((l) => l.getAttribute('aria-current'))).toEqual([
      'true',
      null,
      null,
      null,
      null,
    ]);
    // Not "page": it is a product, not this page.
    await expect(dialog.querySelector('[aria-current="page"]')).toBeNull();
    await expect(dialog.querySelector('[role="menu"]')).toBeNull();
  },
};

/** The current product has a border as well as a tint: not colour alone. */
export const TheCurrentProductHasABorder: Story = {
  play: async ({ canvas }) => {
    const dialog = await open(canvas);
    const [current, other] = within(dialog).getAllByRole('link');
    const border = (el: Element) => getComputedStyle(el).borderTopColor;
    await expect(border(current)).not.toBe(border(other));
    await expect(border(other)).toBe('rgba(0, 0, 0, 0)');
    await expect(getComputedStyle(current).borderTopWidth).not.toBe('0px');
  },
};

/** A description is the link's accessible description, not part of its name. */
export const ADescriptionDescribesItsLink: Story = {
  play: async ({ canvas }) => {
    const dialog = await open(canvas);
    const docs = within(dialog).getByRole('link', { name: 'Docs' });
    await expect(docs).toHaveAccessibleDescription('Guides and API');
    const billing = within(dialog).getByRole('link', { name: 'Billing' });
    await expect(billing).not.toHaveAttribute('aria-describedby');
  },
};

/** No icon: the product's initial on a tinted square, hidden from the name. */
export const NoIconShowsTheInitial: Story = {
  play: async ({ canvas }) => {
    const dialog = await open(canvas);
    const billing = within(dialog).getByRole('link', { name: 'Billing' });
    const initial = billing.querySelector('.ion-app-switcher__initial')!;
    await expect(initial.textContent).toBe('B');
    await expect(initial.closest('[aria-hidden="true"]')).not.toBeNull();
  },
};

/** Escape and a click outside close it, and focus goes back to the button. */
export const EscapeAndOutsideGiveFocusBack: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Apps' });
    await open(canvas);
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(doc().queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.activeElement).toBe(button));

    await open(canvas);
    await userEvent.click(document.body);
    await waitFor(() =>
      expect(doc().queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
};

/** A press on a product closes the panel: a hash route would leave it open.
 *  The story stops the navigation itself, so the test frame stays put. */
export const PressingAProductCloses: Story = {
  args: { onOpenChange: fn() },
  render: (args) => (
    <div onClickCapture={(e) => e.preventDefault()}>
      <AppSwitcher {...args} />
    </div>
  ),
  play: async ({ canvas, args }) => {
    const dialog = await open(canvas);
    await userEvent.click(within(dialog).getByRole('link', { name: 'Docs' }));
    await waitFor(() =>
      expect(doc().queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
  },
};

/** `label` names the button, its tooltip and the panel. */
export const LabelNamesEverything: Story = {
  args: { label: 'Northwind apps' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Northwind apps' });
    // Focus opens it at once; hover waits.
    await userEvent.tab();
    await expect(document.activeElement).toBe(button);
    // Out of the accessibility tree, as a copy of the name: found by role
    // attribute, not by findByRole.
    const tip = await waitFor(() => {
      const el = document.querySelector('[role="tooltip"]');
      if (!el) throw new Error('tooltip not open');
      return el;
    });
    await expect(tip).toHaveTextContent('Northwind apps');
    // It shows the name; it does not describe the button with it too.
    await expect(button).not.toHaveAttribute('aria-describedby');
    await userEvent.click(button);
    await doc().findByRole('dialog', { name: 'Northwind apps' });
  },
};

function Controlled() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <p>{isOpen ? 'Open' : 'Closed'}</p>
      <AppSwitcher
        apps={APPS}
        currentApp="ops"
        isOpen={isOpen}
        onOpenChange={setOpen}
      />
    </>
  );
}

/** Controlled: `isOpen` and `onOpenChange`. */
export const IsControlled: Story = {
  render: () => <Controlled />,
  play: async ({ canvas }) => {
    await open(canvas);
    await expect(canvas.getByText('Open')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.getByText('Closed')).toBeInTheDocument());
  },
};
