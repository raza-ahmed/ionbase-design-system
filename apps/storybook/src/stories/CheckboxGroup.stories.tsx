import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Button, Checkbox, CheckboxGroup } from 'ionbase-ui';

const meta: Meta<typeof CheckboxGroup> = {
  title: 'Components/CheckboxGroup',
  component: CheckboxGroup,
  tags: ['autodocs'],
  args: { label: 'Notify the team when' },
  parameters: {
    docs: {
      description: {
        component:
          'A set of checkboxes answering one question. A `<fieldset>`/`<legend>` — Fieldset\'s shell, shared with RadioGroup — that owns the selected values, the group\'s help and error, and "select at least one".\n\nGive every Checkbox a `value`; `onChange` receives the array of ticked values.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckboxGroup>;

/**
 * The native box is visually hidden with `pointer-events: none`, so a click
 * lands on the label — as a real one does. Same as the Radio tests.
 */
const click = (box: HTMLElement) =>
  userEvent.click(box.closest('.ion-checkbox')!);

const Options = () => (
  <>
    <Checkbox value="failed">A run fails</Checkbox>
    <Checkbox value="approval">A run needs approval</Checkbox>
    <Checkbox value="budget">Budget is 80% spent</Checkbox>
  </>
);

export const Default: Story = {
  args: {
    defaultValue: ['failed'],
    description: 'Sent to the owning team’s channel.',
  },
  render: (args) => (
    <CheckboxGroup {...args}>
      <Options />
    </CheckboxGroup>
  ),
};

export const Horizontal: Story = {
  args: { label: 'Regions', orientation: 'horizontal', defaultValue: ['eu'] },
  render: (args) => (
    <CheckboxGroup {...args}>
      <Checkbox value="us">US</Checkbox>
      <Checkbox value="eu">EU</Checkbox>
      <Checkbox value="apac">APAC</Checkbox>
    </CheckboxGroup>
  ),
};

export const Invalid: Story = {
  args: {
    isRequired: true,
    isInvalid: true,
    description: 'Sent to the owning team’s channel.',
    errorMessage:
      'Choose at least one — an agent nobody hears from fails silently.',
  },
  render: Default.render,
};

export const Disabled: Story = {
  args: { isDisabled: true, defaultValue: ['failed'] },
  render: Default.render,
};

// ------------------------------------------------------------------ tests

/** The legend names the group, so it is read on entry to any box. */
export const IsAGroupNamedByItsLegend: Story = {
  ...Default,
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Notify the team when' });
    await expect(group.tagName).toBe('FIELDSET');
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(3);
  },
};

/** Uncontrolled: `onChange` gets the whole selection, in the order ticked. */
export const OnChangeReceivesTheSelection: Story = {
  ...Default,
  args: { ...Default.args, onChange: fn() },
  play: async ({ args, canvas }) => {
    await click(canvas.getByRole('checkbox', { name: /budget/i }));
    await expect(args.onChange).toHaveBeenLastCalledWith(['failed', 'budget']);
    await click(canvas.getByRole('checkbox', { name: /fails/i }));
    await expect(args.onChange).toHaveBeenLastCalledWith(['budget']);
    await expect(
      canvas.getByRole('checkbox', { name: /fails/i }),
    ).not.toBeChecked();
  },
};

export const Controlled: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<string[]>(['approval']);
    return (
      <div>
        <CheckboxGroup {...args} value={value} onChange={setValue}>
          <Options />
        </CheckboxGroup>
        <p data-testid="echo">{value.join(',')}</p>
        <Button onPress={() => setValue([])}>Clear</Button>
      </div>
    );
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('checkbox', { name: /approval/i }),
    ).toBeChecked();
    await click(canvas.getByRole('checkbox', { name: /fails/i }));
    await expect(canvas.getByTestId('echo')).toHaveTextContent(
      'approval,failed',
    );
    // The group follows its value, not the DOM's memory of the last click.
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    for (const box of canvas.getAllByRole('checkbox')) {
      await expect(box).not.toBeChecked();
    }
  },
};

/** A box's own handlers fire inside a group — RadioGroup's contract, kept. */
const onBoxChange = fn();
export const BoxHandlersStillFire: Story = {
  render: function Render(args) {
    const [value, setValue] = useState<string[]>([]);
    return (
      <CheckboxGroup {...args} value={value} onChange={setValue}>
        <Checkbox value="failed" onSelectionChange={onBoxChange}>
          A run fails
        </Checkbox>
      </CheckboxGroup>
    );
  },
  play: async ({ canvas }) => {
    onBoxChange.mockClear();
    await click(canvas.getByRole('checkbox'));
    await expect(onBoxChange).toHaveBeenCalledWith(true);
    await expect(canvas.getByRole('checkbox')).toBeChecked();
  },
};

/**
 * "At least one", natively: every box is `required` while none is ticked and
 * none is once one is. A form can't submit empty, and can once it isn't.
 */
export const RequiresAtLeastOne: Story = {
  render: (args) => (
    <form data-testid="form">
      <CheckboxGroup {...args} isRequired>
        <Options />
      </CheckboxGroup>
    </form>
  ),
  play: async ({ canvas }) => {
    const form = canvas.getByTestId('form') as HTMLFormElement;
    const boxes = canvas.getAllByRole('checkbox');
    for (const b of boxes) await expect(b).toBeRequired();
    await expect(form.checkValidity()).toBe(false);

    await click(boxes[1]);
    for (const b of boxes) await expect(b).not.toBeRequired();
    await expect(form.checkValidity()).toBe(true);

    await click(boxes[1]);
    for (const b of boxes) await expect(b).toBeRequired();
  },
};

/** The error is on the box that takes focus, not only on the fieldset. */
export const ErrorIsReadOnEveryBox: Story = {
  ...Invalid,
  play: async ({ canvas }) => {
    const message = /Choose at least one/;
    await expect(canvas.getByRole('group')).toHaveAccessibleDescription(
      message,
    );
    for (const box of canvas.getAllByRole('checkbox')) {
      await expect(box).toHaveAttribute('aria-invalid', 'true');
      await expect(box).toHaveAccessibleDescription(message);
    }
    // The error takes the description's place; it does not stack beneath it.
    await expect(canvas.queryByText(/owning team/)).toBeNull();
  },
};

export const DescriptionIsReadOnEveryBox: Story = {
  ...Default,
  play: async ({ canvas }) => {
    for (const box of canvas.getAllByRole('checkbox')) {
      await expect(box).toHaveAccessibleDescription(/owning team/);
      await expect(box).not.toHaveAttribute('aria-invalid');
    }
  },
};

export const DisabledCascades: Story = {
  ...Disabled,
  play: async ({ canvas }) => {
    for (const box of canvas.getAllByRole('checkbox')) {
      await expect(box).toBeDisabled();
      // Drawn disabled too, not only inert — the label greys with the box.
      await expect(box.closest('.ion-checkbox')).toHaveClass(
        'ion-checkbox--disabled',
      );
    }
  },
};

/** Size and intent set once on the group reach every box. */
export const SizeAndIntentCascade: Story = {
  args: { size: 'sm', intent: 'neutral' },
  render: Default.render,
  play: async ({ canvasElement }) => {
    const roots = canvasElement.querySelectorAll('.ion-checkbox');
    await expect(roots).toHaveLength(3);
    for (const r of roots) {
      await expect(r).toHaveClass('ion-checkbox--sm', 'ion-checkbox--neutral');
    }
  },
};

/** A named group submits every ticked value under its name. */
export const SubmitsEveryTickedValue: Story = {
  render: (args) => (
    <form data-testid="form">
      <CheckboxGroup
        {...args}
        name="notify"
        defaultValue={['failed', 'budget']}
      >
        <Options />
      </CheckboxGroup>
    </form>
  ),
  play: async ({ canvas }) => {
    const data = new FormData(canvas.getByTestId('form') as HTMLFormElement);
    await expect(data.getAll('notify')).toEqual(['failed', 'budget']);
  },
};

/** Form Field's spacing: 6 under the legend, 6 above the help, 8 between. */
export const SpacingMatchesFormField: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const q = (s: string) => canvasElement.querySelector(s) as HTMLElement;
    const legend = q('.ion-fieldset__legend').getBoundingClientRect();
    const [a, b] = [...canvasElement.querySelectorAll('.ion-checkbox')].map(
      (el) => el.getBoundingClientRect(),
    );
    const helper = q('.ion-fieldset__helper').getBoundingClientRect();
    const last = [...canvasElement.querySelectorAll('.ion-checkbox')]
      .at(-1)!
      .getBoundingClientRect();
    await expect(Math.round(a.top - legend.bottom)).toBe(6);
    await expect(Math.round(b.top - a.bottom)).toBe(8);
    await expect(Math.round(helper.top - last.bottom)).toBe(6);
  },
};

/** Horizontal wraps inside a narrow column rather than overflowing it. */
export const HorizontalWrapsWhenNarrow: Story = {
  render: (args) => (
    <div style={{ width: 200 }} data-testid="frame">
      <CheckboxGroup {...args} orientation="horizontal">
        <Options />
      </CheckboxGroup>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const frame = canvas.getByTestId('frame').getBoundingClientRect();
    const rows = new Set<number>();
    for (const el of canvasElement.querySelectorAll('.ion-checkbox')) {
      const r = el.getBoundingClientRect();
      rows.add(Math.round(r.top));
      await expect(r.right).toBeLessThanOrEqual(frame.right + 1);
    }
    await waitFor(() => expect(rows.size).toBeGreaterThan(1));
  },
};
