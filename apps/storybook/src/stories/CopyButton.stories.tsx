import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { CopyButton, type CopyButtonProps } from 'ionbase-ui';

/** A copy button that writes what happened, so a test can read it. */
function Harness(props: Partial<CopyButtonProps>) {
  const [did, setDid] = useState('');
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <code>run_4821</code>
      <CopyButton
        value="run_4821"
        onCopy={(t) => setDid(`copied ${t}`)}
        onCopyError={(_, t) => setDid(`failed ${t}`)}
        {...props}
      />
      <output data-testid="did">{did}</output>
    </div>
  );
}

const meta: Meta<typeof CopyButton> = {
  title: 'Components/CopyButton',
  component: CopyButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Copies a value, confirms in place and announces it. The icon becomes a check and the label "Copied" for two seconds; a polite live region says so once per press. When the clipboard refuses, it says "Couldn\'t copy" and `onCopyError` gets the text to show by hand.',
      },
    },
  },
  render: () => <Harness />,
};

export default meta;
type Story = StoryObj<typeof CopyButton>;

export const Default: Story = {};
export const IconOnly: Story = {
  render: () => <Harness isIconOnly label="Copy run ID" />,
};
export const Secondary: Story = {
  render: () => <Harness variant="secondary" label="Copy link" />,
};
export const Small: Story = {
  render: () => <Harness size="sm" isIconOnly label="Copy run ID" />,
};

// ------------------------------------------------------------------ tests

type Clipboard = { writeText?: (t: string) => Promise<void> } | undefined;

/**
 * Runs `play` with `navigator.clipboard` and `document.execCommand` replaced,
 * and puts both back. The real clipboard needs a permission the test runner
 * does not grant, and a test that passes only when it is granted is testing
 * the runner.
 */
async function withClipboard(
  clipboard: Clipboard,
  execCommand: (cmd: string) => boolean,
  play: () => Promise<void>,
) {
  const original = document.execCommand;
  Object.defineProperty(window.navigator, 'clipboard', {
    value: clipboard,
    configurable: true,
  });
  document.execCommand = execCommand as typeof document.execCommand;
  try {
    await play();
  } finally {
    delete (window.navigator as { clipboard?: unknown }).clipboard;
    document.execCommand = original;
  }
}

const refuse = () => Promise.reject(new Error('denied'));
const noExec = () => false;
const btn = (c: ReturnType<typeof within>, name: string | RegExp) =>
  c.getByRole('button', { name });
const status = (c: HTMLElement) =>
  c.querySelector('.ion-copy-button__status') as HTMLElement;

/** Pressing it writes the value, and `onCopy` gets it. */
export const CopiesTheValue: Story = {
  play: async ({ canvas }) => {
    const writeText = fn(() => Promise.resolve());
    await withClipboard({ writeText }, noExec, async () => {
      await userEvent.click(btn(canvas, 'Copy'));
      await expect(writeText).toHaveBeenCalledWith('run_4821');
      await expect(canvas.getByTestId('did')).toHaveTextContent(
        'copied run_4821',
      );
    });
  },
};

/** A function value is read at the press, not at render. */
export const ReadsAFunctionAtThePress: Story = {
  render: () => {
    let n = 0;
    return <Harness value={() => `draft ${++n}`} />;
  },
  play: async ({ canvas }) => {
    const writeText = fn(() => Promise.resolve());
    await withClipboard({ writeText }, noExec, async () => {
      await userEvent.click(btn(canvas, 'Copy'));
      await expect(writeText).toHaveBeenLastCalledWith('draft 1');
      await userEvent.click(btn(canvas, 'Copied'));
      await expect(writeText).toHaveBeenLastCalledWith('draft 2');
    });
  },
};

/**
 * It confirms where it is: the label becomes "Copied" and the icon a check,
 * without the button changing width, then both return.
 */
export const ConfirmsInPlaceThenReturns: Story = {
  render: () => <Harness resetAfter={300} />,
  play: async ({ canvas }) => {
    await withClipboard(
      { writeText: () => Promise.resolve() },
      noExec,
      async () => {
        const b = btn(canvas, 'Copy');
        const width = b.getBoundingClientRect().width;
        const icon = b.querySelector('svg')!.innerHTML;
        await userEvent.click(b);
        await expect(b).toHaveAccessibleName('Copied');
        await expect(b).toHaveAttribute('data-state', 'copied');
        await expect(b.querySelector('svg')!.innerHTML).not.toBe(icon);
        await expect(b.getBoundingClientRect().width).toBe(width);
        // One line tall: the labels share a cell rather than stacking.
        await expect(b.getBoundingClientRect().height).toBe(40);
        await waitFor(() => expect(b).toHaveAccessibleName('Copy'), {
          timeout: 1500,
        });
        await expect(b.querySelector('svg')!.innerHTML).toBe(icon);
      },
    );
  },
};

/**
 * A second press during the confirmation starts its two seconds again, so the
 * button does not return to "Copy" just after the user copied again.
 */
export const APressRestartsTheConfirmation: Story = {
  render: () => <Harness resetAfter={400} />,
  play: async ({ canvas }) => {
    await withClipboard(
      { writeText: () => Promise.resolve() },
      noExec,
      async () => {
        const b = btn(canvas, 'Copy');
        await userEvent.click(b);
        await new Promise((r) => setTimeout(r, 250));
        await userEvent.click(b);
        await new Promise((r) => setTimeout(r, 250));
        await expect(b).toHaveAccessibleName('Copied');
        await waitFor(() => expect(b).toHaveAccessibleName('Copy'));
      },
    );
  },
};

/**
 * A polite status region says "Copied" on each press — a second press puts a
 * new text node there, which is what makes it announced again.
 */
export const AnnouncesEachCopy: Story = {
  play: async ({ canvas, canvasElement }) => {
    await withClipboard(
      { writeText: () => Promise.resolve() },
      noExec,
      async () => {
        const region = status(canvasElement);
        await expect(region).toHaveAttribute('role', 'status');
        await expect(region).toHaveAttribute('aria-live', 'polite');
        await expect(region).toHaveTextContent(/^$/);
        await userEvent.click(btn(canvas, 'Copy'));
        await expect(region).toHaveTextContent('Copied');
        const first = region.firstElementChild;
        await userEvent.click(btn(canvas, 'Copied'));
        await waitFor(() => expect(region.firstElementChild).not.toBe(first));
        await expect(region).toHaveTextContent('Copied');
      },
    );
  },
};

/**
 * With no Clipboard API — a page on plain http — it copies by selecting the
 * text in a hidden textarea, and focus comes back to the button.
 */
export const FallsBackWithoutTheClipboardAPI: Story = {
  play: async ({ canvas }) => {
    let selected = '';
    const exec = (cmd: string) => {
      selected = (document.activeElement as HTMLTextAreaElement).value;
      return cmd === 'copy';
    };
    await withClipboard(undefined, exec, async () => {
      const b = btn(canvas, 'Copy');
      await userEvent.click(b);
      await expect(selected).toBe('run_4821');
      await expect(b).toHaveAccessibleName('Copied');
      await expect(b).toHaveFocus();
      await expect(document.querySelector('textarea')).toBeNull();
    });
  },
};

/** A refused Clipboard API is tried again by selection before failing. */
export const FallsBackWhenRefused: Story = {
  play: async ({ canvas }) => {
    await withClipboard(
      { writeText: refuse },
      () => true,
      async () => {
        await userEvent.click(btn(canvas, 'Copy'));
        await expect(btn(canvas, 'Copied')).toBeInTheDocument();
      },
    );
  },
};

/**
 * When both ways fail it says so — label, icon and announcement — and hands
 * the text to `onCopyError`. It never claims a copy.
 */
export const SaysWhenItFailed: Story = {
  play: async ({ canvas, canvasElement }) => {
    await withClipboard({ writeText: refuse }, noExec, async () => {
      const b = btn(canvas, 'Copy');
      await userEvent.click(b);
      await expect(b).toHaveAccessibleName("Couldn't copy");
      await expect(b).toHaveAttribute('data-state', 'failed');
      await expect(status(canvasElement)).toHaveTextContent("Couldn't copy");
      await expect(canvas.getByTestId('did')).toHaveTextContent(
        'failed run_4821',
      );
    });
  },
};

/**
 * Icon-only: square, named by `label` — which says what is copied — with the
 * same name as a tooltip on focus. After a copy the name is "Copied".
 */
export const IconOnlyIsNamedAndSquare: Story = {
  render: () => <Harness isIconOnly label="Copy run ID" />,
  play: async ({ canvas }) => {
    await withClipboard(
      { writeText: () => Promise.resolve() },
      noExec,
      async () => {
        const b = btn(canvas, 'Copy run ID');
        const r = b.getBoundingClientRect();
        await expect(r.width).toBe(r.height);
        await expect(b.textContent).toBe('');
        await userEvent.tab();
        await expect(b).toHaveFocus();
        const tip = await within(document.body).findByRole('tooltip');
        await expect(tip).toHaveTextContent('Copy run ID');
        await userEvent.keyboard('{Enter}');
        await expect(b).toHaveAccessibleName('Copied');
      },
    );
  },
};

/** Every word is a prop, so it can be translated. */
export const LabelsAreTranslatable: Story = {
  render: () => (
    <Harness label="Kopieren" copiedLabel="Kopiert" failedLabel="Fehler" />
  ),
  play: async ({ canvas }) => {
    await withClipboard(
      { writeText: () => Promise.resolve() },
      noExec,
      async () => {
        await userEvent.click(btn(canvas, 'Kopieren'));
        await expect(btn(canvas, 'Kopiert')).toBeInTheDocument();
      },
    );
  },
};

/** Disabled, it copies nothing. */
export const DisabledCopiesNothing: Story = {
  render: () => <Harness isDisabled />,
  play: async ({ canvas }) => {
    const writeText = fn(() => Promise.resolve());
    await withClipboard({ writeText }, noExec, async () => {
      const b = btn(canvas, 'Copy');
      await expect(b).toBeDisabled();
      await userEvent.click(b, { pointerEventsCheck: 0 });
      await expect(writeText).not.toHaveBeenCalled();
    });
  },
};
