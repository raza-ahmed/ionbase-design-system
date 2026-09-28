import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import {
  DualListbox,
  type DualListboxOption,
  type DualListboxProps,
} from 'ionbase-ui';

const PEOPLE: DualListboxOption[] = [
  { value: 'ada', label: 'Ada Reyes', description: 'Finance' },
  { value: 'kwame', label: 'Kwame Mensah', description: 'Platform' },
  { value: 'lin', label: 'Lin Zhou', description: 'Customer support' },
  { value: 'priya', label: 'Priya Natarajan', description: 'Growth' },
  { value: 'tomas', label: 'Tomás Ortega', description: 'Legal' },
  {
    value: 'ravi',
    label: 'Ravi Kapoor',
    description: 'Invited, not joined yet',
    isDisabled: true,
  },
];

/** The field with its value written out, so a test can read it. */
function Harness({
  width = 640,
  ...props
}: Partial<DualListboxProps> & { width?: number }) {
  const [value, setValue] = useState<string[]>(
    (props.defaultValue as string[]) ?? [],
  );
  return (
    <div style={{ width }}>
      <DualListbox
        label="Approval order"
        description="Asked in this order."
        options={PEOPLE}
        value={value}
        onChange={setValue}
        {...props}
        defaultValue={undefined}
      />
      <output data-testid="value">{value.join(',')}</output>
    </div>
  );
}

const meta: Meta<typeof DualListbox> = {
  title: 'Components/DualListbox',
  component: DualListbox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Choose some of many in two lists side by side — what is available, and what is chosen — with buttons that move options across, and optionally an order. A form field.\n\nNot a MultiSelect: that hides what is left behind a popover and shows what is chosen as tags that cannot be reordered. Use this when the chosen set is long and reviewed whole, or when its order means something.',
      },
    },
  },
  render: () => <Harness isReorderable defaultValue={['kwame', 'lin']} />,
};

export default meta;
type Story = StoryObj<typeof DualListbox>;

export const Default: Story = {};
export const WithoutOrder: Story = {
  render: () => <Harness defaultValue={['kwame']} />,
};
export const Invalid: Story = {
  render: () => (
    <Harness
      isRequired
      isInvalid
      errorMessage="Choose at least one approver."
    />
  ),
};
export const Disabled: Story = {
  render: () => <Harness isDisabled defaultValue={['kwame']} />,
};
export const Narrow: Story = {
  render: () => <Harness width={320} isReorderable defaultValue={['kwame']} />,
};

// ------------------------------------------------------------------ tests

type Canvas = ReturnType<typeof within>;
const list = (c: Canvas, which: 'Available' | 'Selected') =>
  c.getByRole('listbox', { name: `Approval order ${which}` });
const option = (c: Canvas, which: 'Available' | 'Selected', name: string) =>
  within(list(c, which)).getByRole('option', { name: new RegExp(`^${name}`) });
const value = (c: Canvas) => c.getByTestId('value').textContent;
/** The field's own status region — a Button carries one too. */
const said = (c: Canvas) =>
  c
    .getByRole('group')
    .querySelector(':scope > [role="status"]')
    ?.textContent?.replace(/\u00a0/g, '');

/** A named group of two multi-select listboxes, each one tab stop. */
export const IsAGroupOfTwoListboxes: Story = {
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Approval order' });
    await expect(group).toHaveAccessibleDescription('Asked in this order.');
    for (const which of ['Available', 'Selected'] as const)
      await expect(list(canvas, which)).toHaveAttribute(
        'aria-multiselectable',
        'true',
      );
    await expect(
      within(list(canvas, 'Selected'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Kwame MensahPlatform', 'Lin ZhouCustomer support']);
    // Available keeps the options' own order, less what is chosen.
    await expect(
      within(list(canvas, 'Available'))
        .getAllByRole('option')
        .map((o) => o.getAttribute('data-key')),
    ).toEqual(['ada', 'priya', 'tomas', 'ravi']);
    // One tab stop each, then the buttons.
    await userEvent.tab();
    await expect(
      list(canvas, 'Available').contains(document.activeElement),
    ).toBe(true);
    await userEvent.tab();
    await expect(document.activeElement?.getAttribute('aria-label')).toMatch(
      /^(Add to selected|Remove from selected)$/,
    );
  },
};

/**
 * Pick, then Add: the option moves to the end of Selected and stays picked
 * there. Add is left disabled, so focus goes to it. Announced.
 */
export const PickAndAdd: Story = {
  play: async ({ canvas }) => {
    await browserUser.click(option(canvas, 'Available', 'Tomás'));
    await browserUser.click(
      canvas.getByRole('button', { name: 'Add to selected' }),
    );
    await expect(value(canvas)).toBe('kwame,lin,tomas');
    const moved = option(canvas, 'Selected', 'Tomás');
    await expect(moved).toHaveAttribute('aria-selected', 'true');
    await expect(
      canvas.getByRole('button', { name: 'Add to selected' }),
    ).toBeDisabled();
    await waitFor(() => expect(moved).toHaveFocus());
    await expect(said(canvas)).toBe('1 moved to Selected');
  },
};

/**
 * From the keyboard: ↓ picks, Shift+↓ extends, and the two go across in the
 * options' order. Remove takes them back where they came from.
 */
export const ShiftExtendsAndOrderIsKept: Story = {
  play: async ({ canvas }) => {
    // Arriving in the list picks its first option; Shift+↓ extends.
    list(canvas, 'Available').focus();
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    await expect(option(canvas, 'Available', 'Ada')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(option(canvas, 'Available', 'Priya')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await browserUser.click(
      canvas.getByRole('button', { name: 'Add to selected' }),
    );
    await expect(value(canvas)).toBe('kwame,lin,ada,priya');
    await expect(said(canvas)).toBe('2 moved to Selected');
    // Still picked in Selected, so Remove sends them straight back.
    await browserUser.click(
      canvas.getByRole('button', { name: 'Remove from selected' }),
    );
    await expect(value(canvas)).toBe('kwame,lin');
    await expect(
      within(list(canvas, 'Available'))
        .getAllByRole('option')
        .map((o) => o.getAttribute('data-key')),
    ).toEqual(['ada', 'priya', 'tomas', 'ravi']);
  },
};

/** Enter, or a double click, moves one option straight across. */
export const EnterAndDoubleClickMoveAcross: Story = {
  play: async ({ canvas }) => {
    list(canvas, 'Available').focus();
    await userEvent.keyboard('{Enter}');
    await expect(value(canvas)).toBe('kwame,lin,ada');
    await browserUser.dblClick(option(canvas, 'Selected', 'Kwame'));
    await expect(value(canvas)).toBe('lin,ada');
  },
};

/**
 * Move up keeps focus while it can go further, and hands it to the option
 * once it reaches the top and the button disables.
 */
export const ReorderKeepsFocusUntilTheButtonDisables: Story = {
  render: () => (
    <Harness isReorderable defaultValue={['kwame', 'lin', 'ada']} />
  ),
  play: async ({ canvas }) => {
    await browserUser.click(option(canvas, 'Selected', 'Ada'));
    const up = canvas.getByRole('button', { name: 'Move up' });
    await expect(
      canvas.getByRole('button', { name: 'Move down' }),
    ).toBeDisabled();
    up.focus();
    await userEvent.keyboard('{Enter}');
    await expect(value(canvas)).toBe('kwame,ada,lin');
    await expect(said(canvas)).toBe('Ada Reyes, 2 of 3');
    await expect(up).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(value(canvas)).toBe('ada,kwame,lin');
    await expect(up).toBeDisabled();
    await waitFor(() =>
      expect(option(canvas, 'Selected', 'Ada')).toHaveFocus(),
    );
  },
};

/** Several picked move together as a block, and stop at the edge. */
export const ABlockMovesTogether: Story = {
  render: () => (
    <Harness isReorderable defaultValue={['kwame', 'lin', 'ada', 'priya']} />
  ),
  play: async ({ canvas }) => {
    await browserUser.click(option(canvas, 'Selected', 'Lin'));
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    await browserUser.click(canvas.getByRole('button', { name: 'Move down' }));
    await expect(value(canvas)).toBe('kwame,priya,lin,ada');
    await expect(said(canvas)).toBe('2 moved, from 3 of 4');
    await expect(
      canvas.getByRole('button', { name: 'Move down' }),
    ).toBeDisabled();
  },
};

/** A disabled option cannot be picked, so it cannot be moved. */
export const DisabledOptionsStay: Story = {
  play: async ({ canvas }) => {
    const ravi = option(canvas, 'Available', 'Ravi');
    await expect(ravi).toHaveAttribute('aria-disabled', 'true');
    await browserUser.click(ravi, { force: true });
    await expect(ravi).not.toHaveAttribute('aria-selected', 'true');
    await expect(
      canvas.getByRole('button', { name: 'Add to selected' }),
    ).toBeDisabled();
    await browserUser.dblClick(ravi, { force: true });
    await expect(value(canvas)).toBe('kwame,lin');
  },
};

/** An empty list stays a named, focusable listbox, and says it is empty. */
export const AnEmptyListSaysSo: Story = {
  render: () => <Harness />,
  play: async ({ canvas }) => {
    const selected = list(canvas, 'Selected');
    await expect(selected).toHaveAttribute('tabindex', '0');
    await expect(selected).toHaveAccessibleDescription(/^None/);
    await expect(within(selected).queryAllByRole('option')).toHaveLength(0);
  },
};

/** Required and invalid are on the chosen list, which the error describes. */
export const InvalidIsOnTheChosenList: Story = {
  ...Invalid,
  play: async ({ canvas }) => {
    const selected = list(canvas, 'Selected');
    await expect(selected).toHaveAttribute('aria-required', 'true');
    await expect(selected).toHaveAttribute('aria-invalid', 'true');
    await expect(selected).toHaveAccessibleDescription(
      /Choose at least one approver\./,
    );
  },
};

/** `isDisabled`: nothing can be picked, and every button is off. */
export const DisabledDisablesEverything: Story = {
  ...Disabled,
  play: async ({ canvas }) => {
    await browserUser.click(option(canvas, 'Available', 'Ada'), {
      force: true,
    });
    await expect(option(canvas, 'Available', 'Ada')).not.toHaveAttribute(
      'aria-selected',
      'true',
    );
    for (const b of canvas.getAllByRole('button'))
      await expect(b).toBeDisabled();
  },
};

/** `name` posts each chosen value, in the chosen order. */
export const NamePostsTheOrder: Story = {
  render: () => (
    <form data-testid="form">
      <Harness name="approvers" isReorderable defaultValue={['kwame', 'lin']} />
    </form>
  ),
  play: async ({ canvas }) => {
    await browserUser.click(option(canvas, 'Selected', 'Lin'));
    await browserUser.click(canvas.getByRole('button', { name: 'Move up' }));
    const form = canvas.getByTestId('form') as HTMLFormElement;
    await expect(new FormData(form).getAll('approvers')).toEqual([
      'lin',
      'kwame',
    ]);
  },
};

/** Below 30rem of its own width the lists stack, the buttons between them. */
export const StacksWhenNarrow: Story = {
  ...Narrow,
  play: async ({ canvas }) => {
    const a = list(canvas, 'Available').getBoundingClientRect();
    const s = list(canvas, 'Selected').getBoundingClientRect();
    const add = canvas
      .getByRole('button', { name: 'Add to selected' })
      .getBoundingClientRect();
    await expect(s.top).toBeGreaterThan(a.bottom);
    await expect(add.top).toBeGreaterThan(a.bottom);
    await expect(add.bottom).toBeLessThan(s.top);
    await expect(Math.round(a.width)).toBe(Math.round(s.width));
  },
};

/** Every string it renders or announces comes from `labels`. */
export const EveryStringIsReplaceable: Story = {
  render: () => (
    <Harness
      isReorderable
      labels={{
        available: 'Everyone',
        selected: 'Approvers',
        add: 'Add to approvers',
        remove: 'Remove from approvers',
        moveUp: 'Earlier',
        moveDown: 'Later',
        empty: 'Nobody',
        moved: (n, l) => `${n} → ${l}`,
        reordered: (labels, p, t) => `${labels[0]} ${p}/${t}`,
      }}
    />
  ),
  play: async ({ canvas }) => {
    const approvers = canvas.getByRole('listbox', {
      name: 'Approval order Approvers',
    });
    await expect(approvers).toHaveAccessibleDescription(/^Nobody/);
    for (const name of [
      'Add to approvers',
      'Remove from approvers',
      'Earlier',
      'Later',
    ])
      await expect(canvas.getByRole('button', { name })).toBeInTheDocument();
    const everyone = canvas.getByRole('listbox', {
      name: 'Approval order Everyone',
    });
    await browserUser.dblClick(within(everyone).getAllByRole('option')[0]);
    await expect(said(canvas)).toBe('1 → Approvers');
  },
};

/**
 * After a move, Tab back into the list it left lands on the option now in
 * its place, so Enter moves the next one without an arrow key first.
 */
export const ReturningLandsOnTheNextOption: Story = {
  play: async ({ canvas }) => {
    await browserUser.click(option(canvas, 'Available', 'Priya'));
    await browserUser.click(
      canvas.getByRole('button', { name: 'Add to selected' }),
    );
    list(canvas, 'Available').focus();
    await waitFor(() =>
      expect(option(canvas, 'Available', 'Tomás')).toHaveFocus(),
    );
    await userEvent.keyboard('{Enter}');
    await expect(value(canvas)).toBe('kwame,lin,priya,tomas');
  },
};
