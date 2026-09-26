import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { PasswordInput, type PasswordInputProps } from 'ionbase-ui';

const Field = (props: Partial<PasswordInputProps>) => (
  <div style={{ maxWidth: 320 }}>
    <PasswordInput label="Password" {...props} />
  </div>
);

const meta: Meta<typeof PasswordInput> = {
  title: 'Components/PasswordInput',
  component: PasswordInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A password field with a Show password toggle. The toggle keeps its name and says its state with `aria-pressed`; a polite status also says "Password shown" or "Password hidden". Spellcheck is off whatever the state, and submitting the form hides the password first, so a password manager sees a password field.',
      },
    },
  },
  render: () => <Field description="At least 12 characters." />,
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {};
export const NewPassword: Story = {
  render: () => (
    <Field
      label="New password"
      autoComplete="new-password"
      description="At least 12 characters."
    />
  ),
};
export const Invalid: Story = {
  render: () => <Field isInvalid errorMessage="That password is incorrect." />,
};
export const Small: Story = { render: () => <Field size="sm" /> };

// ------------------------------------------------------------------ tests

const field = (c: ReturnType<typeof within>) => c.getByLabelText('Password');
const toggle = (c: ReturnType<typeof within>) =>
  c.getByRole('button', { name: 'Show password' });
const status = (el: HTMLElement) =>
  el.querySelector('.ion-password-input__status') as HTMLElement;

/**
 * Hidden to start, as a current password, with nothing that would send it
 * anywhere: no spellcheck, autocorrect or autocapitalise.
 */
export const StartsHiddenAndPrivate: Story = {
  play: async ({ canvas }) => {
    const input = field(canvas);
    await expect(input).toHaveAttribute('type', 'password');
    await expect(input).toHaveAttribute('autocomplete', 'current-password');
    await expect(input).toHaveAttribute('spellcheck', 'false');
    await expect(input).toHaveAttribute('autocorrect', 'off');
    await expect(input).toHaveAttribute('autocapitalize', 'off');
  },
};

/**
 * The toggle is a toggle: named "Show password", `aria-pressed` false,
 * controlling the field, and a tab stop after it.
 */
export const TheToggleIsATabStopToggle: Story = {
  play: async ({ canvas }) => {
    const t = toggle(canvas);
    await expect(t).toHaveAttribute('aria-pressed', 'false');
    await expect(t).toHaveAttribute('aria-controls', field(canvas).id);
    await expect(t).toHaveAttribute('type', 'button');
    await userEvent.click(field(canvas));
    await userEvent.tab();
    await expect(t).toHaveFocus();
  },
};

/**
 * Pressed, the password shows and the name stays — the pressed state says it
 * is on — and the icon changes. The status says so each time, and not before
 * the first press.
 */
export const RevealsAndSaysSo: Story = {
  play: async ({ canvas, canvasElement }) => {
    const input = field(canvas);
    const t = toggle(canvas);
    const icon = t.innerHTML;
    await expect(status(canvasElement)).toHaveAttribute('role', 'status');
    await expect(status(canvasElement)).toHaveTextContent(/^$/);

    await userEvent.click(t);
    await expect(input).toHaveAttribute('type', 'text');
    await expect(t).toHaveAttribute('aria-pressed', 'true');
    await expect(t).toHaveAccessibleName('Show password');
    await expect(t.innerHTML).not.toBe(icon);
    await expect(status(canvasElement)).toHaveTextContent('Password shown');
    // Private whatever the state.
    await expect(input).toHaveAttribute('spellcheck', 'false');

    await userEvent.click(t);
    await expect(input).toHaveAttribute('type', 'password');
    await expect(t).toHaveAttribute('aria-pressed', 'false');
    await expect(t.innerHTML).toBe(icon);
    await expect(status(canvasElement)).toHaveTextContent('Password hidden');
  },
};

/** Shown from the start says nothing: only a change is announced. */
export const StartingShownAnnouncesNothing: Story = {
  render: () => <Field defaultRevealed />,
  play: async ({ canvas, canvasElement }) => {
    await expect(field(canvas)).toHaveAttribute('type', 'text');
    await expect(toggle(canvas)).toHaveAttribute('aria-pressed', 'true');
    await expect(status(canvasElement)).toHaveTextContent(/^$/);
  },
};

/**
 * A mouse user goes on typing: clicking the toggle leaves focus in the field
 * and keeps what was typed. A keyboard user stays on the toggle.
 */
export const TheToggleKeepsFocusWhereItIs: Story = {
  play: async ({ canvas }) => {
    const input = field(canvas);
    await browserUser.click(input);
    await browserUser.keyboard('hunter2');
    await browserUser.click(toggle(canvas));
    await expect(input).toHaveAttribute('type', 'text');
    await expect(input).toHaveFocus();
    await browserUser.keyboard('!');
    await expect(input).toHaveValue('hunter2!');

    await browserUser.keyboard('{Tab}');
    await expect(toggle(canvas)).toHaveFocus();
    await browserUser.keyboard(' ');
    await expect(input).toHaveAttribute('type', 'password');
    await expect(toggle(canvas)).toHaveFocus();
    await expect(input).toHaveValue('hunter2!');
  },
};

/**
 * Submitting the form hides the password before the form's own handler runs,
 * so a password manager sees a password field.
 */
export const SubmittingHidesIt: Story = {
  render: () => {
    function Form() {
      const [seen, setSeen] = useState('');
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.querySelector('input')!;
            setSeen(input.type);
          }}
        >
          <Field />
          <output data-testid="seen">{seen}</output>
        </form>
      );
    }
    return <Form />;
  },
  play: async ({ canvas }) => {
    await userEvent.click(toggle(canvas));
    await expect(field(canvas)).toHaveAttribute('type', 'text');
    await userEvent.type(field(canvas), 'hunter2{Enter}');
    await expect(canvas.getByTestId('seen')).toHaveTextContent('password');
    await expect(field(canvas)).toHaveAttribute('type', 'password');
  },
};

/** Controlled, it shows what `isRevealed` says and reports presses. */
export const Controlled: Story = {
  render: () => {
    function Controlled() {
      const [shown, setShown] = useState(false);
      return (
        <>
          <Field isRevealed={shown} onRevealedChange={setShown} />
          <output data-testid="shown">{String(shown)}</output>
        </>
      );
    }
    return <Controlled />;
  },
  play: async ({ canvas }) => {
    await userEvent.click(toggle(canvas));
    await expect(canvas.getByTestId('shown')).toHaveTextContent('true');
    await expect(field(canvas)).toHaveAttribute('type', 'text');
  },
};

/** Controlled and not updated, it stays as it was: the prop is the truth. */
export const ControlledIgnoresItsOwnPress: Story = {
  render: () => {
    const onRevealedChange = fn();
    return <Field isRevealed={false} onRevealedChange={onRevealedChange} />;
  },
  play: async ({ canvas }) => {
    await userEvent.click(toggle(canvas));
    await expect(field(canvas)).toHaveAttribute('type', 'password');
  },
};

export const NewPasswordIsNamedForManagers: Story = {
  ...NewPassword,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('New password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
  },
};

/** Disabled, the toggle is too; read-only, it still shows the password. */
export const DisabledAndReadOnly: Story = {
  render: () => (
    <>
      <Field label="Disabled" isDisabled />
      <Field label="Read-only" isReadOnly defaultValue="hunter2" />
    </>
  ),
  play: async ({ canvas }) => {
    const [off, readOnly] = canvas.getAllByRole('button', {
      name: 'Show password',
    });
    await expect(off).toBeDisabled();
    await userEvent.click(readOnly);
    await expect(canvas.getByLabelText('Read-only')).toHaveAttribute(
      'type',
      'text',
    );
  },
};

/** The error is the field's description, as Input's is. */
export const TheErrorDescribesTheField: Story = {
  ...Invalid,
  play: async ({ canvas }) => {
    await expect(field(canvas)).toHaveAttribute('aria-invalid', 'true');
    await expect(field(canvas)).toHaveAccessibleDescription(
      'That password is incorrect.',
    );
  },
};

/** The toggle is the field's height less 8px: 24px in a Small field. */
export const TheToggleFitsTheSize: Story = {
  ...Small,
  play: async ({ canvas }) => {
    const t = toggle(canvas);
    const r = t.getBoundingClientRect();
    await expect([r.width, r.height]).toEqual([24, 24]);
    // 4px from the box's end, inside its 1px border — the field's own
    // padding is not added on top.
    const box = t.closest('.ion-input')!.getBoundingClientRect();
    await expect(box.right - r.right).toBe(5);
  },
};

export const LabelsAreTranslatable: Story = {
  render: () => (
    <Field
      label="Passwort"
      revealLabel="Passwort anzeigen"
      shownMessage="Passwort sichtbar"
      hiddenMessage="Passwort verborgen"
    />
  ),
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Passwort anzeigen' }),
    );
    await expect(status(canvasElement)).toHaveTextContent('Passwort sichtbar');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Passwort anzeigen' }),
    );
    await expect(status(canvasElement)).toHaveTextContent('Passwort verborgen');
  },
};
