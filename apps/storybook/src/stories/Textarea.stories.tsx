import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent } from 'storybook/test';
import { Textarea } from 'ionbase-ui';

const meta: Meta<typeof Textarea> = {
  title: 'Components/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: { size: 'md', placeholder: 'Placeholder', 'aria-label': 'Notes' },
  parameters: {
    docs: {
      description: {
        component:
          'Geometry measured from the Figma `Textarea` (1301:334). Every size and state is Input’s — a textarea is an input that wrapped. The height comes from `rows`, not a fixed CSS height, because the Figma frame hugs three lines of a bound line-height.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      <Textarea {...args} size="sm" aria-label="Small" />
      <Textarea {...args} size="md" aria-label="Medium" />
      <Textarea {...args} size="lg" aria-label="Large" />
    </div>
  ),
};

export const WithLabel: Story = {
  args: {
    label: 'Release notes',
    description: 'Markdown is not rendered.',
    'aria-label': undefined,
  },
};

export const Invalid: Story = {
  args: {
    label: 'Release notes',
    isInvalid: true,
    errorMessage: 'Release notes are required.',
    'aria-label': undefined,
  },
};

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      <Textarea {...args} aria-label="Default" />
      <Textarea
        {...args}
        isReadOnly
        value="Read-only value."
        aria-label="Read only"
      />
      <Textarea {...args} isDisabled aria-label="Disabled" />
    </div>
  ),
};

/**
 * The box is three rows tall by default, and the height is derived from the
 * type ramp rather than pinned. Asserting the row count rather than a pixel
 * height is the point: a fixed height would pass this test and still be wrong
 * the moment the ramp moved.
 */
export const ThreeRowsByDefault: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Notes') as HTMLTextAreaElement;
    await expect(field.rows).toBe(3);
    await expect(field.tagName).toBe('TEXTAREA');
  },
};

/**
 * Resize is vertical, and off when the field is disabled — which is what
 * browsers do with a disabled textarea, so this asserts the platform rather
 * than a preference. The grip itself is the browser's and is never drawn here.
 */
export const ResizeIsVerticalAndOffWhenDisabled: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      <Textarea {...args} aria-label="Enabled" />
      <Textarea {...args} isDisabled aria-label="Disabled" />
    </div>
  ),
  play: async ({ canvas }) => {
    const enabled = canvas.getByLabelText('Enabled');
    const disabled = canvas.getByLabelText('Disabled');
    await expect(getComputedStyle(enabled).resize).toBe('vertical');
    await expect(getComputedStyle(disabled).resize).toBe('none');
  },
};

/**
 * The invalid border is 1px, the same width as every other state.
 *
 * That is a recorded reversal — see Input.stories.tsx and input.css. It means
 * an invalid field differs from a default one by hue alone, so `errorMessage`
 * is what actually satisfies WCAG 1.4.1 here. This checks the message is wired
 * to the field, because it is now the only non-colour cue.
 */
export const ErrorMessageIsTheNonColourCue: Story = {
  args: {
    label: 'Release notes',
    isInvalid: true,
    errorMessage: 'Release notes are required.',
    'aria-label': undefined,
  },
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Release notes') as HTMLTextAreaElement;
    const box = getComputedStyle(field);
    await expect(box.borderLeftWidth).toBe('1px');

    // The message must be the field's description, not loose text beside it.
    const describedBy = field.getAttribute('aria-describedby');
    await expect(describedBy).toBeTruthy();
    const description = document.getElementById(describedBy as string);
    await expect(description?.textContent).toBe('Release notes are required.');
  },
};

export const TypingUpdatesValue: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText('Notes') as HTMLTextAreaElement;
    await userEvent.type(field, 'first line');
    await expect(field.value).toBe('first line');
  },
};
