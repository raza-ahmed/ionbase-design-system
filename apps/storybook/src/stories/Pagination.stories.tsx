import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Pagination } from 'ionbase-ui';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['numbered', 'simple'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    siblingCount: { control: { type: 'number', min: 0, max: 3 } },
  },
  args: { page: 1, pageCount: 12, type: 'numbered', size: 'md' },
  parameters: {
    docs: {
      description: {
        component:
          'Geometry measured from the Figma `Pagination` (1291:503) and `Pagination Item` (1283:289) components. The Figma item set is internal — a caller places a Pagination, never a cell. `page` is 1-based.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

/** Controlled, the way a caller actually wires it. */
function Demo(args: React.ComponentProps<typeof Pagination>) {
  const [page, setPage] = React.useState(args.page);
  const [pageSize, setPageSize] = React.useState(10);
  React.useEffect(() => setPage(args.page), [args.page]);
  return (
    <Pagination
      {...args}
      page={page}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
    />
  );
}

export const Numbered: Story = { render: (args) => <Demo {...args} /> };

export const Simple: Story = {
  args: { type: 'simple', page: 3 },
  render: (args) => <Demo {...args} />,
};

export const WithPageSize: Story = {
  args: { showPageSize: true },
  render: (args) => <Demo {...args} />,
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 24 }}>
      <Demo {...args} size="sm" />
      <Demo {...args} size="md" />
      <Demo {...args} size="lg" />
    </div>
  ),
};

/** Both ends: prev is disabled on page 1, next on the last page. */
export const Ends: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 24 }}>
      <Demo {...args} page={1} />
      <Demo {...args} page={12} />
    </div>
  ),
};

/**
 * The truncation rule, which is the only real logic here: a gap marker is only
 * drawn where it replaces two or more pages, so an ellipsis never stands in for
 * a single hidden page.
 */
export const Truncation: Story = {
  args: { pageCount: 20 },
  render: (args) => (
    <div style={{ display: 'grid', gap: 24 }}>
      {[1, 3, 4, 10, 17, 20].map((p) => (
        <Pagination {...args} key={p} page={p} aria-label={`At page ${p}`} />
      ))}
    </div>
  ),
};

export const Behaviour: Story = {
  args: { pageCount: 20, page: 10 },
  render: (args) => <Demo {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The current page is a position in a set, not a pressed toggle.
    const current = canvas.getByRole('button', { name: 'Go to page 10' });
    await expect(current).toHaveAttribute('aria-current', 'page');

    // A gap marks absent pages and must not be reachable.
    const ellipses = canvasElement.querySelectorAll(
      '.ion-pagination__ellipsis',
    );
    await expect(ellipses.length).toBe(2);
    for (const e of ellipses) {
      await expect(e).toHaveAttribute('aria-hidden', 'true');
      await expect(e.querySelector('button')).toBeNull();
    }

    // Navigating moves aria-current with it.
    await userEvent.click(canvas.getByRole('button', { name: 'Go to page 9' }));
    await expect(
      canvas.getByRole('button', { name: 'Go to page 9' }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(current).not.toHaveAttribute('aria-current');

    // First page disables prev rather than styling it to look disabled.
    await userEvent.click(canvas.getByRole('button', { name: 'Go to page 1' }));
    await expect(
      canvas.getByRole('button', { name: 'Go to previous page' }),
    ).toBeDisabled();
  },
};
