import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Input, SearchField } from 'ionbase-ui';

const meta: Meta<typeof SearchField> = {
  title: 'Components/SearchField',
  component: SearchField,
  tags: ['autodocs'],
  args: { 'aria-label': 'Search agents', placeholder: 'Search agents' },
  parameters: {
    docs: {
      description: {
        component:
          'A text field for a search query. `role="searchbox"`; Enter calls `onSubmit`; Escape clears; a clear button, named by React Aria in the user\'s language, appears once there is something to clear.\n\nThe box is Input\'s — same sizes, same states — so it sits beside an Input or a Select in a toolbar without drifting.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SearchField>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    'aria-label': undefined,
    label: 'Search runs',
    description: 'Matches the task, the agent and who requested it.',
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 12, width: 320 }}>
      <SearchField
        {...args}
        size="sm"
        aria-label="Small"
        defaultValue="payroll"
      />
      <SearchField
        {...args}
        size="md"
        aria-label="Medium"
        defaultValue="payroll"
      />
      <SearchField
        {...args}
        size="lg"
        aria-label="Large"
        defaultValue="payroll"
      />
    </div>
  ),
};

export const Disabled: Story = {
  args: { isDisabled: true, defaultValue: 'payroll' },
};

// ------------------------------------------------------------------ tests

export const IsASearchbox: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByRole('searchbox', { name: 'Search agents' });
    await expect(box).toHaveAttribute('type', 'search');
  },
};

/** Nothing to clear, no button — and it appears the moment there is. */
export const ClearAppearsWithAQuery: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.type(canvas.getByRole('searchbox'), 'pay');
    await expect(canvas.getByRole('button')).toHaveAccessibleName();
  },
};

/** Pressing clear empties the field and hands focus straight back to it. */
export const ClearReturnsFocus: Story = {
  args: { defaultValue: 'payroll', onClear: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button'));
    const box = canvas.getByRole('searchbox');
    await expect(box).toHaveValue('');
    await expect(args.onClear).toHaveBeenCalledOnce();
    await waitFor(() => expect(box).toHaveFocus());
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/** Escape is the keyboard's clear — which is why the button is not a tab stop. */
export const EscapeClears: Story = {
  args: { defaultValue: 'payroll' },
  play: async ({ canvas }) => {
    const box = canvas.getByRole('searchbox');
    await userEvent.click(box);
    await userEvent.keyboard('{Escape}');
    await expect(box).toHaveValue('');
    // One tab stop, not two: the clear button is skipped.
    await userEvent.type(box, 'x');
    await userEvent.tab();
    await expect(canvas.getByRole('button')).not.toHaveFocus();
  },
};

export const EnterSubmits: Story = {
  args: { onSubmit: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByRole('searchbox'), 'payroll{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledWith('payroll');
  },
};

/** Controlled, as a filter-as-you-type table search is. */
export const Controlled: Story = {
  render: function Render(args) {
    const [q, setQ] = useState('');
    return (
      <div>
        <SearchField {...args} value={q} onChange={setQ} />
        <p data-testid="echo">{q}</p>
      </div>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('searchbox'), 'ops');
    await expect(canvas.getByTestId('echo')).toHaveTextContent('ops');
    await userEvent.click(canvas.getByRole('button'));
    await expect(canvas.getByTestId('echo')).toHaveTextContent('');
  },
};

/**
 * `type="search"` brings a native cancel button in Chromium and Safari. Ours
 * replaces it; two clear buttons, one unlabelled, is the bug this guards.
 *
 * This reads the shipped stylesheet rather than the rendered button, and that
 * is a limit, not a choice: `getComputedStyle` cannot resolve a vendor
 * pseudo-element — it silently returns the input's own style instead, which is
 * how the first version of this test passed nothing and failed on `auto`.
 */
export const NoNativeCancelButton: Story = {
  args: { defaultValue: 'payroll' },
  play: async () => {
    const rules = [...document.styleSheets].flatMap((sheet) => {
      try {
        return [...sheet.cssRules];
      } catch {
        return [];
      }
    });
    const hides = rules.some(
      (r) =>
        r instanceof CSSStyleRule &&
        r.selectorText.includes(
          '.ion-search-field__field::-webkit-search-cancel-button',
        ) &&
        r.style.display === 'none',
    );
    await expect(hides).toBe(true);
  },
};

/** The same box as Input: a toolbar of the two lines up exactly. */
export const MatchesInputsBox: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, width: 520 }}>
      <SearchField size="sm" aria-label="Search" />
      <Input size="sm" aria-label="Name" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [search, input] = canvasElement.querySelectorAll('.ion-input');
    const a = getComputedStyle(search);
    const b = getComputedStyle(input);
    await expect(search.getBoundingClientRect().height).toBe(
      input.getBoundingClientRect().height,
    );
    await expect(a.borderRadius).toBe(b.borderRadius);
    await expect(a.borderColor).toBe(b.borderColor);
  },
};

/** 24px at Small, the WCAG 2.5.8 floor — the clear target never shrinks below. */
export const ClearTargetMeetsMinimum: Story = {
  args: { size: 'sm', defaultValue: 'payroll' },
  play: async ({ canvas }) => {
    const r = canvas.getByRole('button').getBoundingClientRect();
    await expect(Math.round(r.width)).toBeGreaterThanOrEqual(24);
    await expect(Math.round(r.height)).toBeGreaterThanOrEqual(24);
  },
};
