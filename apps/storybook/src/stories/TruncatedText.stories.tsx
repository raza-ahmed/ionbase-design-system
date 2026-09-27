import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
// Real browser input: the tooltip opens on keyboard focus only, which needs
// a real Tab to set the keyboard modality.
import { userEvent } from 'vitest/browser';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TruncatedText,
} from 'ionbase-ui';

const PURPOSE =
  'Highlights non-standard terms in vendor contracts and flags every clause that needs legal review before signature';
const SHORT = 'Checks expense claims';
const NOTES =
  'Runs every weekday at 07:00 against the shared finance inbox. It reads each new supplier invoice, matches it to an open purchase order by number and amount, and posts the match to the ledger. Anything over the auto-approve limit, or with a mismatch of more than one percent, waits for a person in the approval queue. It never pays an invoice; it only reconciles one.';

const meta: Meta<typeof TruncatedText> = {
  title: 'Components/TruncatedText',
  component: TruncatedText,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Long text cut to its space, with the whole of it still reachable. A cut line is a tab stop that shows the whole text in a tooltip on hover and on focus; a cut paragraph has a Show more button. While the text fits, it is plain text. It is cut by CSS, so a screen reader reads all of it.',
      },
    },
  },
  args: { children: PURPOSE },
  render: (args) => (
    <div style={{ width: 240 }}>
      <TruncatedText {...args} />
    </div>
  ),
};

export default meta;
type Story = StoryObj<typeof TruncatedText>;

export const OneLine: Story = {};
export const Paragraph: Story = {
  args: { children: NOTES, lines: 3, overflow: 'expand' },
  render: (args) => (
    <div style={{ width: 360 }}>
      <TruncatedText {...args} />
    </div>
  ),
};

// ------------------------------------------------------------------ tests

const text = (el: HTMLElement) =>
  el.querySelector<HTMLElement>('.ion-truncated__text')!;
const tooltip = () => document.querySelector<HTMLElement>('.ion-tooltip');

/**
 * Cut, the line is a tab stop, and focus shows the whole text — not only
 * hover. Escape closes it and focus stays.
 */
export const FocusShowsTheWholeText: Story = {
  play: async ({ canvasElement }) => {
    const line = text(canvasElement);
    await waitFor(() => expect(line).toHaveAttribute('tabindex', '0'));
    await userEvent.keyboard('{Tab}');
    await expect(line).toHaveFocus();
    await waitFor(() => expect(tooltip()).toHaveTextContent(PURPOSE));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(tooltip()).toBeNull());
    await expect(line).toHaveFocus();
  },
};

/** Hover shows it too. */
export const HoverShowsTheWholeText: Story = {
  play: async ({ canvasElement }) => {
    const line = text(canvasElement);
    await waitFor(() => expect(line).toHaveAttribute('tabindex', '0'));
    // A mouse moves across the page before it reaches the text; that move is
    // what tells React Aria the pointer is in use, after an earlier Tab.
    await userEvent.hover(canvasElement);
    await userEvent.hover(line);
    await waitFor(() => expect(tooltip()).toHaveTextContent(PURPOSE), {
      timeout: 2000,
    });
    await userEvent.unhover(line);
  },
};

/**
 * The whole text is in the DOM, cut by CSS, so a screen reader reads it
 * once — the tooltip is neither its description nor in the reading order.
 */
export const TheTextIsReadOnce: Story = {
  play: async ({ canvasElement }) => {
    const line = text(canvasElement);
    await expect(line.textContent).toBe(PURPOSE);
    await expect(getComputedStyle(line).textOverflow).toBe('ellipsis');
    await expect(line.scrollWidth).toBeGreaterThan(line.clientWidth);
    await waitFor(() => expect(line).toHaveAttribute('tabindex', '0'));
    await userEvent.keyboard('{Tab}');
    await waitFor(() => expect(tooltip()).not.toBeNull());
    await expect(line).not.toHaveAttribute('aria-describedby');
    await expect(tooltip()).toHaveAttribute('aria-hidden', 'true');
  },
};

/** Text that fits is plain text: no tab stop, no tooltip. */
export const TextThatFitsIsPlain: Story = {
  args: { children: SHORT },
  play: async ({ canvasElement }) => {
    const line = text(canvasElement);
    // Give the measure a frame to run before asserting it found nothing.
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));
    await expect(line).not.toHaveAttribute('tabindex');
    await userEvent.hover(canvasElement);
    await userEvent.hover(line);
    await new Promise((r) => setTimeout(r, 700));
    await expect(tooltip()).toBeNull();
  },
};

// Wide enough for the purpose in any font: CI's fallback is wider than ours.
const WIDE = 2000;

/** It measures again when its box changes: narrowed, it becomes a tab stop; widened, plain again. */
export const ItRemeasuresOnResize: Story = {
  render: (args) => {
    function Resizable() {
      const [width, setWidth] = useState(WIDE);
      return (
        <>
          <button type="button" onClick={() => setWidth(160)}>
            Narrow
          </button>
          <button type="button" onClick={() => setWidth(WIDE)}>
            Widen
          </button>
          <div style={{ width }}>
            <TruncatedText {...args} />
          </div>
        </>
      );
    }
    return <Resizable />;
  },
  play: async ({ canvas, canvasElement }) => {
    const line = text(canvasElement);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));
    await expect(line).not.toHaveAttribute('tabindex');
    await userEvent.click(canvas.getByRole('button', { name: 'Narrow' }));
    await waitFor(() => expect(line).toHaveAttribute('tabindex', '0'));
    await userEvent.click(canvas.getByRole('button', { name: 'Widen' }));
    await waitFor(() => expect(line).not.toHaveAttribute('tabindex'));
  },
};

/** A cut line shows focus: a ring drawn inside the box, where no scroll container can clip it. */
export const ACutLineShowsFocus: Story = {
  play: async ({ canvasElement }) => {
    const line = text(canvasElement);
    await waitFor(() => expect(line).toHaveAttribute('tabindex', '0'));
    await userEvent.keyboard('{Tab}');
    const style = getComputedStyle(line);
    await expect(style.outlineStyle).toBe('solid');
    await expect(parseFloat(style.outlineOffset)).toBeLessThan(0);
  },
};

/** It takes the font of what it is in. */
export const ItInheritsTheFont: Story = {
  render: (args) => (
    <div style={{ width: 240, fontSize: 12, fontWeight: 600 }}>
      <TruncatedText {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const style = getComputedStyle(text(canvasElement));
    await expect(style.fontSize).toBe('12px');
    await expect(style.fontWeight).toBe('600');
  },
};

/**
 * A paragraph is clamped to `lines`, and Show more — a real button that
 * controls it — opens it in place. Show less closes it again.
 */
export const ShowMoreOpensAParagraph: Story = {
  ...Paragraph,
  play: async ({ canvas, canvasElement }) => {
    const para = text(canvasElement);
    const more = await canvas.findByRole('button', { name: 'Show more' });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more).toHaveAttribute('aria-controls', para.id);
    const lineHeight = parseFloat(getComputedStyle(para).lineHeight);
    const clamped = para.getBoundingClientRect().height;
    await expect(Math.round(clamped / lineHeight)).toBe(3);
    // A paragraph is not a tab stop: the button is the way in.
    await expect(para).not.toHaveAttribute('tabindex');

    await userEvent.click(more);
    const less = canvas.getByRole('button', { name: 'Show less' });
    await expect(less).toHaveAttribute('aria-expanded', 'true');
    await expect(para.getBoundingClientRect().height).toBeGreaterThan(
      clamped + lineHeight,
    );
    await expect(para.scrollHeight).toBeLessThanOrEqual(para.clientHeight + 1);

    // Its own width, not stretched across the paragraph.
    await expect(less.getBoundingClientRect().width).toBeLessThan(
      para.getBoundingClientRect().width / 2,
    );
    await userEvent.click(less);
    await expect(
      canvas.getByRole('button', { name: 'Show more' }),
    ).toHaveFocus();
    await expect(para.getBoundingClientRect().height).toBe(clamped);
  },
};

/** A paragraph that fits has no button. */
export const AParagraphThatFitsHasNoButton: Story = {
  ...Paragraph,
  args: { children: SHORT, lines: 3, overflow: 'expand' },
  play: async ({ canvas }) => {
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 50)));
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/** The labels can be translated. */
export const TheLabelsCanBeChanged: Story = {
  ...Paragraph,
  args: {
    children: NOTES,
    lines: 2,
    overflow: 'expand',
    showMoreLabel: 'Mehr anzeigen',
    showLessLabel: 'Weniger anzeigen',
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Mehr anzeigen' }),
    );
    await expect(
      canvas.getByRole('button', { name: 'Weniger anzeigen' }),
    ).toBeVisible();
  },
};

/** In a flex row it shrinks to its share rather than pushing the row wider. */
export const InAFlexRow: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, width: 240 }} data-testid="row">
      <span>Purpose:</span>
      <TruncatedText {...args} />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const row = canvas.getByTestId('row').getBoundingClientRect();
    const root = canvasElement
      .querySelector('.ion-truncated')!
      .getBoundingClientRect();
    await expect(root.right).toBeLessThanOrEqual(row.right);
    await waitFor(() =>
      expect(text(canvasElement)).toHaveAttribute('tabindex', '0'),
    );
  },
};

/**
 * In Table a line is cut to its column's share: the table does not grow
 * past its container.
 */
export const InTable: Story = {
  render: () => (
    <div style={{ width: 480 }}>
      <Table aria-label="Agents">
        <TableHead>
          <TableRow>
            <TableCell header>Agent</TableCell>
            <TableCell header>Team</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              <TruncatedText>{PURPOSE}</TruncatedText>
            </TableCell>
            <TableCell>Legal</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const table = canvasElement.querySelector('table')!;
    const scroller = table.parentElement!;
    await expect(scroller.scrollWidth).toBeLessThanOrEqual(
      scroller.clientWidth,
    );
    await waitFor(() =>
      expect(text(canvasElement)).toHaveAttribute('tabindex', '0'),
    );
  },
};

/**
 * In a table of your own that grows to fit, a max width on the cell cuts
 * it; a long word is cut too, rather than widening the column.
 */
export const InATableCell: Story = {
  render: () => (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <td style={{ maxWidth: 200, padding: 0 }} data-testid="cell">
            <TruncatedText>
              {'agt_reconciler_' + 'x'.repeat(80) + '_final'}
            </TruncatedText>
          </td>
        </tr>
      </tbody>
    </table>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByTestId('cell').getBoundingClientRect().width,
    ).toBeLessThanOrEqual(200);
    await waitFor(() =>
      expect(text(canvasElement)).toHaveAttribute('tabindex', '0'),
    );
  },
};
