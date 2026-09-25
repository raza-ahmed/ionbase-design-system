import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { Input, MultiSelect } from 'ionbase-ui';

const TEAMS = [
  { value: 'billing', label: 'Billing', description: 'Invoices and refunds' },
  { value: 'legal', label: 'Legal', description: 'Contracts and policy' },
  { value: 'ops', label: 'Operations', description: 'Runs the agents' },
  { value: 'platform', label: 'Platform', description: 'Infrastructure' },
  { value: 'sales', label: 'Sales', isDisabled: true },
];

const meta: Meta<typeof MultiSelect> = {
  title: 'Components/MultiSelect',
  component: MultiSelect,
  tags: ['autodocs'],
  args: { label: 'Teams', options: TEAMS, placeholder: 'Search teams' },
  parameters: {
    docs: {
      description: {
        component:
          "A text field that filters a list, with any number of values chosen. The choices show as removable tags beneath the field, and are read with it.\n\nCombobox's field and menu, in React Aria's `selectionMode: 'multiple'`: the list stays open between picks, the filter text clears after each one, and `isRequired` means at least one.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MultiSelect>;

export const Default: Story = {};

export const WithSelection: Story = {
  args: {
    defaultValue: ['billing', 'legal'],
    description: 'Every team chosen is notified when a run fails.',
  },
};

export const Invalid: Story = {
  args: {
    isRequired: true,
    isInvalid: true,
    errorMessage: 'Choose at least one team.',
  },
};

export const Disabled: Story = {
  args: { isDisabled: true, defaultValue: ['ops'] },
};

// ------------------------------------------------------------------ tests

const listbox = () => within(document.body).findByRole('listbox');
const option = async (name: RegExp) =>
  within(await listbox()).getByRole('option', { name });

export const IsAMultiselectableCombobox: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByRole('combobox', { name: 'Teams' });
    await userEvent.click(box);
    await userEvent.keyboard('{ArrowDown}');
    const list = await listbox();
    await expect(list).toHaveAttribute('aria-multiselectable', 'true');
    // The disabled option is listed and cannot be chosen.
    await expect(
      within(list).getByRole('option', { name: /Sales/ }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};

/** The list stays open between picks; `onChange` keeps the order chosen. */
export const PickingKeepsTheListOpen: Story = {
  args: { onChange: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show options' }));
    await userEvent.click(await option(/Platform/));
    await userEvent.click(await option(/Billing/));
    await expect(args.onChange).toHaveBeenLastCalledWith([
      'platform',
      'billing',
    ]);
    await expect(await listbox()).toBeVisible();
    await expect(await option(/Platform/)).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // Clicking a chosen option un-chooses it.
    await userEvent.click(await option(/Platform/));
    await expect(args.onChange).toHaveBeenLastCalledWith(['billing']);
  },
};

/** The field holds the filter, never the value: it clears after each pick. */
export const FilterClearsAfterAPick: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByRole('combobox');
    await userEvent.type(box, 'contr');
    // The description is searchable: "Contracts" finds Legal.
    const list = await listbox();
    await waitFor(() =>
      expect(within(list).getAllByRole('option')).toHaveLength(1),
    );
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(box).toHaveValue(''));
    // While the list is open React Aria hides everything outside the field and
    // the list from assistive technology, the tags included. Closed, they are
    // back.
    await userEvent.keyboard('{Escape}');
    await expect(
      await canvas.findByRole('grid', { name: 'Teams' }),
    ).toHaveTextContent('Legal');
  },
};

/** What is chosen is read with the field, in the user's language. */
export const ValueIsReadWithTheField: Story = {
  args: { defaultValue: ['billing', 'legal', 'ops'] },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('combobox', { name: 'Teams' }),
    ).toHaveAccessibleDescription('Billing, Legal, and Operations');
  },
};

/** The tags are a TagGroup named by the field's label. */
export const TagsRemoveAValue: Story = {
  args: { defaultValue: ['billing', 'legal'], onChange: fn() },
  play: async ({ args, canvas }) => {
    const tags = canvas.getByRole('grid', { name: 'Teams' });
    await userEvent.click(
      within(tags).getAllByRole('button', { name: /Remove/ })[0],
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(['legal']);
    await expect(tags).not.toHaveTextContent('Billing');
  },
};

/** The last tag gone, the TagGroup goes too; focus returns to the field. */
export const RemovingTheLastTagFocusesTheField: Story = {
  args: { defaultValue: ['ops'] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Remove/ }));
    await expect(canvas.queryByRole('grid')).toBeNull();
    await waitFor(() => expect(canvas.getByRole('combobox')).toHaveFocus());
  },
};

export const BackspaceRemovesTheLastValue: Story = {
  args: { defaultValue: ['billing', 'legal'], onChange: fn() },
  play: async ({ args, canvas }) => {
    const box = canvas.getByRole('combobox');
    await userEvent.click(box);
    await userEvent.keyboard('{Escape}{Backspace}');
    await expect(args.onChange).toHaveBeenLastCalledWith(['billing']);
    // With text in the field, Backspace edits the text and nothing else.
    await userEvent.type(box, 'x{Backspace}');
    await expect(args.onChange).toHaveBeenCalledTimes(1);
  },
};

/** Required means at least one: flagged only while nothing is chosen. */
export const RequiredOnlyWhileEmpty: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<string[]>([]);
    return (
      <MultiSelect {...args} isRequired value={value} onChange={setValue} />
    );
  },
  play: async ({ canvas }) => {
    const box = canvas.getByRole('combobox');
    await expect(box).toHaveAttribute('aria-required', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Show options' }));
    await userEvent.click(await option(/Legal/));
    await waitFor(() => expect(box).not.toHaveAttribute('aria-required'));
  },
};

/** A named field posts every chosen value, not the text in the box. */
export const SubmitsEveryValue: Story = {
  render: (args) => (
    <form data-testid="form">
      <MultiSelect {...args} name="teams" defaultValue={['ops', 'legal']} />
    </form>
  ),
  play: async ({ canvas }) => {
    const data = new FormData(canvas.getByTestId('form') as HTMLFormElement);
    await expect(data.getAll('teams')).toEqual(['ops', 'legal']);
  },
};

export const DisabledCannotRemove: Story = {
  ...Disabled,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox')).toBeDisabled();
    await expect(canvas.queryByRole('button', { name: /Remove/ })).toBeNull();
    // The value is still shown: disabled is not empty.
    await expect(canvas.getByRole('grid')).toHaveTextContent('Operations');
  },
};

/** Without a visible label, `aria-label` names the field and its tags. */
export const AriaLabelNamesBoth: Story = {
  args: {
    label: undefined,
    'aria-label': 'Filter by team',
    defaultValue: ['ops'],
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('combobox', { name: 'Filter by team' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('grid', { name: 'Filter by team' }),
    ).toBeVisible();
  },
};

/** A row's mark is Checkbox's Small box, filled when chosen. */
export const CheckMatchesTheSmallCheckbox: Story = {
  args: { defaultValue: ['legal'] },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show options' }));
    // Opening highlights the chosen row; move the highlight off it, since a
    // highlighted row is tinted for focus and that is not what this measures.
    await userEvent.keyboard('{ArrowDown}');
    const chosen = await option(/Legal/);
    const on = chosen.querySelector('.ion-multi-select-menu__check')!;
    const off = (await option(/Operations/)).querySelector(
      '.ion-multi-select-menu__check',
    )!;
    const a = getComputedStyle(on);
    const b = getComputedStyle(off);
    await expect(on.getBoundingClientRect().width).toBe(16);
    await expect(a.borderTopWidth).toBe('1px');
    await expect(b.borderTopWidth).toBe('2px');
    await expect(a.backgroundColor).not.toBe(b.backgroundColor);
    // No row tint for the chosen one — the check carries it.
    await expect(chosen).not.toHaveAttribute('data-focused');
    await expect(getComputedStyle(chosen).backgroundColor).toBe(
      'rgba(0, 0, 0, 0)',
    );
  },
};

/** The same box as Input, so the two line up in a filter bar. */
export const MatchesInputsBox: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, width: 560 }}>
      <MultiSelect size="sm" aria-label="Teams" options={TEAMS} />
      <Input size="sm" aria-label="Name" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [multi, input] = canvasElement.querySelectorAll('.ion-input');
    await expect(multi.getBoundingClientRect().height).toBe(
      input.getBoundingClientRect().height,
    );
    await expect(getComputedStyle(multi).borderRadius).toBe(
      getComputedStyle(input).borderRadius,
    );
  },
};

/** In a filter bar the values live in the active-filters row instead. */
export const HideTagsStillReadsTheValue: Story = {
  args: { hideTags: true, defaultValue: ['billing', 'ops'] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('grid')).toBeNull();
    await expect(canvas.getByRole('combobox')).toHaveAccessibleDescription(
      'Billing and Operations',
    );
  },
};
