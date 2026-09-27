import React, { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Icon,
  useTableSort,
  type TableSort,
} from 'ionbase-ui';
import { ArrowUpRight, Mail } from 'lucide-react';

const meta: Meta<typeof Table> = {
  title: 'Components/Table',
  component: Table,
  tags: ['autodocs'],
  argTypes: {
    density: {
      control: 'inline-radio',
      options: ['compact', 'default', 'relaxed'],
    },
  },
  args: {
    'aria-label': 'Invoices',
  },
  parameters: {
    docs: {
      description: {
        component:
          "Measured from Figma `Table Row` / `Table Cell` / `Cell Text` (173:42). Density (Compact/Default/Relaxed) only moves vertical padding — 8/16/20, the same 16px horizontal padding runs through all three. `TableCell` covers Figma's `Table Cell` + `Cell Text` together: the two are never used apart in the design, so splitting them would only add API surface for a composition nothing varies independently.\n\n`header` decides `<th>` vs `<td>` directly, so the header fill and weight come from real table semantics rather than a `type` prop that could disagree with where the cell actually sits. `aria-label` / `aria-labelledby` name the scroll container (a keyboard-reachable region), not the `<table>` itself.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Table>;

const ROWS = [
  { name: 'Invoice #1024', status: 'Paid', amount: '$240.00' },
  { name: 'Invoice #1025', status: 'Pending', amount: '$80.00' },
  { name: 'Invoice #1026', status: 'Paid', amount: '$512.00' },
];

export const Default: Story = {
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableCell header>Name</TableCell>
          <TableCell header>Status</TableCell>
          <TableCell header align="trailing">
            Amount
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell align="trailing">{row.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Density: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {(['compact', 'default', 'relaxed'] as const).map((density) => (
        <div key={density}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem' }}>{density}</p>
          <Table density={density} aria-label={density}>
            <TableHead>
              <TableRow>
                <TableCell header>Name</TableCell>
                <TableCell header>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Invoice #1024</TableCell>
                <TableCell>Paid</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  ),
};

export const WithSelectionAndIcons: Story = {
  render: () => (
    <Table aria-label="Selectable invoices">
      <TableHead>
        <TableRow selection={{ 'aria-label': 'Select all' }}>
          <TableCell header>Name</TableCell>
          <TableCell header showDivider>
            Status
          </TableCell>
          <TableCell header align="trailing">
            Amount
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow
          isSelected
          selection={{
            'aria-label': 'Select Invoice #1024',
            defaultChecked: true,
          }}
        >
          <TableCell icon={<Icon as={Mail} />}>Invoice #1024</TableCell>
          <TableCell showDivider>Paid</TableCell>
          <TableCell
            align="trailing"
            variant="link"
            trailingIcon={<Icon as={ArrowUpRight} />}
          >
            View
          </TableCell>
        </TableRow>
        <TableRow selection={{ 'aria-label': 'Select Invoice #1025' }}>
          <TableCell icon={<Icon as={Mail} />}>Invoice #1025</TableCell>
          <TableCell showDivider>Pending</TableCell>
          <TableCell
            align="trailing"
            variant="link"
            trailingIcon={<Icon as={ArrowUpRight} />}
          >
            View
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const Striped: Story = {
  render: () => (
    <Table isStriped aria-label="Striped invoices">
      <TableHead>
        <TableRow>
          <TableCell header>Name</TableCell>
          <TableCell header>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/**
 * Figma: header cell 16/16 padding, `font-weight/medium` — not semibold, the
 * value the pre-v2 file had. Body cell is Regular.
 */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => (
    <Table aria-label="Geometry">
      <TableHead>
        <TableRow>
          <TableCell header>Name</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>Invoice #1024</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    const th = canvasElement.querySelector('th') as HTMLElement;
    const td = canvasElement.querySelector('td') as HTMLElement;

    const thCs = getComputedStyle(th);
    await expect(thCs.paddingTop).toBe('16px');
    await expect(thCs.paddingLeft).toBe('16px');
    await expect(thCs.fontWeight).toBe('500');

    const tdCs = getComputedStyle(td);
    await expect(tdCs.fontWeight).toBe('400');
  },
};

/**
 * Density changes vertical padding only — checked directly, since "only
 * vertical" is the one fact in this file most likely to regress back to the
 * pre-v2 file's both-axes version.
 */
export const DensityOnlyMovesVerticalPadding: Story = {
  render: () => (
    <div>
      <Table density="compact" aria-label="compact">
        <TableBody>
          <TableRow>
            <TableCell>Row</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Table density="relaxed" aria-label="relaxed">
        <TableBody>
          <TableRow>
            <TableCell>Row</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const cells = canvasElement.querySelectorAll('td');
    const compact = getComputedStyle(cells[0]);
    const relaxed = getComputedStyle(cells[1]);

    await expect(compact.paddingTop).toBe('8px');
    await expect(relaxed.paddingTop).toBe('20px');
    // Horizontal padding is the same 16px regardless of density.
    await expect(compact.paddingLeft).toBe(relaxed.paddingLeft);
  },
};

/**
 * A striped, hovered row must show the hover tint, not the stripe — the two
 * share identical CSS specificity, so this is the test that would catch the
 * stripe rule silently winning if it were ever moved after the hover rule.
 */
export const StripedRowStillHovers: Story = {
  render: () => (
    <Table isStriped aria-label="Striped hover">
      <TableBody>
        <TableRow>
          <TableCell>Row 1</TableCell>
        </TableRow>
        <TableRow data-hovered="true">
          <TableCell>Row 2 (striped + hovered)</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll('tr');
    const stripedHovered = getComputedStyle(rows[1]);

    const hoverColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--surface-hover')
      .trim();

    await expect(stripedHovered.backgroundColor).toBe(hoverColor);
  },
};

/** Selecting a row is real form state — a `Checkbox`, not a decorative box. */
export const SelectionIsARealCheckbox: Story = {
  render: () => (
    <Table aria-label="Selection">
      <TableBody>
        <TableRow selection={{ 'aria-label': 'Select row' }}>
          <TableCell>Row</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
  play: async ({ canvas, userEvent }) => {
    const checkbox = canvas.getByLabelText('Select row') as HTMLInputElement;
    await expect(checkbox.type).toBe('checkbox');
    await expect(checkbox.checked).toBe(false);

    // The native input is visually hidden with `pointer-events: none` (same
    // pattern as every other Checkbox usage in this system) — a real click
    // lands on the wrapping `<label>`, which delegates to the input.
    await userEvent.click(checkbox.closest('label') as HTMLLabelElement);
    await expect(checkbox.checked).toBe(true);
  },
};

/**
 * Header selection is a `<th scope="col">` with a labelled select-all
 * checkbox — not an empty spacer `<td>`. Body selection stays a `<td>`.
 * Every column header carries `scope="col"`.
 */
export const HeaderSelectionIsSelectAll: Story = {
  render: () => (
    <Table aria-label="Select-all">
      <TableHead>
        <TableRow selection={{ 'aria-label': 'Select all' }}>
          <TableCell header>Name</TableCell>
          <TableCell header>Status</TableCell>
          <TableCell header align="trailing">
            Amount
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow
            key={row.name}
            selection={{ 'aria-label': `Select ${row.name}` }}
          >
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell align="trailing">{row.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByLabelText('Select all')).toBeTruthy();

    const headSelect = canvasElement.querySelector(
      'thead th:first-child',
    ) as HTMLTableCellElement;
    await expect(headSelect.tagName).toBe('TH');
    await expect(headSelect.scope).toBe('col');

    const bodySelect = canvasElement.querySelector(
      'tbody td:first-child',
    ) as HTMLTableCellElement;
    await expect(bodySelect.tagName).toBe('TD');

    const headers = [...canvasElement.querySelectorAll('thead th')];
    // select-all + Name + Status + Amount
    await expect(headers.length).toBe(4);
    for (const th of headers) {
      await expect((th as HTMLTableCellElement).scope).toBe('col');
    }

    const headRow = canvasElement.querySelector('thead tr') as HTMLElement;
    const bodyRow = canvasElement.querySelector('tbody tr') as HTMLElement;
    await expect(headRow.children.length).toBe(bodyRow.children.length);
  },
};

/** The scroll container is a named, focusable region so wide tables can be
 *  scrolled from the keyboard (WCAG 2.1.1). */
export const ScrollContainerIsKeyboardReachable: Story = {
  render: () => (
    <Table aria-label="Wide invoices">
      <TableHead>
        <TableRow>
          <TableCell header>Name</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>Invoice #1024</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector(
      '.ion-table-container',
    ) as HTMLElement;
    await expect(region.getAttribute('role')).toBe('region');
    await expect(region.tabIndex).toBe(0);
    await expect(region.getAttribute('aria-label')).toBe('Wide invoices');
  },
};

/**
 * The scroll container is a containing block, so nothing in a cell escapes it.
 *
 * Absolutely positioned content — a checkbox's real input, visually hidden
 * text — is placed against the nearest positioned ancestor. Without
 * `position: relative` on `.ion-table-container` that ancestor was outside
 * the table, so the content ignored the container's `overflow-x` and widened
 * the page instead: 382px of sideways scroll on a 390px phone in the demo app.
 * The outer box here stands in for the page.
 */
export const CellContentStaysInsideTheScroller: Story = {
  render: () => (
    <div
      data-testid="page"
      style={{ position: 'relative', width: '240px', overflow: 'auto' }}
    >
      <Table aria-label="Wide invoices">
        <TableHead>
          <TableRow>
            {['Name', 'Status', 'Amount', 'Owner', 'Due'].map((h) => (
              <TableCell key={h} header>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Invoice #1024</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>$240.00</TableCell>
            <TableCell>Priya Raman</TableCell>
            <TableCell>
              12 Oct 2026
              <span style={{ position: 'absolute' }}>positioned</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const page = canvas.getByTestId('page');
    const scroller = canvasElement.querySelector(
      '.ion-table-container',
    ) as HTMLElement;

    // The table is wider than the page, so the scroller really does scroll…
    await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    // …and the page around it does not.
    await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth);
  },
};

const INVOICES = [
  { name: 'Invoice #1024', amount: 240, due: '2026-10-12' },
  { name: 'Invoice #1025', amount: 80, due: '2026-09-30' },
  { name: 'Invoice #1026', amount: 512, due: '2026-11-02' },
];
type InvoiceColumn = 'name' | 'amount' | 'due';

function SortableInvoices({
  initial = null,
}: {
  initial?: TableSort<InvoiceColumn> | null;
}) {
  const { sort, sortProps } = useTableSort<InvoiceColumn>(initial);
  // The table never reorders rows — the caller does, from `sort`.
  const rows = [...INVOICES].sort((a, b) => {
    if (!sort) return 0;
    const x = a[sort.column];
    const y = b[sort.column];
    const order = x < y ? -1 : x > y ? 1 : 0;
    return sort.direction === 'ascending' ? order : -order;
  });
  return (
    <Table aria-label="Invoices">
      <TableHead>
        <TableRow>
          <TableCell header {...sortProps('name')}>
            Invoice
          </TableCell>
          <TableCell
            header
            align="trailing"
            {...sortProps('amount', { firstDirection: 'descending' })}
          >
            Amount
          </TableCell>
          <TableCell header {...sortProps('due')}>
            Due
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.name}>
            <TableCell>{r.name}</TableCell>
            <TableCell align="trailing">${r.amount.toFixed(2)}</TableCell>
            <TableCell>{r.due}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const firstColumn = (canvasElement: HTMLElement) =>
  [...canvasElement.querySelectorAll('tbody tr')].map(
    (tr) => tr.querySelector('td')?.textContent,
  );

/**
 * `sortDirection` on a header cell makes its label a button; `useTableSort`
 * holds which column and which way. The rows are sorted by the story, not the
 * table — the same as a real product, whose rows may be paged from a server.
 */
export const SortableColumns: Story = {
  render: () => (
    <SortableInvoices initial={{ column: 'name', direction: 'ascending' }} />
  ),
};

export const OnlyTheSortedColumnHasAriaSort: Story = {
  render: () => (
    <SortableInvoices initial={{ column: 'name', direction: 'ascending' }} />
  ),
  play: async ({ canvasElement }) => {
    const headers = [...canvasElement.querySelectorAll('th')];
    await expect(headers.map((th) => th.getAttribute('aria-sort'))).toEqual([
      'ascending',
      null,
      null,
    ]);
    // Every sortable header is still a column header, with a button inside.
    for (const th of headers) {
      await expect(th.getAttribute('scope')).toBe('col');
      await expect(th.querySelector('button')).not.toBeNull();
    }
  },
};

export const ChoosingAColumnSortsThenReverses: Story = {
  render: () => <SortableInvoices />,
  play: async ({ canvasElement, canvas, userEvent }) => {
    const due = canvas.getByRole('button', { name: 'Due' });

    await userEvent.click(due);
    await expect(due.closest('th')).toHaveAttribute('aria-sort', 'ascending');
    await expect(firstColumn(canvasElement)).toEqual([
      'Invoice #1025',
      'Invoice #1024',
      'Invoice #1026',
    ]);

    await userEvent.click(due);
    await expect(due.closest('th')).toHaveAttribute('aria-sort', 'descending');
    await expect(firstColumn(canvasElement)[0]).toBe('Invoice #1026');

    // A third press reverses again — it never silently drops the sort.
    await userEvent.click(due);
    await expect(due.closest('th')).toHaveAttribute('aria-sort', 'ascending');
  },
};

export const FirstDirectionIsPerColumn: Story = {
  render: () => <SortableInvoices />,
  play: async ({ canvasElement, canvas, userEvent }) => {
    const amount = canvas.getByRole('button', {
      name: 'Amount',
    });
    await userEvent.click(amount);
    // Amounts start largest-first: that is what people look for.
    await expect(amount.closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    await expect(firstColumn(canvasElement)[0]).toBe('Invoice #1026');
  },
};

export const SortsFromTheKeyboard: Story = {
  render: () => <SortableInvoices />,
  play: async ({ canvas, userEvent }) => {
    const invoice = canvas.getByRole('button', {
      name: 'Invoice',
    });
    invoice.focus();
    await userEvent.keyboard('{Enter}');
    await expect(invoice.closest('th')).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await userEvent.keyboard(' ');
    await expect(invoice.closest('th')).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  },
};

/** The sorted column reads from its label as well as its arrow. */
export const SortedLabelIsDarker: Story = {
  render: () => (
    <SortableInvoices initial={{ column: 'name', direction: 'ascending' }} />
  ),
  play: async ({ canvasElement }) => {
    const [sorted, other] = [
      ...canvasElement.querySelectorAll('th button'),
    ] as HTMLElement[];
    await expect(getComputedStyle(sorted).color).not.toBe(
      getComputedStyle(other).color,
    );
    await expect(
      sorted
        .querySelector('.ion-table__sort-icon')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  },
};

export const HeaderWithoutSortDirectionIsPlainText: Story = {
  render: () => (
    <Table aria-label="Invoices">
      <TableHead>
        <TableRow>
          <TableCell header onSort={() => {}}>
            Invoice
          </TableCell>
        </TableRow>
      </TableHead>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('th button')).toBeNull();
    await expect(
      canvasElement.querySelector('th')?.hasAttribute('aria-sort'),
    ).toBe(false);
  },
};

// ------------------------------------------------------ expandable rows

const detailOf = (name: string) =>
  `${name}: paid by card on 12 Sept, receipt sent.`;

function ExpandableInvoices(props: {
  isStriped?: boolean;
  selected?: string;
  defaultOpen?: string;
}) {
  return (
    <Table aria-label="Invoices" isStriped={props.isStriped}>
      <TableHead>
        <TableRow
          expansion={{ label: 'Details' }}
          selection={{ 'aria-label': 'Select all' }}
        >
          <TableCell header>Invoice</TableCell>
          <TableCell header>Status</TableCell>
          <TableCell header align="trailing">
            Amount
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ROWS.map((r) => (
          <TableRow
            key={r.name}
            isSelected={props.selected === r.name}
            selection={{
              'aria-label': `Select ${r.name}`,
              isSelected: props.selected === r.name,
            }}
            expansion={{
              'aria-label': `Details for ${r.name}`,
              content: detailOf(r.name),
              defaultExpanded: props.defaultOpen === r.name,
            }}
          >
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.status}</TableCell>
            <TableCell align="trailing">{r.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const ExpandableRows: Story = {
  render: () => <ExpandableInvoices />,
};

const toggle = (
  canvas: { getByRole: (r: string, o: object) => HTMLElement },
  name: string,
) => canvas.getByRole('button', { name: `Details for ${name}` });
const detailRows = (el: HTMLElement) => [
  ...el.querySelectorAll<HTMLTableRowElement>('tr.ion-table__detail'),
];

/**
 * The toggle is a disclosure: a button named for its row, saying open or
 * closed, controlling the detail row while it is open.
 */
export const TheToggleIsADisclosure: Story = {
  render: () => <ExpandableInvoices />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const button = toggle(canvas, 'Invoice #1025');
    await expect(button.tagName).toBe('BUTTON');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).not.toHaveAttribute('aria-controls');
    await expect(detailRows(canvasElement)).toHaveLength(0);

    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    const [detail] = detailRows(canvasElement);
    await expect(detail).toHaveTextContent(detailOf('Invoice #1025'));
    await expect(button.getAttribute('aria-controls')).toBe(detail.id);
    // Directly under its own row.
    await expect(detail.previousElementSibling?.textContent).toContain(
      'Invoice #1025',
    );

    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(detailRows(canvasElement)).toHaveLength(0);
  },
};

/** Enter and Space open and close it, and focus stays on the toggle. */
export const TheKeyboardOpensIt: Story = {
  render: () => <ExpandableInvoices />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const button = toggle(canvas, 'Invoice #1024');
    button.focus();
    await userEvent.keyboard('{Enter}');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(button).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(detailRows(canvasElement)).toHaveLength(0);
  },
};

/**
 * The detail spans every column — toggle, checkbox and all — and the head
 * has a named cell over the toggles, so the columns line up.
 */
export const TheDetailSpansEveryColumn: Story = {
  render: () => <ExpandableInvoices defaultOpen="Invoice #1024" />,
  play: async ({ canvas, canvasElement }) => {
    const head = canvasElement.querySelector('thead tr') as HTMLTableRowElement;
    const firstBody = canvasElement.querySelector(
      'tbody tr',
    ) as HTMLTableRowElement;
    await expect(head.cells).toHaveLength(5);
    await expect(firstBody.cells).toHaveLength(5);
    const detailCell = detailRows(canvasElement)[0].cells[0];
    await expect(detailCell.colSpan).toBe(5);
    await expect(Math.round(detailCell.getBoundingClientRect().width)).toBe(
      Math.round(head.getBoundingClientRect().width),
    );
    const expanderHeader = canvas.getByRole('columnheader', {
      name: 'Details',
    });
    await expect(expanderHeader).toHaveAttribute('scope', 'col');
    await expect(
      expanderHeader.querySelector('.ion-visually-hidden'),
    ).toHaveTextContent('Details');
  },
};

/** `defaultExpanded` starts it open; the rest stay closed. */
export const ItCanStartOpen: Story = {
  render: () => <ExpandableInvoices defaultOpen="Invoice #1026" />,
  play: async ({ canvas, canvasElement }) => {
    await expect(toggle(canvas, 'Invoice #1026')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(toggle(canvas, 'Invoice #1024')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(detailRows(canvasElement)).toHaveLength(1);
  },
};

const changed = fn();

/**
 * Controlled: `isExpanded` decides, and a press only asks through
 * `onExpandedChange` — here, one row open at a time.
 */
export const OneOpenAtATime: Story = {
  render: () => {
    function OneAtATime() {
      const [open, setOpen] = useState<string | null>(null);
      return (
        <Table aria-label="Invoices">
          <TableBody>
            {ROWS.map((r) => (
              <TableRow
                key={r.name}
                expansion={{
                  'aria-label': `Details for ${r.name}`,
                  content: detailOf(r.name),
                  isExpanded: open === r.name,
                  onExpandedChange: (next) => {
                    changed(r.name, next);
                    setOpen(next ? r.name : null);
                  },
                }}
              >
                <TableCell>{r.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    return <OneAtATime />;
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    changed.mockClear();
    await userEvent.click(toggle(canvas, 'Invoice #1024'));
    await userEvent.click(toggle(canvas, 'Invoice #1025'));
    await expect(changed).toHaveBeenLastCalledWith('Invoice #1025', true);
    await expect(detailRows(canvasElement)).toHaveLength(1);
    await expect(toggle(canvas, 'Invoice #1024')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
};

/** Controlled and never changed, a press does not open it on its own. */
export const ControlledStaysWhereItIsPut: Story = {
  render: () => (
    <Table aria-label="Invoices">
      <TableBody>
        <TableRow
          expansion={{
            'aria-label': 'Details for Invoice #1024',
            content: 'Paid',
            isExpanded: false,
            onExpandedChange: changed,
          }}
        >
          <TableCell>Invoice #1024</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    changed.mockClear();
    await userEvent.click(toggle(canvas, 'Invoice #1024'));
    await expect(changed).toHaveBeenCalledWith(true);
    await expect(detailRows(canvasElement)).toHaveLength(0);
  },
};

/** Closed points right, open points down: the shape says it too. */
export const TheChevronTurns: Story = {
  render: () => <ExpandableInvoices defaultOpen="Invoice #1024" />,
  play: async ({ canvas }) => {
    const turn = (name: string) =>
      getComputedStyle(toggle(canvas, name).querySelector('svg')!).transform;
    await expect(turn('Invoice #1025')).toBe('none');
    // rotate(90deg) as a matrix: cos 90 = 0, sin 90 = 1.
    await expect(turn('Invoice #1024')).toMatch(/^matrix\(0, 1, -1, 0/);
    const box = toggle(canvas, 'Invoice #1024').getBoundingClientRect();
    await expect(box.width).toBeGreaterThanOrEqual(24);
    await expect(box.height).toBeGreaterThanOrEqual(24);
  },
};

/** A token as the browser computes it — rgb, not the hex it is written in. */
const token = (name: string) => {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
};

/**
 * Stripes count real rows: an open detail shifts nothing below it, and takes
 * its own row's stripe.
 */
export const StripesSkipTheDetail: Story = {
  render: () => <ExpandableInvoices isStriped defaultOpen="Invoice #1025" />,
  play: async ({ canvasElement }) => {
    const bg = (el: Element) => getComputedStyle(el).backgroundColor;
    const rows = [
      ...canvasElement.querySelectorAll<HTMLElement>('tbody tr.ion-table__row'),
    ];
    const stripe = token('--surface-page');
    await expect(bg(rows[0])).not.toBe(stripe);
    await expect(bg(rows[1])).toBe(stripe);
    await expect(bg(rows[2])).not.toBe(stripe);
    await expect(bg(detailRows(canvasElement)[0])).toBe(stripe);
  },
};

/**
 * A selected row's tint reaches its detail, and beats the stripe on an even
 * row — the stripe rule's `:nth-child(… of …)` must not outrank it.
 */
export const SelectionBeatsTheStripe: Story = {
  render: () => (
    <ExpandableInvoices
      isStriped
      selected="Invoice #1025"
      defaultOpen="Invoice #1025"
    />
  ),
  play: async ({ canvasElement }) => {
    const tint = token('--surface-primary-subtle');
    const even = canvasElement.querySelectorAll('tbody tr.ion-table__row')[1];
    await expect(getComputedStyle(even).backgroundColor).toBe(tint);
    await expect(
      getComputedStyle(detailRows(canvasElement)[0]).backgroundColor,
    ).toBe(tint);
  },
};

/** No rule between a row and its open detail; the rule comes after the pair. */
export const TheRowAndItsDetailReadAsOne: Story = {
  render: () => <ExpandableInvoices defaultOpen="Invoice #1024" />,
  play: async ({ canvasElement }) => {
    const open = canvasElement.querySelector(
      'tbody tr[data-expanded]',
    ) as HTMLElement;
    await expect(getComputedStyle(open).borderBottomColor).toBe(
      'rgba(0, 0, 0, 0)',
    );
    const detail = detailRows(canvasElement)[0];
    await expect(getComputedStyle(detail).borderBottomColor).not.toBe(
      'rgba(0, 0, 0, 0)',
    );
    // Its text starts under the row's first column of content, past the toggle.
    const detailText =
      detail.cells[0].getBoundingClientRect().left +
      parseFloat(getComputedStyle(detail.cells[0]).paddingLeft);
    const checkboxCell = (open as HTMLTableRowElement).cells[1];
    await expect(Math.round(detailText)).toBe(
      Math.round(checkboxCell.getBoundingClientRect().left),
    );
  },
};

/**
 * The detail is not a row to point at: the hover tint's selector matches a
 * row but not its detail. Read from the stylesheet, since a headless browser
 * does not match `(hover: hover)` and would never apply the rule at all.
 */
export const HoveringTheDetailTintsNothing: Story = {
  render: () => <ExpandableInvoices defaultOpen="Invoice #1024" />,
  play: async ({ canvasElement }) => {
    const detail = detailRows(canvasElement)[0];
    const row = detail.previousElementSibling as HTMLElement;
    const hoverSelectors: string[] = [];
    const walk = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule) {
          for (const sel of rule.selectorText.split(','))
            if (/tbody tr[^,]*:hover/.test(sel) && sel.includes('.ion-table'))
              hoverSelectors.push(sel.trim().replace(':hover', ''));
        } else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules);
      } catch {
        // A cross-origin sheet: not ours.
      }
    }
    await expect(hoverSelectors.length).toBeGreaterThan(0);
    await expect(hoverSelectors.some((sel) => row.matches(sel))).toBe(true);
    await expect(hoverSelectors.some((sel) => detail.matches(sel))).toBe(false);
  },
};

/** A cell spanning two columns counts as two: the detail still spans them all. */
export const AWideCellCountsAsTwo: Story = {
  render: () => (
    <Table aria-label="Invoices">
      <TableHead>
        <TableRow expansion={{ label: 'Details' }}>
          <TableCell header>Invoice</TableCell>
          <TableCell header>Status</TableCell>
          <TableCell header>Amount</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow
          expansion={{
            'aria-label': 'Details for Invoice #1024',
            content: 'Paid',
            defaultExpanded: true,
          }}
        >
          <TableCell colSpan={2}>Invoice #1024, paid</TableCell>
          <TableCell>$240.00</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    await expect(detailRows(canvasElement)[0].cells[0].colSpan).toBe(4);
  },
};

/** The row's own ref still reaches its `<tr>`. */
export const TheRowKeepsItsRef: Story = {
  render: () => {
    function WithRef() {
      const ref = useRef<HTMLTableRowElement>(null);
      const [tag, setTag] = useState('');
      return (
        <>
          <Table aria-label="Invoices">
            <TableBody>
              <TableRow
                ref={ref}
                expansion={{ 'aria-label': 'Details for A', content: 'A' }}
              >
                <TableCell>A</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <button
            type="button"
            onClick={() => setTag(ref.current?.tagName ?? '')}
          >
            Read
          </button>
          <output data-testid="tag">{tag}</output>
        </>
      );
    }
    return <WithRef />;
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Read' }));
    await expect(canvas.getByTestId('tag')).toHaveTextContent('TR');
  },
};
