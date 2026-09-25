import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import {
  Button,
  Divider,
  Pagination,
  Table,
  TableBatchBar,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTableSelection,
  type TableBatchBarLabels,
} from 'ionbase-ui';

const AGENTS = Array.from({ length: 12 }, (_, i) => ({
  id: `agt_${i + 1}`,
  name: `Agent ${i + 1}`,
}));
const PAGE = 5;

const onAction = fn();

function Composed({
  labels,
  canGrow = false,
}: {
  labels?: TableBatchBarLabels;
  canGrow?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [agents, setAgents] = useState(AGENTS);
  const sel = useTableSelection({ total: agents.length });
  const rows = agents.slice((page - 1) * PAGE, page * PAGE);
  return (
    <div style={{ display: 'grid', gap: 12, width: 640 }}>
      <TableBatchBar
        count={sel.count}
        total={agents.length}
        isAllMatching={sel.isAllMatching}
        onSelectAll={sel.selectAllMatching}
        onClear={sel.clear}
        tableId="agents"
        labels={labels}
      >
        <Button size="sm" variant="secondary" onPress={() => onAction('pause')}>
          Pause
        </Button>
        <Divider orientation="vertical" />
        <Button
          size="sm"
          variant="destructive"
          onPress={() => onAction('delete')}
        >
          Delete
        </Button>
      </TableBatchBar>
      <Table id="agents" aria-label="Agents">
        <TableHead>
          <TableRow
            selection={sel.headSelection(
              rows.map((r) => r.id),
              'Select all agents on this page',
            )}
          >
            <TableCell header>Agent</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.id}
              isSelected={sel.isSelected(r.id)}
              selection={sel.rowSelection(r.id, `Select ${r.name}`)}
            >
              <TableCell>{r.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {canGrow && (
        <Button
          size="sm"
          variant="tertiary"
          onPress={() =>
            setAgents((a) => [
              ...a,
              { id: `agt_${a.length + 1}`, name: `Agent ${a.length + 1}` },
            ])
          }
        >
          A new agent arrives
        </Button>
      )}
      <Pagination
        aria-label="Agent pages"
        page={page}
        pageCount={Math.ceil(agents.length / PAGE)}
        onPageChange={setPage}
      />
    </div>
  );
}

const meta: Meta<typeof TableBatchBar> = {
  title: 'Components/TableBatchBar',
  component: TableBatchBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The count, "Select all N", the bulk actions and "Clear selection", shown while any row is selected. Pair it with `useTableSelection`, which holds the selection — page by page, or every matching row across pages as "all except these".\n\nThe header checkbox selects the page you can see; reaching rows you cannot see is the bar\'s separate "Select all" press. The count is a live region, so the bar stays mounted — hidden — at zero.',
      },
    },
  },
  render: () => <Composed />,
};

export default meta;
type Story = StoryObj<typeof TableBatchBar>;

export const Default: Story = {};

// ------------------------------------------------------------------ tests

/** The native box is hidden with pointer-events: none; a click lands on its label. */
const tick = (box: HTMLElement) =>
  userEvent.click(box.closest('.ion-checkbox')!);
const header = (c: ReturnType<typeof within>) =>
  c.getByRole('checkbox', { name: 'Select all agents on this page' });
const status = (c: ReturnType<typeof within>) => c.getByRole('status');

/** The live region is in the page before the first tick, so it is heard. */
export const CountIsAnnouncedFromTheFirstTick: Story = {
  play: async ({ canvas }) => {
    await expect(status(canvas)).toBeEmptyDOMElement();
    await expect(canvas.queryByRole('toolbar')).toBeNull();
    await tick(canvas.getByRole('checkbox', { name: 'Select Agent 2' }));
    await expect(status(canvas)).toHaveTextContent('1 selected');
    await expect(
      canvas.getByRole('toolbar', { name: 'Actions for 1 selected rows' }),
    ).toBeVisible();
  },
};

/** One row ticked, the header is mixed; pressing it completes the page. */
export const HeaderIsTriStateAndCompletes: Story = {
  play: async ({ canvas }) => {
    await tick(canvas.getByRole('checkbox', { name: 'Select Agent 1' }));
    const head = header(canvas) as HTMLInputElement;
    await expect(head.indeterminate).toBe(true);
    await tick(head);
    await expect(head).toBeChecked();
    await expect(head.indeterminate).toBe(false);
    await expect(status(canvas)).toHaveTextContent('5 selected');
    // Pressed again, it clears the page.
    await tick(head);
    await expect(status(canvas)).toBeEmptyDOMElement();
  },
};

/**
 * The header only reaches the page. "Select all 12" is offered once the page
 * is ticked and more rows match — a separate, deliberate press.
 */
export const SelectAllReachesEveryPage: Story = {
  play: async ({ canvas }) => {
    await tick(header(canvas));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Select all 12' }),
    );
    await expect(status(canvas)).toHaveTextContent('All 12 selected');
    await expect(
      canvas.queryByRole('button', { name: /Select all/ }),
    ).toBeNull();
    // Rows on a page not yet visited are selected too.
    await userEvent.click(canvas.getByRole('button', { name: /page 3/i }));
    await expect(
      canvas.getByRole('checkbox', { name: 'Select Agent 12' }),
    ).toBeChecked();
    // Unticking one leaves "all except one", counted as 11, no longer "All".
    await tick(canvas.getByRole('checkbox', { name: 'Select Agent 12' }));
    await expect(status(canvas)).toHaveTextContent('11 selected');
    await expect(
      canvas.getByRole('button', { name: 'Select all 12' }),
    ).toBeVisible();
  },
};

/** "All except every row" is nothing: the bar goes, the header reads empty. */
export const UntickingEverythingAfterSelectAllIsEmpty: Story = {
  play: async ({ canvas }) => {
    await tick(header(canvas));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Select all 12' }),
    );
    for (const p of [1, 2, 3]) {
      await userEvent.click(
        canvas.getByRole('button', { name: new RegExp(`page ${p}`, 'i') }),
      );
      await tick(header(canvas));
    }
    await expect(status(canvas)).toBeEmptyDOMElement();
    await expect(header(canvas)).not.toBeChecked();
    await expect(canvas.queryByRole('toolbar')).toBeNull();
  },
};

/** Clear takes the bar away, so focus goes to the header it came from. */
export const ClearReturnsFocusToTheHeader: Story = {
  play: async ({ canvas }) => {
    await tick(canvas.getByRole('checkbox', { name: 'Select Agent 3' }));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Clear selection' }),
    );
    await expect(
      canvas.getByRole('checkbox', { name: 'Select Agent 3' }),
    ).not.toBeChecked();
    await waitFor(() => expect(header(canvas)).toHaveFocus());
  },
};

/** The actions are a Toolbar: → between them, and they fire. */
export const ActionsAreAToolbar: Story = {
  play: async ({ canvas }) => {
    onAction.mockClear();
    await tick(canvas.getByRole('checkbox', { name: 'Select Agent 1' }));
    await tick(canvas.getByRole('checkbox', { name: 'Select Agent 2' }));
    const bar = canvas.getByRole('toolbar', {
      name: 'Actions for 2 selected rows',
    });
    const pause = within(bar).getByRole('button', { name: 'Pause' });
    pause.focus();
    await userEvent.keyboard('{ArrowRight}');
    const del = within(bar).getByRole('button', { name: 'Delete' });
    await expect(del).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(onAction).toHaveBeenCalledWith('delete');
  },
};

/** The selected row carries the tint, not only its checkbox. */
export const SelectedRowsAreMarked: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByRole('checkbox', { name: 'Select Agent 4' });
    await tick(box);
    await expect(box.closest('tr')).toHaveAttribute('data-selected', 'true');
  },
};

/** Every string it renders can be replaced — here in German. */
export const LabelsAreTranslatable: Story = {
  render: () => (
    <Composed
      labels={{
        selected: (n) => `${n} ausgewählt`,
        allSelected: (n) => `Alle ${n} ausgewählt`,
        selectAll: (n) => `Alle ${n} auswählen`,
        clear: 'Auswahl aufheben',
        actions: (n) => `Aktionen für ${n} ausgewählte Zeilen`,
      }}
    />
  ),
  play: async ({ canvas }) => {
    await tick(header(canvas));
    await expect(status(canvas)).toHaveTextContent('5 ausgewählt');
    await expect(
      canvas.getByRole('button', { name: 'Alle 12 auswählen' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('toolbar', {
        name: 'Aktionen für 5 ausgewählte Zeilen',
      }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Auswahl aufheben' }),
    ).toBeVisible();
  },
};

/** At zero the bar takes no room — only its empty live region is there. */
export const EmptyBarTakesNoSpace: Story = {
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('.ion-table-batch')!;
    const r = bar.getBoundingClientRect();
    await expect(r.width).toBeLessThanOrEqual(1);
    await expect(r.height).toBeLessThanOrEqual(1);
  },
};

/**
 * A row that arrives after everything was unticked is not selected. Left as
 * "all except the 12 unticked", the 13th would have come in ticked — and a
 * bulk delete would have reached a row nobody chose.
 */
export const AllExceptEverythingDoesNotSelectNewRows: Story = {
  render: () => <Composed canGrow />,
  play: async ({ canvas }) => {
    await tick(header(canvas));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Select all 12' }),
    );
    for (const p of [1, 2, 3]) {
      await userEvent.click(
        canvas.getByRole('button', { name: new RegExp(`page ${p}`, 'i') }),
      );
      await tick(header(canvas));
    }
    await userEvent.click(
      canvas.getByRole('button', { name: 'A new agent arrives' }),
    );
    await expect(status(canvas)).toBeEmptyDOMElement();
    await expect(
      canvas.getByRole('checkbox', { name: 'Select Agent 13' }),
    ).not.toBeChecked();
  },
};
