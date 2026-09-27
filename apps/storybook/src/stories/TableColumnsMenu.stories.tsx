import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumnsMenu,
  TableHead,
  TableRow,
  TruncatedText,
  useTableColumns,
  type TableColumn,
  type UseTableColumnsOptions,
} from 'ionbase-ui';

type Key = 'agent' | 'purpose' | 'team' | 'owner' | 'model' | 'runs';

const COLUMNS: TableColumn<Key>[] = [
  { key: 'agent', label: 'Agent', canHide: false, canResize: true },
  {
    key: 'purpose',
    label: 'Purpose',
    canResize: true,
    defaultWidth: 240,
    minWidth: 120,
    maxWidth: 400,
  },
  { key: 'team', label: 'Team' },
  { key: 'owner', label: 'Owner' },
  { key: 'model', label: 'Model', defaultHidden: true },
  { key: 'runs', label: 'Runs' },
];

const ROWS: Record<Key, string>[] = [
  {
    agent: 'Support triage',
    purpose: 'Reads new tickets and routes them to the right queue.',
    team: 'Support',
    owner: 'Ada Reyes',
    model: 'atlas-m',
    runs: '1,204',
  },
  {
    agent: 'Contract clause checker',
    purpose: 'Flags clauses that differ from the approved templates.',
    team: 'Legal',
    owner: 'Sam Ortiz',
    model: 'atlas-l',
    runs: '88',
  },
];

function ColumnsTable({
  columns = COLUMNS,
  options,
  sticky,
  onSort,
  width: boxWidth = 760,
}: {
  columns?: TableColumn<Key>[];
  options?: UseTableColumnsOptions<Key>;
  sticky?: boolean;
  onSort?: () => void;
  width?: number;
}) {
  const cols = useTableColumns<Key>(columns, options);
  return (
    <div style={{ display: 'grid', gap: 12, width: boxWidth }}>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => {
            cols.setHidden(['agent', 'team']);
            cols.setWidths({ purpose: 320 });
          }}
        >
          Restore view
        </Button>
        <TableColumnsMenu columns={cols} />
      </div>
      <output data-testid="state">
        {JSON.stringify({ hidden: cols.hidden, widths: cols.widths })}
      </output>
      <Table
        aria-label="Agents"
        maxHeight={sticky ? 200 : undefined}
        stickyFirstColumn={sticky}
      >
        <TableHead>
          <TableRow>
            {cols.visibleColumns.map((c) => (
              <TableCell
                key={c.key}
                header
                {...cols.headerProps(c.key)}
                {...(onSort && c.key === 'agent'
                  ? { sortDirection: 'none' as const, onSort }
                  : {})}
              >
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map((r) => (
            <TableRow key={r.agent}>
              {cols.visibleColumns.map((c) => (
                <TableCell key={c.key}>{r[c.key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const meta: Meta<typeof TableColumnsMenu> = {
  title: 'Components/TableColumnsMenu',
  component: TableColumnsMenu,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Which of a table's columns are shown, and how wide the resizable ones are. `useTableColumns(columns)` holds the state; `TableColumnsMenu` is the checklist that changes it, and `headerProps(key)` gives each header its resize handle. The table renders `visibleColumns`, so a hidden column's cells are not in the table at all.",
      },
    },
  },
  render: () => <ColumnsTable />,
};

export default meta;
type Story = StoryObj<typeof TableColumnsMenu>;

export const Default: Story = {};

const headers = (el: HTMLElement) =>
  [...el.querySelectorAll('thead th')].map((th) => th.textContent);
const th = (el: HTMLElement, label: string) =>
  [...el.querySelectorAll<HTMLElement>('thead th')].find(
    (h) => h.textContent === label,
  )!;
const width = (el: HTMLElement) => Math.round(el.getBoundingClientRect().width);
const settle = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

async function openMenu(canvasElement: HTMLElement) {
  await userEvent.click(
    within(canvasElement).getByRole('button', { name: 'Columns' }),
  );
  return within(document.body).findByRole('menu');
}

/** Every column is listed, checked when shown; the naming column is fixed. */
export const TheMenuListsEveryColumn: Story = {
  play: async ({ canvasElement }) => {
    const menu = await openMenu(canvasElement);
    const items = within(menu).getAllByRole('menuitemcheckbox');
    await expect(items.map((i) => i.textContent)).toEqual(
      COLUMNS.map((c) => c.label),
    );
    const checked = items.map((i) => i.getAttribute('aria-checked'));
    await expect(checked).toEqual([
      'true',
      'true',
      'true',
      'true',
      'false',
      'true',
    ]);
    // Listed so the list is every column, disabled so it stays.
    await expect(items[0]).toHaveAttribute('aria-disabled', 'true');
    await expect(items[1]).not.toHaveAttribute('aria-disabled');
    await expect(menu).toHaveAccessibleName('Columns');
  },
};

/** A column starts hidden with `defaultHidden`: no header, no cells. */
export const AColumnCanStartHidden: Story = {
  play: async ({ canvasElement }) => {
    await expect(headers(canvasElement)).not.toContain('Model');
    await expect(canvasElement).not.toHaveTextContent('atlas-m');
    await expect(
      canvasElement.querySelector('tbody tr')!.children,
    ).toHaveLength(5);
  },
};

/** Unchecking hides a column, cells and all; the menu stays open for more. */
export const UncheckingHidesIt: Story = {
  play: async ({ canvasElement }) => {
    const menu = await openMenu(canvasElement);
    await userEvent.click(
      within(menu).getByRole('menuitemcheckbox', { name: 'Owner' }),
    );
    await expect(headers(canvasElement)).toEqual([
      'Agent',
      'Purpose',
      'Team',
      'Runs',
    ]);
    await expect(canvasElement).not.toHaveTextContent('Ada Reyes');
    await expect(menu).toBeInTheDocument();
    await expect(
      within(menu).getByRole('menuitemcheckbox', { name: 'Owner' }),
    ).toHaveAttribute('aria-checked', 'false');
    // And checking one shows it, in its own place, not at the end.
    await userEvent.click(
      within(menu).getByRole('menuitemcheckbox', { name: 'Model' }),
    );
    await expect(headers(canvasElement)).toEqual([
      'Agent',
      'Purpose',
      'Team',
      'Model',
      'Runs',
    ]);
    await expect(canvasElement).toHaveTextContent('atlas-m');
  },
};

/** The keyboard works it too: arrows to a row, Space to toggle. */
export const TheKeyboardTogglesIt: Story = {
  play: async ({ canvasElement }) => {
    within(canvasElement).getByRole('button', { name: 'Columns' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    const menu = await within(document.body).findByRole('menu');
    // The fixed column is skipped: focus starts on the first that changes.
    await expect(
      within(menu).getByRole('menuitemcheckbox', { name: 'Purpose' }),
    ).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(headers(canvasElement)).not.toContain('Purpose');
    await userEvent.keyboard('{Escape}');
    await expect(
      within(canvasElement).getByRole('button', { name: 'Columns' }),
    ).toHaveFocus();
  },
};

/** With one column left, it cannot go: a table of nothing shows nothing. */
export const TheLastColumnStays: Story = {
  render: () => (
    <ColumnsTable
      columns={[
        { key: 'agent', label: 'Agent' },
        { key: 'team', label: 'Team' },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const menu = await openMenu(canvasElement);
    const agent = within(menu).getByRole('menuitemcheckbox', { name: 'Agent' });
    const team = within(menu).getByRole('menuitemcheckbox', { name: 'Team' });
    await expect(agent).not.toHaveAttribute('aria-disabled');
    await userEvent.click(team);
    await expect(headers(canvasElement)).toEqual(['Agent']);
    await expect(agent).toHaveAttribute('aria-disabled', 'true');
  },
};

/**
 * A saved view is plain data, restored with the setters — and a column that
 * cannot be hidden stays, whatever the saved view says.
 */
export const AViewIsRestored: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Restore view' }),
    );
    await expect(headers(canvasElement)).toEqual([
      'Agent',
      'Purpose',
      'Owner',
      'Model',
      'Runs',
    ]);
    await expect(th(canvasElement, 'Purpose').style.width).toBe('320px');
    await expect(
      JSON.parse(within(canvasElement).getByTestId('state').textContent!),
    ).toEqual({ hidden: ['team'], widths: { purpose: 320 } });
  },
};

/**
 * The handle is a focusable vertical separator — the window-splitter
 * pattern — named for its column, with the width as its value.
 */
export const TheHandleIsASeparator: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const handles = canvas.getAllByRole('separator');
    // Only the columns that resize have one.
    await expect(handles).toHaveLength(2);
    const purpose = canvas.getByRole('separator', { name: 'Resize Purpose' });
    await expect(purpose).toHaveAttribute('tabindex', '0');
    await expect(purpose).toHaveAttribute('aria-orientation', 'vertical');
    await expect(purpose).toHaveAttribute('aria-valuenow', '240');
    await expect(purpose).toHaveAttribute('aria-valuemin', '120');
    await expect(purpose).toHaveAttribute('aria-valuemax', '400');
    await expect(width(th(canvasElement, 'Purpose'))).toBe(240);
    // A column sized by its content announces the width it was laid out at,
    // and takes the default limits.
    const agent = canvas.getByRole('separator', { name: 'Resize Agent' });
    await settle();
    await expect(agent).toHaveAttribute(
      'aria-valuenow',
      String(width(th(canvasElement, 'Agent'))),
    );
    await expect(agent).toHaveAttribute('aria-valuemin', '80');
    await expect(agent).toHaveAttribute('aria-valuemax', '640');
  },
};

/** The header is still named by its label, not by the handle inside it. */
export const TheHeaderKeepsItsName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('columnheader', { name: 'Purpose' }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('cell', { name: /Reads new tickets/ }),
    ).toBeInTheDocument();
  },
};

/** Arrows step 16px, Shift four times that; Home and End go to the limits. */
export const ArrowKeysResize: Story = {
  play: async ({ canvasElement }) => {
    const handle = within(canvasElement).getByRole('separator', {
      name: 'Resize Purpose',
    });
    const cell = th(canvasElement, 'Purpose');
    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(width(cell)).toBe(256);
    await expect(handle).toHaveAttribute('aria-valuenow', '256');
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await expect(width(cell)).toBe(320);
    await userEvent.keyboard('{ArrowLeft}');
    await expect(width(cell)).toBe(304);
    await userEvent.keyboard('{End}');
    await expect(width(cell)).toBe(400);
    await userEvent.keyboard('{ArrowRight}');
    await expect(width(cell)).toBe(400);
    await userEvent.keyboard('{Home}');
    await expect(width(cell)).toBe(120);
    await userEvent.keyboard('{ArrowLeft}');
    await expect(width(cell)).toBe(120);
    await expect(
      JSON.parse(within(canvasElement).getByTestId('state').textContent!)
        .widths,
    ).toEqual({ purpose: 120 });
  },
};

/** A column sized by its content steps from the width it was laid out at. */
export const AContentSizedColumnStepsFromItsWidth: Story = {
  play: async ({ canvasElement }) => {
    const handle = within(canvasElement).getByRole('separator', {
      name: 'Resize Agent',
    });
    const cell = th(canvasElement, 'Agent');
    await settle();
    const start = width(cell);
    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(width(cell)).toBe(start + 16);
  },
};

/** A drag moves the edge with the pointer, and marks the handle meanwhile. */
export const DraggingResizes: Story = {
  render: () => (
    <div>
      <ColumnsTable />
      <div
        data-testid="target"
        style={{ marginLeft: 500, width: 20, height: 20 }}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const handle = within(canvasElement).getByRole('separator', {
      name: 'Resize Purpose',
    });
    const cell = th(canvasElement, 'Purpose');
    const target = within(canvasElement).getByTestId('target');
    const from = handle.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    await userEvent.dragAndDrop(handle, target);
    await expect(width(cell)).toBeCloseTo(Math.min(400, 240 + dx), -1);
    await expect(width(cell)).toBeGreaterThan(240);
    await expect(handle).not.toHaveAttribute('data-resizing');
    await expect(handle).toHaveFocus();
  },
};

/** A double-click puts the column back to its own width. */
export const DoubleClickPutsItBack: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const purpose = canvas.getByRole('separator', { name: 'Resize Purpose' });
    purpose.focus();
    await userEvent.keyboard('{End}');
    await expect(width(th(canvasElement, 'Purpose'))).toBe(400);
    await userEvent.dblClick(purpose);
    await expect(width(th(canvasElement, 'Purpose'))).toBe(240);
    // Content-sized: back to no width at all.
    const agent = canvas.getByRole('separator', { name: 'Resize Agent' });
    agent.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(th(canvasElement, 'Agent').style.width).not.toBe('');
    await userEvent.dblClick(agent);
    await expect(th(canvasElement, 'Agent').style.width).toBe('');
    await expect(
      JSON.parse(canvas.getByTestId('state').textContent!).widths,
    ).toEqual({});
  },
};

/** A press on the handle does not sort; the label still does. */
const onSortSpy = fn();
export const TheHandleDoesNotSort: Story = {
  render: () => <ColumnsTable onSort={onSortSpy} />,
  play: async ({ canvasElement }) => {
    onSortSpy.mockClear();
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('separator', { name: 'Resize Agent' }),
    );
    await expect(onSortSpy).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Agent' }));
    await expect(onSortSpy).toHaveBeenCalledTimes(1);
  },
};

/** Right to left, the trailing edge is on the left: ArrowLeft widens. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <ColumnsTable />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const handle = within(canvasElement).getByRole('separator', {
      name: 'Resize Purpose',
    });
    const cell = th(canvasElement, 'Purpose');
    await expect(Math.round(handle.getBoundingClientRect().left)).toBe(
      Math.round(cell.getBoundingClientRect().left),
    );
    handle.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(width(cell)).toBe(256);
    await userEvent.keyboard('{ArrowRight}');
    await expect(width(cell)).toBe(240);
  },
};

/** A held header keeps its handle, and stays held. */
export const AHeldHeaderKeepsItsHandle: Story = {
  render: () => <ColumnsTable sticky />,
  play: async ({ canvasElement }) => {
    const agent = th(canvasElement, 'Agent');
    const purpose = th(canvasElement, 'Purpose');
    await expect(getComputedStyle(agent).position).toBe('sticky');
    await expect(getComputedStyle(purpose).position).toBe('sticky');
    const handle = within(canvasElement).getByRole('separator', {
      name: 'Resize Purpose',
    });
    await expect(Math.round(handle.getBoundingClientRect().right)).toBe(
      Math.round(purpose.getBoundingClientRect().right),
    );
    // Widening the held column moves the held width with it.
    const box = canvasElement.querySelector(
      '.ion-table-container',
    ) as HTMLElement;
    await settle();
    const held = parseFloat(
      box.style.getPropertyValue('--ion-table-held-width'),
    );
    within(canvasElement)
      .getByRole('separator', { name: 'Resize Agent' })
      .focus();
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await settle();
    await expect(
      parseFloat(box.style.getPropertyValue('--ion-table-held-width')),
    ).toBeCloseTo(held + 64, 0);
  },
};

/** The handle's name translates with `resizeLabel`. */
export const TheNameTranslates: Story = {
  render: () => (
    <ColumnsTable
      options={{ resizeLabel: (label) => `Redimensionner ${label}` }}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('separator', {
        name: 'Redimensionner Purpose',
      }),
    ).toBeInTheDocument();
  },
};

/** The handle's rule shows on hover — checked in the stylesheet, since
 *  headless Chromium matches no `(hover: hover)`. */
export const TheRuleShowsOnHover: Story = {
  play: async ({ canvasElement }) => {
    const handle = canvasElement.querySelector('.ion-table__resizer')!;
    await expect(getComputedStyle(handle, '::after').opacity).toBe(
      matchMedia('(hover: none)').matches ? '1' : '0',
    );
    const rules = [...document.styleSheets].flatMap((s) => {
      try {
        return [...s.cssRules];
      } catch {
        return [];
      }
    });
    const hover = rules
      .filter((r): r is CSSMediaRule => r instanceof CSSMediaRule)
      .filter((r) => r.conditionText.includes('hover: hover'))
      .flatMap((r) => [...r.cssRules] as CSSStyleRule[])
      .find((r) => r.selectorText?.includes('.ion-table__resizer'));
    await expect(hover?.selectorText).toContain('th:hover');
    await expect(hover?.style.opacity).toBe('1');
  },
};

/**
 * `initial` starts from a saved view: it replaces the columns' own hidden
 * defaults, a fixed or unknown column in it is ignored, and its widths apply
 * from the first render.
 */
export const StartsFromASavedView: Story = {
  render: () => (
    <ColumnsTable
      options={{
        initial: {
          hidden: ['owner', 'agent', 'gone' as Key],
          widths: { purpose: 300 },
        },
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(headers(canvasElement)).toEqual([
      'Agent',
      'Purpose',
      'Team',
      'Model',
      'Runs',
    ]);
    await expect(width(th(canvasElement, 'Purpose'))).toBe(300);
    await expect(
      JSON.parse(within(canvasElement).getByTestId('state').textContent!),
    ).toEqual({ hidden: ['owner'], widths: { purpose: 300 } });
  },
};

/**
 * With no room to spare, a widened column keeps its width and the table
 * scrolls sideways, rather than the other columns squeezing it back.
 */
export const AFullTableScrollsRatherThanShrinks: Story = {
  render: () => <ColumnsTable width={480} />,
  play: async ({ canvasElement }) => {
    const handle = within(canvasElement).getByRole('separator', {
      name: 'Resize Purpose',
    });
    handle.focus();
    await userEvent.keyboard('{End}');
    await expect(width(th(canvasElement, 'Purpose'))).toBe(400);
    const box = canvasElement.querySelector(
      '.ion-table-container',
    ) as HTMLElement;
    await expect(box.scrollWidth).toBeGreaterThan(box.clientWidth);
  },
};

function TruncatedColumn() {
  const cols = useTableColumns<'agent' | 'team'>([
    { key: 'agent', label: 'Agent', canResize: true, maxWidth: 560 },
    { key: 'team', label: 'Team' },
  ]);
  return (
    <div style={{ width: 420 }}>
      <Table aria-label="Agents">
        <TableHead>
          <TableRow>
            {cols.visibleColumns.map((c) => (
              <TableCell key={c.key} header {...cols.headerProps(c.key)}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>
              {/* A name over its description, with a floor — the demo's
                  Agents cell. */}
              <span style={{ display: 'grid', minWidth: '16rem' }}>
                <a href="#agent">{ROWS[1].agent}</a>
                <TruncatedText>{ROWS[1].purpose.repeat(4)}</TruncatedText>
              </span>
            </TableCell>
            <TableCell>Legal</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * A wider column shows more of cut text: it is cut at the cell's edge,
 * wherever that is — and it never widens the column by itself.
 */
export const AWiderColumnShowsMoreOfCutText: Story = {
  render: () => <TruncatedColumn />,
  play: async ({ canvasElement }) => {
    const line = canvasElement.querySelector(
      '.ion-truncated__text',
    ) as HTMLElement;
    const cell = line.closest('td')!;
    const inner = () =>
      cell.clientWidth -
      parseFloat(getComputedStyle(cell).paddingLeft) -
      parseFloat(getComputedStyle(cell).paddingRight);
    await settle();
    // Cut at the cell's edge, in a table no wider than its box.
    await expect(line.clientWidth).toBeCloseTo(inner(), -1);
    await expect(
      width(canvasElement.querySelector('table')!),
    ).toBeLessThanOrEqual(420);
    within(canvasElement)
      .getByRole('separator', { name: 'Resize Agent' })
      .focus();
    await userEvent.keyboard('{End}');
    await expect(width(th(canvasElement, 'Agent'))).toBe(560);
    await expect(line.clientWidth).toBe(560 - 32);
  },
};
