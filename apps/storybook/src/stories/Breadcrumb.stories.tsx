import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Breadcrumb, BreadcrumbItem } from 'ionbase-ui';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Components/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Where this page sits, and how to get back up.\n\n**An ordered list inside a named landmark.** The trail is a sequence, and `ol` is what says so — a screen reader announces "list, 4 items" and the position within it, which is the entire content of a breadcrumb. A row of divs with slashes conveys none of that, and the slashes get read out as punctuation.\n\n**The separator is a CSS `::before`**, so it never enters the accessibility tree. Putting a "/" in the markup is the usual version of this component and the usual defect.\n\n**The last crumb is not a link.** `isCurrent` renders text with `aria-current="page"`. A link to the page you are already on announces as a link, invites a click and does nothing. It is a prop rather than inferred from position, because a trail whose last crumb legitimately points elsewhere exists and inferring would break it.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof Breadcrumb>;

const Trail = (props: React.ComponentProps<typeof Breadcrumb>) => (
  <Breadcrumb {...props}>
    <BreadcrumbItem href="/">Home</BreadcrumbItem>
    <BreadcrumbItem href="/projects">Projects</BreadcrumbItem>
    <BreadcrumbItem href="/projects/atlas">Atlas</BreadcrumbItem>
    <BreadcrumbItem isCurrent>Invoice 12</BreadcrumbItem>
  </Breadcrumb>
);

export const Default: Story = { render: (args) => <Trail {...args} /> };

/** A long record title truncates rather than wrapping the trail onto three lines. */
export const LongCurrentPage: Story = {
  render: (args) => (
    <div style={{ maxWidth: '22rem' }}>
      <Breadcrumb {...args}>
        <BreadcrumbItem href="/">Home</BreadcrumbItem>
        <BreadcrumbItem href="/invoices">Invoices</BreadcrumbItem>
        <BreadcrumbItem isCurrent>
          Invoice INV-2026-000412 for Northwind Traders
        </BreadcrumbItem>
      </Breadcrumb>
    </div>
  ),
};

/** The landmark is named, so a page with several navs can tell them apart. */
export const LandmarkIsNamed: Story = {
  render: (args) => <Trail {...args} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('navigation')).toHaveAccessibleName(
      'Breadcrumb',
    );
    await expect(canvas.getByRole('list')).toBeInTheDocument();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4);
  },
};

/**
 * The contract that matters: the current page is marked and is NOT a link.
 * Three links for four crumbs.
 */
export const CurrentPageIsNotALink: Story = {
  render: (args) => <Trail {...args} />,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByRole('link')).toHaveLength(3);
    const current = canvasElement.querySelector('[aria-current="page"]');
    await expect(current).not.toBeNull();
    await expect(current!.tagName).toBe('SPAN');
    await expect(current).toHaveTextContent('Invoice 12');
  },
};

/** The separator is decoration and never reaches the accessibility tree. */
export const SeparatorIsNotInTheMarkup: Story = {
  render: (args) => <Trail {...args} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('list').textContent).not.toContain('/');
  },
};
