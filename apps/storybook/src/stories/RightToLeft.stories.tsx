import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import {
  Avatar,
  AvatarGroup,
  Button,
  DatePicker,
  Pagination,
  Sidebar,
  SidebarItem,
  SidebarSection,
  SkipLink,
  Stepper,
  StepperStep,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Timeline,
  TimelineItem,
  Toggle,
  Toolbar,
  Tooltip,
  useLocale,
} from 'ionbase-ui';

/**
 * Right to left, measured. Every story here runs with `dir="rtl"` on the
 * document and a Hebrew locale for react-aria — the toolbar's Direction
 * global, set per story — and checks where things land, not which classes
 * they carry. Each is the counterpart of a physical property turned logical,
 * or of one kept physical on purpose.
 */
const meta: Meta = {
  title: 'Foundations/Right to left',
  globals: { direction: 'rtl' },
  parameters: {
    docs: {
      description: {
        component:
          'Every stylesheet uses logical properties — `inset-inline-start`, `margin-inline-end`, `text-align: start` — so a page with `dir="rtl"` mirrors with no stylesheet of its own; stylelint rejects a physical left or right. Wrap the app in `I18nProvider` with an RTL locale as well: react-aria’s arrow keys follow the locale, not `dir`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const box = (el: Element | null) => el!.getBoundingClientRect();
const settle = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
/** An element's transform as the angle it turns, in degrees. */
const turn = (el: Element) => {
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI);
};

/** The decorator set both halves: the document's `dir` and the locale. */
export const BothHalvesAreSet: Story = {
  render: () => {
    const { direction, locale } = useLocale();
    return (
      <p>
        {direction} {locale}
      </p>
    );
  },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement.dir).toBe('rtl');
    await expect(canvasElement.textContent).toBe('rtl he-IL');
  },
};

const RUNS = Array.from({ length: 4 }, (_, i) => ({
  id: `run_48${10 + i}`,
  agent: 'Invoice reconciler',
  outcome: 'Completed',
  cost: `$${(i + 1) * 3}.20`,
}));

function RunsTable() {
  return (
    <div style={{ width: 360 }}>
      <Table aria-label="Runs" stickyFirstColumn>
        <TableHead>
          <TableRow expansion={{ label: 'Details' }}>
            <TableCell header>Run</TableCell>
            <TableCell header>Agent</TableCell>
            <TableCell header>Outcome</TableCell>
            <TableCell header align="trailing">
              Cost
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {RUNS.map((r) => (
            <TableRow
              key={r.id}
              expansion={{
                'aria-label': `Details for ${r.id}`,
                content: r.outcome,
              }}
            >
              <TableCell header scope="row">
                {r.id}
              </TableCell>
              <TableCell>{r.agent}</TableCell>
              <TableCell>{r.outcome}</TableCell>
              <TableCell align="trailing">{r.cost}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * A table reads from the right: the held column is the rightmost, text
 * starts at a cell's right edge and a trailing figure ends at its left. The
 * held column stays put as the rest scrolls — `scrollLeft` runs negative in
 * right-to-left — and its shadow then falls to its left, past its end.
 */
export const ATableReadsFromTheRight: Story = {
  render: () => <RunsTable />,
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector(
      '.ion-table-container',
    ) as HTMLElement;
    const row = canvasElement.querySelector('tbody tr')!;
    const [toggle, run, , , cost] = [...row.children] as HTMLElement[];
    // Flush with the region's right edge, inside its border.
    await expect(
      Math.abs(box(toggle).right - box(region).right),
    ).toBeLessThanOrEqual(1);
    await expect(box(run).right).toBeLessThanOrEqual(box(toggle).left + 1);
    // Start is the right; a trailing figure ends at the left. Measured on the
    // Agent header, which is narrower than its column, so alignment shows.
    const agent = canvasElement.querySelectorAll('thead th')[2] as HTMLElement;
    await expect(agent.textContent).toBe('Agent');
    const range = document.createRange();
    // The words themselves, not the header's inner box, which fills the cell.
    const word = document
      .createTreeWalker(agent, NodeFilter.SHOW_TEXT)
      .nextNode()!;
    range.selectNodeContents(word);
    await expect(
      box(agent).width - range.getBoundingClientRect().width,
    ).toBeGreaterThan(40);
    const words = range.getBoundingClientRect();
    await expect(box(agent).right - words.right).toBeLessThan(
      words.left - box(agent).left,
    );
    range.selectNodeContents(cost.firstChild as Text);
    await expect(
      Math.round(range.getBoundingClientRect().left - box(cost).left),
    ).toBe(Math.round(parseFloat(getComputedStyle(cost).paddingInlineEnd)));

    const held = Math.round(box(run).right);
    region.scrollLeft = -160;
    region.dispatchEvent(new Event('scroll'));
    await settle();
    await expect(region.scrollLeft).toBeLessThan(0);
    await expect(Math.round(box(run).right)).toBe(held);
    await expect(region.dataset.scrolledX).toBe('true');
    const edge = row.querySelector('[data-sticky-edge]') as HTMLElement;
    await expect(getComputedStyle(edge).clipPath).toBe(
      'inset(0px 0px 0px -16px)',
    );
  },
};

/** A row's closed chevron points the reading direction — left — and open, down. */
export const TheExpanderPointsTheReadingDirection: Story = {
  render: () => <RunsTable />,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: `Details for ${RUNS[0].id}`,
    });
    const svg = button.querySelector('svg')!;
    await expect(Math.abs(turn(svg))).toBe(180);
    await userEvent.click(button);
    await settle();
    await new Promise((r) => setTimeout(r, 400));
    await expect(turn(svg)).toBe(90);
  },
};

/**
 * An avatar's status sits at its end — the bottom left — and a group
 * overlaps leftward, each face tucked under the one before it.
 */
export const AvatarsMirror: Story = {
  render: () => (
    <div>
      <Avatar
        initials="AR"
        alt="Ada Reyes"
        bottomIndicator="success"
        bottomIndicatorLabel="Online"
        data-a="solo"
      />
      <AvatarGroup>
        <Avatar initials="KR" alt="K R" />
        <Avatar initials="AB" alt="A B" />
      </AvatarGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const solo = canvasElement.querySelector('.ion-avatar')!;
    const dot = solo.querySelector('.ion-avatar__indicator')!;
    await expect(Math.round(box(dot).left)).toBe(Math.round(box(solo).left));
    const [a, b] = canvasElement.querySelectorAll('.ion-avatar-group > *');
    await expect(box(b).left).toBeLessThan(box(a).left);
    await expect(box(b).right).toBeGreaterThan(box(a).left);
  },
};

/** On, a toggle's thumb is at its end: the left. */
export const AToggleTurnsOnToTheLeft: Story = {
  render: () => <Toggle defaultChecked>Pause runs overnight</Toggle>,
  play: async ({ canvasElement }) => {
    const track = canvasElement.querySelector('.ion-toggle__track')!;
    const thumb = canvasElement.querySelector('.ion-toggle__thumb')!;
    await expect(box(thumb).left - box(track).left).toBeLessThan(
      box(track).right - box(thumb).right,
    );
  },
};

/** The line joining steps, and the one joining history, run down the right. */
export const LinesRunDownTheRight: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Stepper label="Setup" orientation="vertical">
        <StepperStep status="complete">Account</StepperStep>
        <StepperStep status="incomplete">Agent</StepperStep>
      </Stepper>
      <Timeline aria-label="History">
        <TimelineItem
          title="Paused"
          timestamp="2026-09-27T10:00:00Z"
          locale="en-GB"
          timeZone="UTC"
        />
        <TimelineItem
          title="Created"
          timestamp="2026-09-20T10:00:00Z"
          locale="en-GB"
          timeZone="UTC"
        />
      </Timeline>
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const sel of [
      '.ion-stepper--vertical .ion-stepper__step:not(:last-child)',
      '.ion-timeline__item:not(:last-child)',
    ]) {
      const el = canvasElement.querySelector(sel);
      if (!el) throw new Error(`nothing matches ${sel}`);
      const line = getComputedStyle(
        el,
        el.classList.contains('ion-stepper__step') ? '::after' : '::before',
      );
      // Placed from the right: the offset from the right edge is the small
      // one, under the marker, and the rest of the width is to its left.
      await expect(parseFloat(line.right)).toBeLessThan(parseFloat(line.left));
    }
  },
};

/** Previous is on the right and points right; next points left. */
export const PageArrowsTurnRound: Story = {
  render: () => (
    <Pagination
      page={2}
      onPageChange={() => {}}
      pageCount={6}
      aria-label="Runs pages"
    />
  ),
  play: async ({ canvasElement }) => {
    const icons = canvasElement.querySelectorAll('.ion-pagination__icon');
    await expect(icons.length).toBeGreaterThan(0);
    for (const i of icons)
      await expect(new DOMMatrix(getComputedStyle(i).transform).a).toBe(-1);
  },
};

/** ← moves forward along a toolbar: react-aria follows the locale. */
export const ArrowKeysFollowTheLocale: Story = {
  render: () => (
    <Toolbar aria-label="Run actions">
      <Button>Retry</Button>
      <Button>Cancel</Button>
    </Toolbar>
  ),
  play: async ({ canvasElement }) => {
    const [retry, cancel] = within(canvasElement).getAllByRole('button');
    await expect(box(retry).left).toBeGreaterThan(box(cancel).left);
    retry.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(cancel).toHaveFocus();
  },
};

/**
 * A tooltip placed to the right still points at its trigger: its arrow is
 * physical on purpose, on the side react-aria resolved, and hangs off the
 * bubble's left edge back toward the button.
 */
export const AnArrowStillPointsAtItsTrigger: Story = {
  render: () => (
    // In the middle, so there is room on the right and nothing flips.
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Tooltip label="Retries the run" placement="right" delay={0}>
        <Button>Retry</Button>
      </Tooltip>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'Retry',
    });
    button.focus();
    const tip = await within(document.body).findByRole('tooltip');
    const bubble = tip.closest('.ion-tooltip__bubble') ?? tip;
    const arrow = document.querySelector('.ion-tooltip__arrow')!;
    await expect(box(bubble).left).toBeGreaterThan(box(button).right);
    await expect(box(arrow).left).toBeLessThan(box(bubble).left);
    button.blur();
  },
};

/** Focused, the skip link is at the top right. */
export const TheSkipLinkIsAtTheTopRight: Story = {
  render: () => (
    <div>
      <SkipLink target="main" />
      <main id="main">Content</main>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const a = within(canvasElement).getByRole('link');
    a.focus();
    await expect(Math.round(window.innerWidth - box(a).right)).toBe(8);
    a.blur();
  },
};

/**
 * A closed section's chevron points left; open, it points down. So does an
 * open item's — the item marks itself open with one class, and the
 * right-to-left rule must not outweigh it.
 */
export const ASidebarSectionPointsTheReadingDirection: Story = {
  render: () => (
    <Sidebar label="Workspace">
      <SidebarSection title="Favorites" isCollapsible defaultExpanded={false}>
        <SidebarItem label="Roadmap" href="#roadmap" />
      </SidebarSection>
      <SidebarSection>
        <SidebarItem label="Runs" defaultExpanded>
          <SidebarItem label="Failed" href="#failed" />
        </SidebarItem>
      </SidebarSection>
    </Sidebar>
  ),
  play: async ({ canvasElement }) => {
    const [chevron, item] = canvasElement.querySelectorAll(
      '.ion-sidebar__chevron',
    );
    await expect(item).toHaveClass('ion-sidebar__chevron--expanded');
    await expect(turn(item)).toBe(90);
    await expect(Math.abs(turn(chevron))).toBe(180);
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: /Favorites/ }),
    );
    await new Promise((r) => setTimeout(r, 400));
    await expect(turn(chevron)).toBe(90);
  },
};

/** The calendar's previous month is on the right and points there. */
export const CalendarArrowsTurnRound: Story = {
  render: () => <DatePicker label="Run date" />,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Open calendar' }),
    );
    // Named in Hebrew under this locale, so found by their place instead:
    // previous first in the DOM, next last.
    await within(document.body).findByRole('dialog');
    const buttons = [
      ...document.querySelectorAll<HTMLElement>('.ion-calendar__nav-button'),
    ];
    await expect(buttons).toHaveLength(2);
    const [prev, next] = buttons;
    await expect(box(prev).left).toBeGreaterThan(box(next).left);
    for (const b of [prev, next])
      await expect(
        new DOMMatrix(getComputedStyle(b.querySelector('svg')!).transform).a,
      ).toBe(-1);
    await userEvent.keyboard('{Escape}');
  },
};

/**
 * Focus on a cell half under the held column — at the right, here — scrolls
 * it clear, as it does from the left in left-to-right.
 */
export const FocusIsNotHiddenUnderTheHeldColumn: Story = {
  render: () => <RunsTable />,
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector(
      '.ion-table-container',
    ) as HTMLElement;
    const cells = canvasElement.querySelector('tbody tr')!.children;
    const agent = cells[2] as HTMLElement;
    const held = cells[1] as HTMLElement;
    // Scrolled so the Agent cell sits half under the held Run column: right
    // to left, a more negative scrollLeft moves the content rightward.
    region.scrollLeft -=
      box(held).left + box(agent).width / 2 - box(agent).right;
    await settle();
    await expect(box(agent).right).toBeGreaterThan(box(held).left + 1);
    agent.tabIndex = -1;
    agent.focus();
    await settle();
    await expect(box(agent).right).toBeLessThanOrEqual(box(held).left + 1);
  },
};
