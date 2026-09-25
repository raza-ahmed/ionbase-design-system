import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { I18nProvider } from 'react-aria';
import { Icon, TreeView, type TreeViewItem } from 'ionbase-ui';
import { Folder } from 'ionbase-icons/icons/folder';
import { FileText } from 'ionbase-icons/icons/file-text';

const folder = <Icon as={Folder} size="sm" />;
const file = <Icon as={FileText} size="sm" />;

const ITEMS: TreeViewItem[] = [
  {
    id: 'policies',
    label: 'Policies',
    icon: folder,
    description: '3 files',
    children: [
      { id: 'refunds', label: 'Refunds.md', icon: file },
      { id: 'shipping', label: 'Shipping.md', icon: file },
      {
        id: 'escalation',
        label: 'Escalation',
        icon: folder,
        children: [
          { id: 'tier-1', label: 'Tier 1.md', icon: file },
          { id: 'tier-2', label: 'Tier 2.md', icon: file },
        ],
      },
    ],
  },
  {
    id: 'product',
    label: 'Product docs',
    icon: folder,
    // One child, on purpose: React Aria infers "expandable" only from more
    // than one, so this is the row that proves hasChildItems is passed.
    children: [{ id: 'api', label: 'API reference.md', icon: file }],
  },
  { id: 'archive', label: 'Archive', icon: folder, isDisabled: true },
  { id: 'readme', label: 'README.md', icon: file },
];

const meta: Meta<typeof TreeView> = {
  title: 'Components/TreeView',
  component: TreeView,
  tags: ['autodocs'],
  args: { items: ITEMS, 'aria-label': 'Knowledge files' },
  parameters: {
    docs: {
      description: {
        component:
          "A hierarchy opened level by level — folders, an org chart, nested permissions. One tab stop; ↑ ↓ move between visible rows, → opens a row, ← closes it or moves to its parent, and ↓ goes on to its first child. Built on React Aria `useTree`: a `treegrid` of flat rows with `aria-level`, `aria-expanded` and each row's place among its siblings.\n\nNot for navigation: a site's nested pages are Sidebar sections.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TreeView>;

export const Default: Story = { args: { defaultExpandedKeys: ['policies'] } };

export const SingleSelection: Story = {
  args: {
    selectionMode: 'single',
    defaultExpandedKeys: ['policies', 'escalation'],
    defaultSelectedKeys: ['tier-1'],
  },
};

export const MultipleSelection: Story = {
  args: {
    selectionMode: 'multiple',
    defaultExpandedKeys: ['policies'],
    defaultSelectedKeys: ['refunds', 'shipping'],
  },
};

// ------------------------------------------------------------------ tests

const row = (c: ReturnType<typeof within>, name: string | RegExp) =>
  c.getByRole('row', { name });
const focused = () => document.activeElement;

/** A treegrid with levels, open state and each row's place among its siblings. */
export const IsATreegridWithLevelsAndPositions: Story = {
  args: { defaultExpandedKeys: ['policies', 'escalation'] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('treegrid')).toHaveAccessibleName(
      'Knowledge files',
    );
    const policies = row(canvas, /^Policies/);
    await expect(policies).toHaveAttribute('aria-level', '1');
    await expect(policies).toHaveAttribute('aria-expanded', 'true');
    await expect(policies).toHaveAttribute('aria-posinset', '1');
    await expect(policies).toHaveAttribute('aria-setsize', '4');
    const tier2 = row(canvas, 'Tier 2.md');
    await expect(tier2).toHaveAttribute('aria-level', '3');
    await expect(tier2).toHaveAttribute('aria-posinset', '2');
    await expect(tier2).toHaveAttribute('aria-setsize', '2');
    // A leaf is not expandable at all — no aria-expanded, not "false".
    await expect(tier2).not.toHaveAttribute('aria-expanded');
    await expect(row(canvas, /^Product docs/)).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    // The description is read with its row.
    await expect(policies).toHaveAccessibleDescription('3 files');
  },
};

/** A closed branch's rows are not in the page, so nothing can land on them. */
export const ClosedChildrenAreNotRendered: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('row', { name: 'Refunds.md' })).toBeNull();
    await expect(canvas.getAllByRole('row')).toHaveLength(4);
  },
};

/** One tab stop: Tab enters on a row, and the next Tab leaves the tree. */
export const IsOneTabStop: Story = {
  args: { defaultExpandedKeys: ['policies'] },
  render: (args) => (
    <>
      <button type="button">Before</button>
      <TreeView {...args} />
      <button type="button">After</button>
    </>
  ),
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: 'Before' }).focus();
    await browserUser.keyboard('{Tab}');
    await expect(focused()).toBe(row(canvas, /^Policies/));
    await browserUser.keyboard('{Tab}');
    await expect(canvas.getByRole('button', { name: 'After' })).toHaveFocus();
  },
};

/**
 * → opens; ↓ goes to the first child; ← goes back to the parent, then closes
 * it. ↓ skips closed rows. A second → on an open row stays put — the treegrid
 * pattern React Aria follows, where → moves into the row's own cells.
 */
export const ArrowsOpenCloseAndMove: Story = {
  play: async ({ canvas }) => {
    const policies = row(canvas, /^Policies/);
    policies.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(policies).toHaveAttribute('aria-expanded', 'true');
    await expect(focused()).toBe(policies);
    await userEvent.keyboard('{ArrowRight}');
    await expect(focused()).toBe(policies);
    await userEvent.keyboard('{ArrowDown}');
    await expect(focused()).toBe(row(canvas, 'Refunds.md'));
    await userEvent.keyboard('{ArrowLeft}');
    await expect(focused()).toBe(policies);
    await userEvent.keyboard('{ArrowLeft}');
    await expect(policies).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowDown}');
    await expect(focused()).toBe(row(canvas, /^Product docs/));
  },
};

export const HomeEndAndTypeahead: Story = {
  play: async ({ canvas }) => {
    row(canvas, /^Policies/).focus();
    await userEvent.keyboard('{End}');
    await expect(focused()).toBe(row(canvas, 'README.md'));
    await userEvent.keyboard('{Home}');
    await expect(focused()).toBe(row(canvas, /^Policies/));
    await userEvent.keyboard('Pro');
    await expect(focused()).toBe(row(canvas, /^Product docs/));
  },
};

/** A disabled row is passed over by the arrows and cannot be selected. */
export const DisabledRowIsSkipped: Story = {
  args: { selectionMode: 'single' },
  play: async ({ canvas }) => {
    row(canvas, /^Product docs/).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(focused()).toBe(row(canvas, 'README.md'));
    await userEvent.click(row(canvas, 'Archive'));
    await expect(row(canvas, 'Archive')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(row(canvas, 'Archive')).not.toHaveAttribute(
      'aria-selected',
      'true',
    );
  },
};

const onSelectionChange = fn();

/** The chevron opens a row without selecting it, and is not a tab stop. */
export const ChevronOpensWithoutSelecting: Story = {
  args: { selectionMode: 'single', onSelectionChange },
  play: async ({ canvas }) => {
    onSelectionChange.mockClear();
    const policies = row(canvas, /^Policies/);
    const chevron = within(policies).getByRole('button', { name: /Expand/ });
    await expect(chevron).toHaveAttribute('tabindex', '-1');
    await userEvent.click(chevron);
    await expect(policies).toHaveAttribute('aria-expanded', 'true');
    await expect(policies).toHaveAttribute('aria-selected', 'false');
    await expect(onSelectionChange).not.toHaveBeenCalled();
    await expect(
      within(policies).getByRole('button', { name: /Collapse/ }),
    ).toBeInTheDocument();
  },
};

export const SingleSelectionReportsKeys: Story = {
  args: {
    selectionMode: 'single',
    onSelectionChange,
    defaultExpandedKeys: ['policies'],
  },
  play: async ({ canvas }) => {
    onSelectionChange.mockClear();
    await userEvent.click(row(canvas, 'Shipping.md'));
    await expect(row(canvas, 'Shipping.md')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(onSelectionChange).toHaveBeenLastCalledWith(
      new Set(['shipping']),
    );
    await userEvent.click(row(canvas, 'Refunds.md'));
    await expect(row(canvas, 'Shipping.md')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  },
};

/** Ticking a folder ticks only the folder: selection does not cascade. */
export const MultipleSelectionDoesNotCascade: Story = {
  args: { selectionMode: 'multiple', defaultExpandedKeys: ['policies'] },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('treegrid')).toHaveAttribute(
      'aria-multiselectable',
      'true',
    );
    await userEvent.click(row(canvas, /^Policies/));
    await userEvent.click(row(canvas, 'Shipping.md'));
    await expect(row(canvas, /^Policies/)).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(row(canvas, 'Refunds.md')).toHaveAttribute(
      'aria-selected',
      'false',
    );
    // Each row draws its box, and a selected one shows the mark.
    const checks = canvasElement.querySelectorAll('.ion-tree-view__check');
    await expect(checks.length).toBe(canvas.getAllByRole('row').length);
    const mark = row(canvas, 'Shipping.md').querySelector(
      '.ion-tree-view__check svg',
    )!;
    await expect(getComputedStyle(mark).opacity).toBe('1');
  },
};

const onAction = fn();

/** With nothing selectable, Enter on a leaf opens it through onAction. */
export const EnterFiresOnAction: Story = {
  args: { onAction, defaultExpandedKeys: ['policies'] },
  play: async ({ canvas }) => {
    onAction.mockClear();
    row(canvas, 'Refunds.md').focus();
    await userEvent.keyboard('{Enter}');
    await expect(onAction).toHaveBeenCalledWith('refunds');
  },
};

/** Opening is the caller's state when controlled — and a real setter here. */
export const ControlledExpansion: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState<Set<string>>(new Set());
    return (
      <>
        <TreeView {...args} expandedKeys={open} onExpandedChange={setOpen} />
        <output>{[...open].join(',') || 'none'}</output>
      </>
    );
  },
  play: async ({ canvas }) => {
    row(canvas, /^Product docs/).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByText('product')).toBeInTheDocument();
    await expect(row(canvas, 'API reference.md')).toBeInTheDocument();
  },
};

/** Each level indents by spacing/20, and leaves line up with their siblings. */
export const LevelsIndent: Story = {
  args: { defaultExpandedKeys: ['policies', 'escalation'] },
  play: async ({ canvasElement, canvas }) => {
    const x = (name: string | RegExp) =>
      row(canvas, name)
        .querySelector('.ion-tree-view__label')!
        .getBoundingClientRect().left;
    await expect(Math.round(x('Refunds.md') - x(/^Policies/))).toBe(20);
    await expect(Math.round(x('Tier 1.md') - x('Refunds.md'))).toBe(20);
    // A leaf's spacer keeps it in line with a sibling folder.
    await expect(Math.round(x('Escalation') - x('Refunds.md'))).toBe(0);
    const r = row(canvas, 'Refunds.md').getBoundingClientRect();
    await expect(r.height).toBeGreaterThanOrEqual(32);
    const toggle = canvasElement
      .querySelector('.ion-tree-view__toggle')!
      .getBoundingClientRect();
    await expect(Math.round(toggle.width)).toBe(24);
  },
};

/** Right to left: ← opens and the indent runs from the right. */
export const RightToLeft: Story = {
  render: (args) => (
    <I18nProvider locale="ar-EG">
      <div dir="rtl">
        <TreeView {...args} defaultExpandedKeys={['policies']} />
      </div>
    </I18nProvider>
  ),
  play: async ({ canvas }) => {
    const product = row(canvas, /^Product docs/);
    product.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(product).toHaveAttribute('aria-expanded', 'true');
    const right = (name: string | RegExp) =>
      row(canvas, name)
        .querySelector('.ion-tree-view__label')!
        .getBoundingClientRect().right;
    await expect(Math.round(right(/^Policies/) - right('Refunds.md'))).toBe(20);
    // A closed chevron points left, the reading direction.
    const closed = row(canvas, 'README.md')
      .closest('.ion-tree-view')!
      .querySelector(
        '.ion-tree-view__toggle:not(.ion-tree-view__toggle--expanded) svg',
      )!;
    await expect(getComputedStyle(closed).transform).toBe(
      'matrix(-1, 0, 0, 1, 0, 0)',
    );
  },
};

/** The ring is on the row, and only for keyboard focus. */
export const FocusRingOnKeyboardFocus: Story = {
  render: (args) => (
    <>
      <button type="button">Before</button>
      <TreeView {...args} />
    </>
  ),
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: 'Before' }).focus();
    await browserUser.keyboard('{Tab}');
    const r = row(canvas, /^Policies/);
    await expect(r).toHaveAttribute('data-focus-visible', 'true');
    await expect(getComputedStyle(r).outlineStyle).toBe('solid');
  },
};
