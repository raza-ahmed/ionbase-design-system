import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { CodeSnippet } from 'ionbase-ui';

const COMMAND =
  'iops runs start --agent invoice-reconciler --input ./march-invoices.csv --notify finance-ops --wait';

const lines = (n: number) =>
  Array.from({ length: n }, (_, i) => `  "step_${i + 1}": "check",`).join('\n');
const LONG = `{\n${lines(28)}\n}`;
const SHORT = `{\n  "agent": "invoice-reconciler",\n  "input": "march-invoices.csv"\n}`;

const meta: Meta<typeof CodeSnippet> = {
  title: 'Components/CodeSnippet',
  component: CodeSnippet,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Code shown as code. `inline` sits in a sentence; `single` is one line that scrolls sideways — a command; `multi` is a block, cut to `maxLines` with Show more. Code never wraps: `single` and `multi` are named, focusable regions, so a keyboard can scroll them. The copy button is a CopyButton and copies the whole text, expanded or not.',
      },
    },
  },
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <CodeSnippet label="Start command" copyLabel="Copy start command">
        {COMMAND}
      </CodeSnippet>
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof CodeSnippet>;

export const Single: Story = {};
export const Multi: Story = {
  render: () => (
    <div style={{ maxWidth: 480 }}>
      <CodeSnippet type="multi" label="Request body" language="json">
        {LONG}
      </CodeSnippet>
    </div>
  ),
};
export const Inline: Story = {
  render: () => (
    <p className="ion-text-body-md">
      Rotate the key with{' '}
      <CodeSnippet type="inline">iops keys rotate</CodeSnippet>.
    </p>
  ),
};

// ------------------------------------------------------------------ tests

/** As in CopyButton's stories: the runner does not grant the clipboard. */
async function withClipboard(
  writeText: (t: string) => Promise<void>,
  play: () => Promise<void>,
) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  try {
    await play();
  } finally {
    delete (window.navigator as { clipboard?: unknown }).clipboard;
  }
}

const region = (c: ReturnType<typeof within>, name: string) =>
  c.getByRole('region', { name });

/** Inline is a `<code>` in the sentence: no region, no button. */
export const InlineIsJustCode: Story = {
  ...Inline,
  play: async ({ canvas, canvasElement }) => {
    const code = canvasElement.querySelector('code')!;
    await expect(code).toHaveTextContent('iops keys rotate');
    await expect(code.closest('p')).not.toBeNull();
    await expect(canvas.queryByRole('region')).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/** A named, focusable region, and a copy button that copies it exactly. */
export const SingleIsANamedRegionWithCopy: Story = {
  play: async ({ canvas }) => {
    const r = region(canvas, 'Start command');
    await expect(r).toHaveAttribute('tabindex', '0');
    await expect(r).toHaveTextContent(COMMAND);
    const writeText = fn(() => Promise.resolve());
    await withClipboard(writeText, async () => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Copy start command' }),
      );
      await expect(writeText).toHaveBeenCalledWith(COMMAND);
      await expect(
        canvas.getByRole('button', { name: 'Copied' }),
      ).toBeInTheDocument();
    });
  },
};

/**
 * A command does not wrap: it stays one line and scrolls sideways — and the
 * arrow keys scroll it once it has focus.
 */
export const SingleScrollsRatherThanWraps: Story = {
  play: async ({ canvas }) => {
    const r = region(canvas, 'Start command');
    await expect(r.scrollWidth).toBeGreaterThan(r.clientWidth);
    // One 20px line and 6px above and below it.
    await expect(r.getBoundingClientRect().height).toBeLessThanOrEqual(33);
    r.focus();
    await browserUser.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    // Chromium animates a keyboard scroll, so it arrives after the key.
    await waitFor(() => expect(r.scrollLeft).toBeGreaterThan(0));
  },
};

/** With no label it is still named, "Code"; the button is "Copy code". */
export const DefaultsNameItAll: Story = {
  render: () => <CodeSnippet>npm i ionbase-ui</CodeSnippet>,
  play: async ({ canvas }) => {
    await expect(region(canvas, 'Code')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Copy code' }),
    ).toBeInTheDocument();
  },
};

/**
 * Past `maxLines` a block is cut by height — `maxLines` lines tall — with
 * Show more. Every line is still in the page, and Show more controls the
 * region and says whether it is expanded.
 */
export const MultiIsCutByHeight: Story = {
  ...Multi,
  play: async ({ canvas }) => {
    const r = region(canvas, 'Request body');
    await expect(r.tagName).toBe('PRE');
    await expect(r).toHaveTextContent('"step_28"');
    await expect(r.getBoundingClientRect().height).toBe(12 * 20 + 12);
    await expect(r.scrollHeight).toBeGreaterThan(r.clientHeight);
    const more = canvas.getByRole('button', { name: 'Show more' });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more).toHaveAttribute('aria-controls', r.id);

    await userEvent.click(more);
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(more).toHaveAccessibleName('Show less');
    await expect(r.getBoundingClientRect().height).toBe(30 * 20 + 12);

    await userEvent.click(more);
    await expect(more).toHaveAccessibleName('Show more');
    await expect(r.getBoundingClientRect().height).toBe(12 * 20 + 12);
  },
};

/** Cut or not, the copy button copies every line. */
export const MultiCopiesAllOfIt: Story = {
  ...Multi,
  play: async ({ canvas }) => {
    const writeText = fn(() => Promise.resolve());
    await withClipboard(writeText, async () => {
      await userEvent.click(canvas.getByRole('button', { name: 'Copy code' }));
      await expect(writeText).toHaveBeenCalledWith(LONG);
    });
  },
};

/** A block within `maxLines` is shown whole, with no Show more. */
export const ShortMultiIsWhole: Story = {
  render: () => (
    <CodeSnippet type="multi" label="Input">
      {SHORT}
    </CodeSnippet>
  ),
  play: async ({ canvas }) => {
    const r = region(canvas, 'Input');
    await expect(r).not.toHaveAttribute('data-cut');
    await expect(r.getBoundingClientRect().height).toBe(4 * 20 + 12);
    await expect(
      canvas.queryByRole('button', { name: 'Show more' }),
    ).toBeNull();
  },
};

/** A trailing newline is not a line: 3 lines and a newline fit `maxLines={3}`. */
export const TrailingNewlineIsNotALine: Story = {
  render: () => (
    <CodeSnippet type="multi" maxLines={3}>
      {'a\nb\nc\n'}
    </CodeSnippet>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Show more' }),
    ).toBeNull();
  },
};

/** `maxLines` sets where it is cut. */
export const MaxLinesSetsTheCut: Story = {
  render: () => (
    <CodeSnippet type="multi" maxLines={5} label="Body">
      {LONG}
    </CodeSnippet>
  ),
  play: async ({ canvas }) => {
    await expect(region(canvas, 'Body').getBoundingClientRect().height).toBe(
      5 * 20 + 12,
    );
  },
};

/** A block within a larger `maxLines` is whole, even past the default 12. */
export const MaxLinesAboveTheLengthIsWhole: Story = {
  render: () => (
    <CodeSnippet type="multi" maxLines={40} label="Body">
      {LONG}
    </CodeSnippet>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Show more' }),
    ).toBeNull();
    await expect(region(canvas, 'Body').getBoundingClientRect().height).toBe(
      30 * 20 + 12,
    );
  },
};

/**
 * A cut block is cut, not a smaller scroll box: the down arrow does not
 * scroll past the cut. Show more is the way to the rest.
 */
export const ACutBlockDoesNotScrollDown: Story = {
  ...Multi,
  play: async ({ canvas }) => {
    const r = region(canvas, 'Request body');
    r.focus();
    await browserUser.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    await new Promise((done) => setTimeout(done, 300));
    await expect(r.scrollTop).toBe(0);
  },
};

export const CopyCanBeLeftOut: Story = {
  render: () => <CodeSnippet hideCopyButton>{COMMAND}</CodeSnippet>,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/** `language` is the class a highlighter looks for, on the `<code>`. */
export const LanguageIsAClassForHighlighters: Story = {
  ...Multi,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('pre > code')).toHaveClass(
      'language-json',
    );
  },
};

export const LabelsAreTranslatable: Story = {
  render: () => (
    <CodeSnippet
      type="multi"
      label="Anfrage"
      copyLabel="Code kopieren"
      showMoreLabel="Mehr anzeigen"
      showLessLabel="Weniger anzeigen"
    >
      {LONG}
    </CodeSnippet>
  ),
  play: async ({ canvas }) => {
    await expect(region(canvas, 'Anfrage')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Code kopieren' }),
    ).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Mehr anzeigen' }),
    );
    await expect(
      canvas.getByRole('button', { name: 'Weniger anzeigen' }),
    ).toBeInTheDocument();
  },
};
