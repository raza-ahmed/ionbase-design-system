import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Icon,
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
