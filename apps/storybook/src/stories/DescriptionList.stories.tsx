import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
  Badge,
  DescriptionList,
  DescriptionListItem,
  type DescriptionListLayout,
} from 'ionbase-ui';

const Run = ({
  layout,
  width = 480,
  emptyText,
}: {
  layout?: DescriptionListLayout;
  width?: number;
  emptyText?: string;
}) => (
  <div style={{ width }}>
    <DescriptionList layout={layout} emptyText={emptyText}>
      <DescriptionListItem term="Agent">Invoice reconciler</DescriptionListItem>
      <DescriptionListItem term="Outcome">
        <Badge size="sm" dot intent="success">
          Completed
        </Badge>
      </DescriptionListItem>
      <DescriptionListItem term="Retries">{0}</DescriptionListItem>
      <DescriptionListItem term="Decided by">{null}</DescriptionListItem>
      <DescriptionListItem term="Run ID">
        {/* No hyphens or spaces: nothing the browser would break at unasked. */}
        run_4821_20260925T091403Z_reconcile_march_invoices_batch_7
      </DescriptionListItem>
    </DescriptionList>
  </div>
);

const meta: Meta<typeof DescriptionList> = {
  title: 'Components/DescriptionList',
  component: DescriptionList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Label–value pairs — a record\'s details, a settings summary, a review step — as a real `<dl>`, so each term is read with its value.\n\n`horizontal` puts the term beside its value and stacks below 24rem of its own width; `stacked` puts it above; `row` sets stacked pairs side by side at their own width, wrapping. An empty value is shown as "—" and read as `emptyText`.',
      },
    },
  },
  render: () => <Run />,
};

export default meta;
type Story = StoryObj<typeof DescriptionList>;

export const Horizontal: Story = {};
export const Stacked: Story = { render: () => <Run layout="stacked" /> };
export const Row: Story = {
  render: () => <Run layout="row" width={720} />,
};

// ------------------------------------------------------------------ tests

const pair = (c: ReturnType<typeof within>, term: string) => {
  const dt = c.getByText(term, { selector: 'dt' });
  return { dt, dd: dt.nextElementSibling as HTMLElement };
};
const box = (el: Element) => el.getBoundingClientRect();

/** A real <dl>: terms and definitions, each pair grouped in a <div>. */
export const IsADefinitionList: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('dl')).not.toBeNull();
    await expect(canvas.getAllByRole('term')).toHaveLength(5);
    await expect(canvas.getAllByRole('definition')).toHaveLength(5);
    const { dt, dd } = pair(canvas, 'Agent');
    await expect(dd.tagName).toBe('DD');
    await expect(dd).toHaveTextContent('Invoice reconciler');
    await expect(dt.parentElement!.tagName).toBe('DIV');
    await expect(dt.parentElement!.parentElement!.tagName).toBe('DL');
  },
};

/** "—" to the eye, "Not set" to a reader. */
export const EmptyIsReadAsNotSet: Story = {
  play: async ({ canvas }) => {
    const { dd } = pair(canvas, 'Decided by');
    const dash = within(dd).getByText('—');
    await expect(dash).toHaveAttribute('aria-hidden', 'true');
    await expect(within(dd).getByText('Not set')).toHaveClass(
      'ion-visually-hidden',
    );
  },
};

/** Zero is a value, not an empty one. */
export const ZeroIsNotEmpty: Story = {
  play: async ({ canvas }) => {
    const { dd } = pair(canvas, 'Retries');
    await expect(dd).toHaveTextContent(/^0$/);
    await expect(dd).not.toHaveClass('ion-description-list__value--empty');
  },
};

export const EmptyTextIsTranslatable: Story = {
  render: () => <Run emptyText="Nicht festgelegt" />,
  play: async ({ canvas }) => {
    await expect(pair(canvas, 'Decided by').dd).toHaveTextContent(
      'Nicht festgelegt',
    );
  },
};

/** Horizontal: term beside its value, on one line. */
export const HorizontalPutsTheTermBeside: Story = {
  play: async ({ canvas }) => {
    const { dt, dd } = pair(canvas, 'Agent');
    await expect(box(dd).left).toBeGreaterThan(box(dt).right);
    await expect(Math.round(box(dd).top)).toBe(Math.round(box(dt).top));
  },
};

/** Narrower than 24rem — its own width, not the viewport — it stacks. */
export const HorizontalStacksWhenNarrow: Story = {
  render: () => <Run width={320} />,
  play: async ({ canvas }) => {
    const { dt, dd } = pair(canvas, 'Agent');
    await expect(box(dd).top).toBeGreaterThanOrEqual(box(dt).bottom);
    await expect(Math.round(box(dd).left)).toBe(Math.round(box(dt).left));
  },
};

export const StackedPutsTheTermAbove: Story = {
  render: () => <Run layout="stacked" />,
  play: async ({ canvas }) => {
    const { dt, dd } = pair(canvas, 'Agent');
    await expect(box(dd).top).toBeGreaterThanOrEqual(box(dt).bottom);
  },
};

/** Row: pairs side by side at their own width, even in a narrow column. */
export const RowSetsPairsSideBySide: Story = {
  render: () => <Run layout="row" width={300} />,
  play: async ({ canvas }) => {
    const agent = pair(canvas, 'Agent').dt;
    const outcome = pair(canvas, 'Outcome').dt;
    await expect(Math.round(box(outcome).top)).toBe(Math.round(box(agent).top));
    await expect(box(outcome).left).toBeGreaterThan(box(agent).right);
  },
};

/** A long ID wraps inside its column instead of running out of it. */
export const LongValuesWrap: Story = {
  render: () => <Run width={360} />,
  play: async ({ canvas, canvasElement }) => {
    const { dd } = pair(canvas, 'Run ID');
    await expect(dd.scrollWidth).toBeLessThanOrEqual(dd.clientWidth);
    const list = canvasElement.querySelector('dl')!;
    await expect(box(dd).right).toBeLessThanOrEqual(box(list).right + 0.5);
  },
};

/**
 * In a shrink-to-fit parent — a flex column that does not stretch, as a
 * card's side column is — every layout keeps its width. A size container
 * would collapse to 0px here; only horizontal is one, at the parent's width.
 */
export const KeepsItsWidthInAShrinkToFitParent: Story = {
  render: () => (
    <div
      style={{
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 24,
      }}
    >
      {(['horizontal', 'stacked', 'row'] as const).map((layout) => (
        <DescriptionList key={layout} layout={layout} data-layout={layout}>
          <DescriptionListItem term="Owner">Ada Reyes</DescriptionListItem>
          <DescriptionListItem term="Team">Finance</DescriptionListItem>
        </DescriptionList>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const list = (l: string) =>
      canvasElement.querySelector(`[data-layout="${l}"]`)!;
    await expect(Math.round(box(list('horizontal')).width)).toBe(480);
    for (const l of ['stacked', 'row']) {
      await expect(box(list(l)).width).toBeGreaterThan(40);
    }
    const [owner, team] = [...list('row').querySelectorAll('dt')];
    await expect(Math.round(box(team).top)).toBe(Math.round(box(owner).top));
  },
};
