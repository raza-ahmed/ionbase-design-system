import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { ToolCall } from 'ionbase-ui';

const meta: Meta<typeof ToolCall> = {
  title: 'Components/ToolCall',
  component: ToolCall,
  tags: ['autodocs'],
  args: {
    title: 'Searched the invoice archive',
    name: 'search_invoices',
    status: 'done',
    durationMs: 1240,
    input: { query: 'Northwind', from: '2026-07-01', limit: 50 },
    output: {
      count: 2,
      results: [
        { id: 'INV-000412', total: 1840.5, status: 'overdue' },
        { id: 'INV-000398', total: 920, status: 'paid' },
      ],
    },
  },
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
          'The evidence behind one step of an agent run: which tool, with what input, and what came back.\n\n**The title is plain language and required.** `AgentActivityStep` is the account; `ToolCall` is the evidence for it. The function name goes in `name`.\n\n**Collapsed by default, except the failure.** `errorMessage` renders outside the disclosure — evidence that takes a click to reach is evidence nobody reads.\n\n**A call with nothing to show is not a button.** With no input and no output the header is plain text, because a disclosure that discloses nothing is a dead control.\n\n**Payloads are focusable scroll regions**, so a capped payload can be scrolled from the keyboard. Redact secrets before passing them — it renders exactly what it is given.',
      },
    },
  },
};
export default meta;
type Story = StoryObj<typeof ToolCall>;

export const Default: Story = {};

export const Expanded: Story = { args: { defaultExpanded: true } };

export const Running: Story = {
  args: { status: 'active', output: undefined, durationMs: undefined },
};

export const Failed: Story = {
  args: {
    title: 'Sent the reminder email',
    name: 'send_email',
    status: 'failed',
    input: { to: 'accounts@northwind.example', template: 'overdue' },
    output: undefined,
    errorMessage: 'The mail server refused the connection after 3 attempts.',
    durationMs: 30120,
  },
};

export const Skipped: Story = {
  args: {
    title: 'Deleted 14 draft invoices',
    name: 'delete_invoices',
    status: 'skipped',
    output: undefined,
    durationMs: undefined,
  },
};

/** A long string payload wraps rather than scrolling sideways. */
export const LongPayload: Story = {
  args: {
    defaultExpanded: true,
    output: Array.from({ length: 40 }, (_, i) => ({
      id: `INV-${String(i).padStart(6, '0')}`,
      note: 'A long free-text note that would force a horizontal scrollbar on a phone if the payload did not wrap.',
    })),
  },
};

/** Several calls, as they appear under a run. */
export const InARun: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '8px' }}>
      <ToolCall
        title="Looked up the customer"
        name="get_customer"
        status="done"
        durationMs={180}
        input={{ name: 'Northwind' }}
        output={{ id: 'C-221', tier: 'enterprise' }}
      />
      <ToolCall
        title="Searched the invoice archive"
        name="search_invoices"
        status="done"
        durationMs={1240}
        input={{ customer: 'C-221' }}
        output={{ count: 2 }}
      />
      <ToolCall
        title="Drafting the reminder"
        name="compose_email"
        status="active"
        input={{ invoices: ['INV-000412'] }}
      />
      <ToolCall title="Send the reminder" name="send_email" />
    </div>
  ),
};

/* ------------------------------------------------------------------ tests */

/** The header is a disclosure; its name carries title, tool name and status. */
export const HeaderIsADisclosure: Story = {
  play: async ({ canvas }) => {
    const header = canvas.getByRole('button', {
      name: /Searched the invoice archive.*search_invoices.*Done/,
    });
    await expect(header).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByLabelText(/Input to/)).toBeNull();
    await userEvent.click(header);
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    const controls = header.getAttribute('aria-controls');
    await expect(controls).toBeTruthy();
    await expect(document.getElementById(controls!)).not.toBeNull();
  },
};

/** Objects render as formatted JSON, in focusable, named scroll regions. */
export const PayloadsAreFocusableJSON: Story = {
  args: { defaultExpanded: true },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Input to search_invoices');
    await expect(input).toHaveAttribute('tabindex', '0');
    await expect(input.textContent).toContain('"query": "Northwind"');
    await userEvent.tab();
    await userEvent.tab();
    await expect(input).toHaveFocus();
  },
};

/** The failure is readable with the details closed. */
export const FailureIsVisibleCollapsed: Story = {
  args: Failed.args,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(
      canvas.getByText(/mail server refused the connection/),
    ).toBeVisible();
    await expect(canvas.getByRole('button')).toHaveAccessibleName(/Failed/);
  },
};

/** Nothing to disclose, so nothing pretends to be a button. */
export const NoPayloadIsNotAButton: Story = {
  args: { input: undefined, output: undefined, status: 'pending' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.getByText(/Not started/)).toBeInTheDocument();
  },
};

const changed = fn();

/** Controlled: the component asks, the caller decides. */
export const ControlledExpansion: Story = {
  args: { isExpanded: false, onExpandedChange: changed },
  play: async ({ canvas }) => {
    changed.mockClear();
    const header = canvas.getByRole('button');
    await userEvent.click(header);
    await expect(changed).toHaveBeenCalledWith(true);
    await expect(header).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Circular data must not take the thread down. */
export const UnserialisablePayloadStillRenders: Story = {
  render: (args) => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    return <ToolCall {...args} output={circular} defaultExpanded />;
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByLabelText('Output from search_invoices'),
    ).toBeInTheDocument();
  },
};
