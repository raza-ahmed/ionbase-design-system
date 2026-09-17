import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, fn, userEvent, waitFor } from 'storybook/test';
import { Badge, Button, PromptInput } from 'ionbase-ui';

const meta: Meta<typeof PromptInput> = {
  title: 'Components/PromptInput',
  component: PromptInput,
  tags: ['autodocs'],
  args: { label: 'Message', placeholder: 'Ask anything…', onSubmit: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '40rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Where a person writes to an agent.\n\n**Not a Textarea and a Button.** Every hand-built composer re-implements the same bugs: Enter during IME composition sends half a word, the prompt is lost when sending fails, the stop control lives somewhere else, and the keyboard contract is invisible to a screen reader.\n\n**Send becomes stop, in place.** While `isRunning` with `onStop`, the send control is replaced by `AgentStop` — the same control with the same guarantees. The field stays editable so the next message can be drafted.\n\n**A failed send restores the text.** Uncontrolled, the field clears on send, and a rejected `onSubmit` promise puts the message back unless the user has already started typing something new.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof PromptInput>;

const Paperclip = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Default: Story = {};

export const WithActionsAndAttachments: Story = {
  args: {
    actions: (
      <Button
        variant="tertiary"
        size="sm"
        aria-label="Attach a file"
        startIcon={<Paperclip />}
      />
    ),
    attachments: (
      <>
        <Badge>q3-report.pdf</Badge>
        <Badge>invoices.csv</Badge>
      </>
    ),
  },
};

/** A run is going: send has become stop, and the field is still editable. */
export const Running: Story = {
  args: { isRunning: true, onStop: fn(), defaultValue: 'And the next one…' },
};

export const Disabled: Story = { args: { isDisabled: true } };

/** Long messages: Enter is a new line, Cmd/Ctrl+Enter sends. */
export const ModEnter: Story = { args: { submitKey: 'mod-enter' } };

/** A working thread: send starts a fake run, stop ends it. */
export const Interactive: Story = {
  render: function Render(args) {
    const [sent, setSent] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    return (
      <div style={{ display: 'grid', gap: '16px' }}>
        <ol>
          {sent.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ol>
        <PromptInput
          {...args}
          isRunning={running}
          onStop={() => setRunning(false)}
          onSubmit={(v) => {
            setSent((s) => [...s, v]);
            setRunning(true);
          }}
        />
      </div>
    );
  },
};

/* ------------------------------------------------------------------ tests */

/** The field is named by `label`, and the send key is described. */
export const FieldIsNamedAndDescribed: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Message' });
    await expect(field).toHaveAccessibleDescription(
      'Press Enter to send, Shift and Enter for a new line.',
    );
  },
};

const submitted = fn();

/** Enter sends and clears; Shift+Enter is a new line; focus stays put. */
export const EnterSendsShiftEnterDoesNot: Story = {
  args: { onSubmit: submitted },
  play: async ({ canvas }) => {
    submitted.mockClear();
    const field = canvas.getByRole('textbox');
    await userEvent.click(field);
    await userEvent.keyboard('Line one{Shift>}{Enter}{/Shift}Line two');
    await expect(submitted).not.toHaveBeenCalled();
    await expect(field).toHaveValue('Line one\nLine two');
    await userEvent.keyboard('{Enter}');
    await expect(submitted).toHaveBeenCalledWith('Line one\nLine two');
    await expect(field).toHaveValue('');
    await expect(field).toHaveFocus();
  },
};

const composing = fn();

/**
 * The contract most composers break: an IME confirming a candidate presses
 * Enter, and that must not send.
 */
export const EnterWhileComposingDoesNotSend: Story = {
  args: { onSubmit: composing, defaultValue: 'にほん' },
  play: async ({ canvas }) => {
    composing.mockClear();
    const field = canvas.getByRole('textbox');
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 });
    await expect(composing).not.toHaveBeenCalled();
    await expect(field).toHaveValue('にほん');
  },
};

/** Nothing to send, nothing sent: the control is disabled on whitespace. */
export const EmptyCannotBeSent: Story = {
  args: { onSubmit: fn() },
  play: async ({ canvas }) => {
    const send = canvas.getByRole('button', { name: 'Send' });
    await expect(send).toBeDisabled();
    await userEvent.type(canvas.getByRole('textbox'), '   ');
    await expect(send).toBeDisabled();
    await userEvent.type(canvas.getByRole('textbox'), 'hi');
    await expect(send).toBeEnabled();
  },
};

/** A rejected send puts the message back. */
export const FailedSendRestoresText: Story = {
  args: {
    defaultValue: 'A long, carefully written prompt',
    onSubmit: () => Promise.reject(new Error('network')),
  },
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(field).toHaveValue('A long, carefully written prompt'),
    );
  },
};

const whileRunning = fn();

/** Running: stop replaces send, Enter does not send, and typing still works. */
export const RunningSwapsSendForStop: Story = {
  args: { isRunning: true, onStop: fn(), onSubmit: whileRunning },
  play: async ({ canvas }) => {
    whileRunning.mockClear();
    await expect(canvas.queryByRole('button', { name: 'Send' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Stop' })).toBeEnabled();
    const field = canvas.getByRole('textbox');
    await userEvent.type(field, 'Next question{Enter}');
    await expect(whileRunning).not.toHaveBeenCalled();
    await expect(field).toHaveValue('Next question');
  },
};

const modSubmitted = fn();

/** mod-enter: Enter is a new line, Ctrl+Enter sends. */
export const ModEnterSendsOnlyWithModifier: Story = {
  args: { submitKey: 'mod-enter', onSubmit: modSubmitted },
  play: async ({ canvas }) => {
    modSubmitted.mockClear();
    const field = canvas.getByRole('textbox');
    await expect(field).toHaveAccessibleDescription(
      'Press Command or Control and Enter to send.',
    );
    await userEvent.type(field, 'a{Enter}b');
    await expect(modSubmitted).not.toHaveBeenCalled();
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await expect(modSubmitted).toHaveBeenCalledWith('a\nb');
  },
};
