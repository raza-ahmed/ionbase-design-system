import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { Button, Tag, TagGroup, type TagGroupSize } from 'ionbase-ui';

const FILTERS = [
  { id: 'status', label: 'Status: Failing' },
  { id: 'team', label: 'Team: Finance' },
  { id: 'owner', label: 'Owner: Ada Reyes' },
];

/** A removable group that really removes: the group itself removes nothing. */
function Filters({
  size,
  initial = FILTERS,
  withClear = false,
}: {
  size?: TagGroupSize;
  initial?: typeof FILTERS;
  withClear?: boolean;
}) {
  const [items, setItems] = useState(initial);
  return (
    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '32rem' }}>
      <TagGroup
        label="Active filters"
        size={size}
        items={items}
        emptyLabel="No filters applied"
        onRemove={(keys) =>
          setItems((all) => all.filter((f) => !keys.has(f.id)))
        }
      >
        {(f) => <Tag key={f.id}>{f.label}</Tag>}
      </TagGroup>
      {withClear && items.length > 0 && (
        <div>
          <Button size="sm" variant="secondary" onClick={() => setItems([])}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

const meta: Meta<typeof TagGroup> = {
  title: 'Components/TagGroup',
  component: TagGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Labels a person applied and can take away: active filters, the labels on a record, recipients. Drawn in Figma as `Tag` (1448:290) and `Tag Group` (1448:333).\n\n**Not a Badge.** A Badge reports a state the system decided and cannot be removed; a Tag is a choice someone made, so it is removable and neutral.\n\nBuilt on React Aria's `useTagGroup`: one tab stop, arrow keys between tags, a remove button named for its tag, Delete or Backspace to remove, and focus to the neighbour afterwards. Removing the last tag moves focus to the group, which reads `emptyLabel`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TagGroup>;

export const Default: Story = { render: () => <Filters withClear /> };

export const Medium: Story = { render: () => <Filters size="md" /> };

/** Without `onRemove` the tags are read-only labels — no buttons at all. */
export const ReadOnly: Story = {
  render: () => (
    <TagGroup label="Labels">
      <Tag key="billing">Billing</Tag>
      <Tag key="priority">Priority</Tag>
    </TagGroup>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    await expect(canvas.getAllByRole('row')).toHaveLength(2);
  },
};

export const Empty: Story = { render: () => <Filters initial={[]} /> };

export const GroupIsNamedAndEachRemoveButtonSaysWhich: Story = {
  render: () => <Filters />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('grid', { name: 'Active filters' }),
    ).toBeInTheDocument();
    for (const f of FILTERS) {
      await expect(
        canvas.getByRole('button', { name: `Remove ${f.label}` }),
      ).toBeInTheDocument();
    }
  },
};

export const RemovingMovesFocusToTheNeighbour: Story = {
  render: () => <Filters />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove Team: Finance' }),
    );
    await waitFor(() =>
      expect(canvas.queryByText('Team: Finance')).not.toBeInTheDocument(),
    );
    // Focus lands on a remaining tag, not on <body>.
    await waitFor(() =>
      expect(canvas.getByRole('grid').contains(document.activeElement)).toBe(
        true,
      ),
    );
  },
};

export const DeleteKeyRemovesTheFocusedTag: Story = {
  render: () => <Filters />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.tab();
    await expect(document.activeElement).toBe(canvas.getAllByRole('row')[0]);
    await userEvent.keyboard('{ArrowRight}');
    await expect(document.activeElement).toBe(canvas.getAllByRole('row')[1]);
    await userEvent.keyboard('{Delete}');
    await waitFor(() =>
      expect(canvas.queryByText('Team: Finance')).not.toBeInTheDocument(),
    );
    await expect(canvas.getAllByRole('row')).toHaveLength(2);
  },
};

export const RemovingTheLastTagFocusesTheGroup: Story = {
  render: () => <Filters initial={[FILTERS[0]]} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove Status: Failing' }),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(
        canvas.getByRole('group', { name: 'Active filters' }),
      ),
    );
    await expect(canvas.getByText('No filters applied')).toBeInTheDocument();
  },
};

/** Figma `Tag` (1448:290): height 24 / 32, label 8 / 12 from the edge. */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div data-testid="sm">
        <Filters />
      </div>
      <div data-testid="md">
        <Filters size="md" />
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    for (const [id, height, inset] of [
      ['sm', 24, 8],
      ['md', 32, 12],
    ] as const) {
      const tag = canvas
        .getByTestId(id)
        .querySelector('.ion-tag') as HTMLElement;
      const label = tag.querySelector('.ion-tag__label') as HTMLElement;
      await expect(tag.getBoundingClientRect().height).toBe(height);
      await expect(
        Math.round(
          label.getBoundingClientRect().left - tag.getBoundingClientRect().left,
        ),
      ).toBe(inset);
    }
  },
};
