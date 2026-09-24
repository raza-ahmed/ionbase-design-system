import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Button, Divider, SettingRow, Toggle } from 'ionbase-ui';

const meta: Meta<typeof SettingRow> = {
  title: 'Components/SettingRow',
  component: SettingRow,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "One setting: its name and what it does on the left, the control on the right. Drawn in Figma as `Setting Row` (1418:260); promoted from the demo app's settings screen.\n\n**The wiring is the point.** A label placed beside a Toggle looks labelled and is not. Pass the control as a child and the row names and describes it. A control with its own text — a Button — keeps that text as its name (WCAG 2.5.3), and the row's text becomes its description.\n\nIt stacks below 30rem of its own width, so the same row works in a page and in a narrow drawer.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SettingRow>;

export const Default: Story = {
  render: () => (
    <SettingRow
      label="Weekly digest"
      description="A Monday summary of runs, approvals and anything that failed."
    >
      <Toggle defaultChecked />
    </SettingRow>
  ),
};

export const Panel: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--spacing-16)',
        maxWidth: '40rem',
      }}
    >
      <SettingRow
        label="Weekly digest"
        description="A Monday summary of runs, approvals and anything that failed."
      >
        <Toggle defaultChecked />
      </SettingRow>
      <SettingRow
        label="Approval requests"
        description="Email me when an agent pauses for a decision."
      >
        <Toggle />
      </SettingRow>
      <Divider />
      <SettingRow
        label="Delete workspace"
        description="Removes every agent, run log and knowledge file after 7 days."
      >
        <Button variant="destructive" size="sm">
          Delete workspace…
        </Button>
      </SettingRow>
    </div>
  ),
};

/**
 * A Toggle has no text of its own, so the row's label is its name and the
 * description is announced with it — not "switch, off" and nothing else.
 */
export const ToggleIsNamedByTheRow: Story = {
  render: Default.render,
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('switch', { name: 'Weekly digest' });
    await expect(toggle).toHaveAccessibleDescription(
      'A Monday summary of runs, approvals and anything that failed.',
    );
  },
};

/**
 * A Button keeps its own words as its name — WCAG 2.5.3 wants the visible
 * text inside the accessible name — and takes the row's text as description.
 */
export const ButtonKeepsItsOwnName: Story = {
  render: () => (
    <SettingRow
      label="Danger zone"
      description="Removes everything after 7 days."
    >
      <Button variant="destructive" size="sm">
        Delete workspace…
      </Button>
    </SettingRow>
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Delete workspace…' });
    await expect(button).toHaveAccessibleDescription(
      'Danger zone Removes everything after 7 days.',
    );
  },
};

/** A name the caller wires explicitly is kept, never overwritten. */
export const ExplicitLabelWins: Story = {
  render: () => (
    <>
      <span id="custom-name">Digest emails</span>
      <SettingRow label="Weekly digest">
        <Toggle aria-labelledby="custom-name" />
      </SettingRow>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('switch', { name: 'Digest emails' }),
    ).toBeInTheDocument();
  },
};

/** A function child receives the ids, for a control that needs them elsewhere. */
export const FunctionChildGetsTheIds: Story = {
  render: () => (
    <SettingRow label="Retention" description="Days to keep run logs.">
      {({ labelId, descriptionId }) => (
        <input
          type="number"
          defaultValue={30}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
        />
      )}
    </SettingRow>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole('spinbutton', { name: 'Retention' });
    await expect(input).toHaveAccessibleDescription('Days to keep run logs.');
  },
};

/**
 * It stacks by its OWN width. The same row sits inline at 40rem and stacks at
 * 20rem — in one viewport, so a media query could not produce both.
 */
export const StacksByItsOwnWidth: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--spacing-32)' }}>
      {['40rem', '20rem'].map((w) => (
        <div key={w} data-testid={w} style={{ width: w }}>
          <SettingRow
            label="Weekly digest"
            description="A Monday summary of runs, approvals and anything that failed."
          >
            <Toggle />
          </SettingRow>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const box = (w: string) => {
      const wrap = canvas.getByTestId(w);
      const text = wrap.querySelector('.ion-setting-row__text')!;
      const control = wrap.querySelector('.ion-setting-row__control')!;
      return {
        text: text.getBoundingClientRect(),
        control: control.getBoundingClientRect(),
      };
    };
    const wide = box('40rem');
    await expect(wide.control.left).toBeGreaterThan(wide.text.right);
    const narrow = box('20rem');
    await expect(narrow.control.top).toBeGreaterThanOrEqual(narrow.text.bottom);
  },
};
