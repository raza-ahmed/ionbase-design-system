import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
// Real browser input, not act-wrapped synthetic events: the editor moves
// focus on the next frame, the way a browser would see it.
import { userEvent } from 'vitest/browser';
import { InlineEdit, Modal, type InlineEditProps } from 'ionbase-ui';

const PURPOSE = 'Matches supplier invoices to purchase orders.';

const Purpose = (props: Partial<InlineEditProps>) => (
  <div style={{ maxWidth: 480 }}>
    <InlineEdit
      label="Purpose"
      editLabel="Edit purpose"
      defaultValue={PURPOSE}
      {...props}
    />
  </div>
);

const meta: Meta<typeof InlineEdit> = {
  title: 'Components/InlineEdit',
  component: InlineEdit,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A value that becomes a field where it stands. The value is text with an Edit button beside it; editing shows the field with Save and Cancel. Enter saves, Escape cancels, focus goes into the field and comes back to Edit, and an invalid or failed save keeps what was typed. Nothing happens on blur.',
      },
    },
  },
  render: () => <Purpose />,
};

export default meta;
type Story = StoryObj<typeof InlineEdit>;

export const Default: Story = {};
export const Empty: Story = {
  render: () => <Purpose defaultValue="" placeholder="Add a purpose" />,
};
export const Multiline: Story = { render: () => <Purpose isMultiline /> };
export const Small: Story = { render: () => <Purpose size="sm" /> };

// ------------------------------------------------------------------ tests

const saveSpy = fn();
const cancelSpy = fn();

const editButton = (c: ReturnType<typeof within>) =>
  c.getByRole('button', { name: 'Edit purpose' });
const field = (c: ReturnType<typeof within>) =>
  c.getByRole('textbox', { name: 'Purpose' });
/** Opens the editor and waits for the field to take focus. */
const openEditor = async (c: ReturnType<typeof within>) => {
  await userEvent.click(editButton(c));
  await waitFor(() => expect(field(c)).toHaveFocus());
};
const status = (el: HTMLElement) =>
  el.querySelector('.ion-inline-edit > [role="status"]') as HTMLElement;

/**
 * The value is text, read as text, and Edit is one button beside it — the
 * value is not inside a button.
 */
export const TheValueIsTextEditIsAButton: Story = {
  play: async ({ canvas }) => {
    const text = canvas.getByText(PURPOSE);
    await expect(text.closest('button')).toBeNull();
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await expect(editButton(canvas)).toBeVisible();
  },
};

/** Edit focuses the field with its text selected, ready to be replaced. */
export const EditFocusesTheFieldSelected: Story = {
  play: async ({ canvas }) => {
    editButton(canvas).focus();
    await userEvent.keyboard('{Enter}');
    const input = field(canvas) as HTMLInputElement;
    await waitFor(() => expect(input).toHaveFocus());
    await expect([input.selectionStart, input.selectionEnd]).toEqual([
      0,
      PURPOSE.length,
    ]);
  },
};

/** Clicking the text opens the editor too, for a pointer. */
export const ClickingTheTextEdits: Story = {
  play: async ({ canvas }) => {
    await openEditor(canvas);
    const input = field(canvas) as HTMLInputElement;
    await expect([input.selectionStart, input.selectionEnd]).toEqual([
      0,
      PURPOSE.length,
    ]);
    await userEvent.keyboard('{Escape}');
    await userEvent.click(canvas.getByText(PURPOSE));
    await waitFor(() => expect(field(canvas)).toHaveFocus());
  },
};

/**
 * Enter saves: `onSave` gets the new value, the view shows it, focus is back
 * on Edit, and "Purpose saved" is announced in the region that was already
 * there.
 */
export const EnterSavesAndSaysSo: Story = {
  render: () => <Purpose onSave={saveSpy} />,
  play: async ({ canvas, canvasElement }) => {
    saveSpy.mockClear();
    const region = status(canvasElement);
    await openEditor(canvas);
    await userEvent.keyboard('Reconciles invoices{Enter}');
    await expect(saveSpy).toHaveBeenCalledWith('Reconciles invoices');
    await expect(canvas.getByText('Reconciles invoices')).toBeVisible();
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await waitFor(() => expect(editButton(canvas)).toHaveFocus());
    await expect(status(canvasElement)).toBe(region);
    await expect(region).toHaveTextContent('Purpose saved');
  },
};

/** Escape cancels: what was typed is gone, and focus is back on Edit. */
export const EscapeCancels: Story = {
  render: () => <Purpose onCancel={cancelSpy} onSave={saveSpy} />,
  play: async ({ canvas }) => {
    cancelSpy.mockClear();
    saveSpy.mockClear();
    await openEditor(canvas);
    await userEvent.keyboard('Something else{Escape}');
    await expect(canvas.getByText(PURPOSE)).toBeVisible();
    await expect(cancelSpy).toHaveBeenCalledTimes(1);
    await expect(saveSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(editButton(canvas)).toHaveFocus());
  },
};

/** Escape from the Save or Cancel button cancels too. */
export const EscapeFromTheButtonsCancels: Story = {
  play: async ({ canvas }) => {
    await openEditor(canvas);
    await userEvent.keyboard('Draft');
    await userEvent.tab();
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Save' })).toHaveFocus(),
    );
    await userEvent.keyboard('{Escape}');
    await expect(canvas.getByText(PURPOSE)).toBeVisible();
    await waitFor(() => expect(editButton(canvas)).toHaveFocus());
  },
};

/** Cancel is a button, and returns focus to Edit. */
export const CancelReturnsFocus: Story = {
  play: async ({ canvas }) => {
    await openEditor(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(editButton(canvas)).toHaveFocus());
  },
};

/** Escape stops at the editor, even from its buttons: the dialog stays open. */
export const EscapeDoesNotCloseTheDialog: Story = {
  render: () => {
    // A dialog that really closes on Escape, so the test can tell.
    function Dialog() {
      const [open, setOpen] = useState(true);
      return (
        <Modal isOpen={open} title="Agent details" onOpenChange={setOpen}>
          <Purpose />
        </Modal>
      );
    }
    return <Dialog />;
  },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole('button', { name: 'Edit purpose' }));
    await waitFor(() =>
      expect(body.getByRole('textbox', { name: 'Purpose' })).toHaveFocus(),
    );
    // From the Save button: the field stops its own keys; a button does not.
    // Tab order is EscapeFromTheButtonsCancels' job; here, only where Escape goes.
    body.getByRole('button', { name: 'Save' }).focus();
    await userEvent.keyboard('{Escape}');
    await expect(
      body.getByRole('dialog', { name: 'Agent details' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(body.getByRole('button', { name: 'Edit purpose' })).toHaveFocus(),
    );
  },
};

/**
 * `validate` runs first: an invalid value stays in the field as its error,
 * `onSave` is not called, and typing clears the error.
 */
export const InvalidKeepsWhatWasTyped: Story = {
  render: () => (
    <Purpose
      onSave={saveSpy}
      validate={(v) => (v.trim() ? undefined : 'Say what the agent is for.')}
    />
  ),
  play: async ({ canvas }) => {
    saveSpy.mockClear();
    await openEditor(canvas);
    await userEvent.keyboard('{Backspace}   {Enter}');
    const input = field(canvas);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription(
      'Say what the agent is for.',
    );
    await expect(input).toHaveValue('   ');
    await waitFor(() => expect(input).toHaveFocus());
    await expect(saveSpy).not.toHaveBeenCalled();
    await userEvent.keyboard('x');
    await waitFor(() => expect(input).toHaveValue('   x'));
    await waitFor(() => expect(input).not.toHaveAttribute('aria-invalid'));
    // The same field throughout — not remounted as the error came and went.
    await expect(field(canvas)).toBe(input);
    await expect(input).toHaveFocus();
  },
};

/**
 * A save that fails keeps the editor open with its message, and what was
 * typed. While it runs, Save says Saving… and the field is read-only — not
 * disabled, so focus stays.
 */
export const AFailedSaveKeepsWhatWasTyped: Story = {
  render: () => (
    <Purpose
      onSave={() =>
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('The agent service did not respond.')),
            300,
          ),
        )
      }
    />
  ),
  play: async ({ canvas }) => {
    await openEditor(canvas);
    await userEvent.keyboard('New purpose{Enter}');
    await expect(canvas.getByRole('button', { name: 'Saving…' })).toBeVisible();
    await expect(field(canvas)).toHaveAttribute('readonly');
    await expect(field(canvas)).toBeEnabled();
    await waitFor(() => expect(field(canvas)).toHaveFocus());
    await waitFor(() =>
      expect(field(canvas)).toHaveAccessibleDescription(
        'The agent service did not respond.',
      ),
    );
    await expect(field(canvas)).toHaveValue('New purpose');
    await expect(field(canvas)).not.toHaveAttribute('readonly');
    await waitFor(() => expect(field(canvas)).toHaveFocus());
  },
};

/** Saving an unchanged value just closes: nothing to save. */
export const UnchangedDoesNotSave: Story = {
  render: () => <Purpose onSave={saveSpy} />,
  play: async ({ canvas, canvasElement }) => {
    saveSpy.mockClear();
    await openEditor(canvas);
    await userEvent.keyboard('{Enter}');
    await expect(saveSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(editButton(canvas)).toHaveFocus());
    await expect(status(canvasElement)).toHaveTextContent(/^$/);
  },
};

/** Multiline: Enter adds a line; ⌘/Ctrl+Enter saves. */
export const MultilineEnterAddsALine: Story = {
  render: () => <Purpose isMultiline onSave={saveSpy} />,
  play: async ({ canvas }) => {
    saveSpy.mockClear();
    await openEditor(canvas);
    // Opened with its text selected, so typing replaces it.
    await userEvent.keyboard('One{Enter}Two');
    await expect(field(canvas)).toHaveValue('One\nTwo');
    await expect(saveSpy).not.toHaveBeenCalled();
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await expect(saveSpy).toHaveBeenCalledWith('One\nTwo');
  },
};

/** Empty shows the placeholder in secondary text, and can still be edited. */
export const EmptyShowsThePlaceholder: Story = {
  ...Empty,
  play: async ({ canvas }) => {
    const text = canvas.getByText('Add a purpose');
    await expect(text).toHaveAttribute('data-empty');
    await openEditor(canvas);
    await expect(field(canvas)).toHaveValue('');
  },
};

/** Read-only shows the value and nothing to press. */
export const ReadOnlyHasNoEdit: Story = {
  render: () => <Purpose isReadOnly />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByText(PURPOSE));
    await expect(canvas.queryByRole('textbox')).toBeNull();
  },
};

/** Controlled: the view shows `value`, and follows the parent after a save. */
export const Controlled: Story = {
  render: () => {
    function Parent() {
      const [purpose, setPurpose] = useState(PURPOSE);
      return (
        <>
          <Purpose value={purpose} onSave={setPurpose} />
          <output data-testid="kept">{purpose}</output>
        </>
      );
    }
    return <Parent />;
  },
  play: async ({ canvas }) => {
    await openEditor(canvas);
    await userEvent.keyboard('Kept by the parent{Enter}');
    await expect(canvas.getByTestId('kept')).toHaveTextContent(
      'Kept by the parent',
    );
    await expect(canvas.getAllByText('Kept by the parent')).toHaveLength(2);
  },
};

/**
 * The value inherits the text around it, so it looks like what it replaces;
 * `size` is the field's — 32px at `sm`, 40px at `md`.
 */
export const TheValueInheritsSizeIsTheFields: Story = {
  render: () => (
    <>
      <div style={{ font: '600 22px/30px serif', color: 'rgb(1, 2, 3)' }}>
        <Purpose size="sm" />
      </div>
      <Purpose />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    const value = canvasElement.querySelector(
      '.ion-inline-edit__value',
    ) as HTMLElement;
    const style = getComputedStyle(value);
    await expect([style.fontSize, style.fontWeight, style.color]).toEqual([
      '22px',
      '600',
      'rgb(1, 2, 3)',
    ]);
    const [sm, md] = canvas.getAllByRole('button', { name: 'Edit purpose' });
    await userEvent.click(sm);
    await userEvent.click(md);
    await waitFor(() =>
      expect(canvas.getAllByRole('textbox', { name: 'Purpose' })).toHaveLength(
        2,
      ),
    );
    const heights = [
      ...canvasElement.querySelectorAll('.ion-inline-edit .ion-input'),
    ].map((b) => b.getBoundingClientRect().height);
    await expect(heights).toEqual([32, 40]);
  },
};
