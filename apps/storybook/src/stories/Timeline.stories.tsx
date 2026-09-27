import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon, Timeline, TimelineItem } from 'ionbase-ui';
import { Pause } from 'ionbase-icons/icons/pause';
import { Pencil } from 'ionbase-icons/icons/pencil';

const AT = {
  paused: new Date('2026-09-27T14:05:00Z'),
  purpose: new Date('2026-09-26T09:30:00Z'),
  created: new Date('2026-09-12T16:45:00Z'),
};

function History(props: { width?: number; labelled?: boolean }) {
  return (
    <div style={{ width: props.width ?? 480 }}>
      <Timeline aria-label="History">
        <TimelineItem
          title="Paused the agent"
          actor="Ada Reyes"
          timestamp={AT.paused}
          locale="en-GB"
          timeZone="UTC"
          icon={<Icon as={Pause} size="sm" />}
        />
        <TimelineItem
          title="Changed the purpose"
          actor="Lin Zhou"
          timestamp={AT.purpose}
          locale="en-GB"
          timeZone="UTC"
          icon={<Icon as={Pencil} size="sm" />}
        >
          From “Matches invoices” to “Matches supplier invoices to purchase
          orders”.
        </TimelineItem>
        <TimelineItem
          title="Created the agent"
          actor="Ada Reyes"
          timestamp={AT.created}
          locale="en-GB"
          timeZone="UTC"
        />
      </Timeline>
    </div>
  );
}

const meta: Meta<typeof Timeline> = {
  title: 'Components/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "What happened to a record, in order — an audit log, a record's history. An ordered list: each event is what happened, who did it and when, in a real `<time>`, then its detail. History only: no status and no announcements; an agent run is AgentActivity.",
      },
    },
  },
  render: () => <History />,
};

export default meta;
type Story = StoryObj<typeof Timeline>;

export const RecordHistory: Story = {};

// ------------------------------------------------------------------ tests

const items = (el: HTMLElement) => [
  ...el.querySelectorAll<HTMLElement>('.ion-timeline__item'),
];

/** An ordered list, named, with one item per event. */
export const ItIsANamedOrderedList: Story = {
  play: async ({ canvas }) => {
    const list = canvas.getByRole('list', { name: 'History' });
    await expect(list.tagName).toBe('OL');
    await expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  },
};

/**
 * Each event reads what happened, who, when — then the detail. The dot
 * between actor and time is not read.
 */
export const EachEventReadsInOrder: Story = {
  play: async ({ canvasElement }) => {
    const second = items(canvasElement)[1];
    const read = [...second.querySelectorAll<HTMLElement>('*')]
      .filter(
        (el) => el.children.length === 0 && !el.closest('[aria-hidden="true"]'),
      )
      .map((el) => el.textContent?.trim())
      .filter(Boolean);
    await expect(read).toEqual([
      'Changed the purpose',
      'Lin Zhou',
      '26 Sept 2026, 09:30',
      'From “Matches invoices” to “Matches supplier invoices to purchase orders”.',
    ]);
  },
};

/** The time is a `<time>` holding the exact instant, formatted for the locale and zone given. */
export const TheTimeIsARealTime: Story = {
  play: async ({ canvasElement }) => {
    const time = items(canvasElement)[0].querySelector('time')!;
    await expect(time).toHaveAttribute('datetime', '2026-09-27T14:05:00.000Z');
    await expect(time).toHaveTextContent('27 Sept 2026, 14:05');
  },
};

/** A relative label changes the words, never the instant. */
export const ARelativeLabelKeepsTheInstant: Story = {
  render: () => (
    <Timeline aria-label="History">
      <TimelineItem
        title="Paused the agent"
        timestamp="2026-09-27T14:05:00Z"
        timestampLabel="2 hours ago"
      />
    </Timeline>
  ),
  play: async ({ canvasElement }) => {
    const time = canvasElement.querySelector('time')!;
    await expect(time).toHaveTextContent('2 hours ago');
    await expect(time).toHaveAttribute('datetime', '2026-09-27T14:05:00.000Z');
  },
};

/** With no actor there is no separator — the time follows the title directly. */
export const NoActorNoSeparator: Story = {
  render: () => (
    <Timeline aria-label="History">
      <TimelineItem title="Run failed" timestamp={AT.paused} />
    </Timeline>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('.ion-timeline__separator'),
    ).toBeNull();
    await expect(
      canvasElement.querySelector('.ion-timeline__actor'),
    ).toBeNull();
  },
};

/** The markers and icons are decoration, hidden from assistive tech. */
export const TheMarkersAreHidden: Story = {
  play: async ({ canvasElement }) => {
    const markers = [
      ...canvasElement.querySelectorAll('.ion-timeline__marker'),
    ];
    await expect(markers).toHaveLength(3);
    for (const m of markers)
      await expect(m).toHaveAttribute('aria-hidden', 'true');
    await expect(markers[0].querySelector('svg')).not.toBeNull();
    await expect(
      canvasElement.querySelector('.ion-timeline__separator'),
    ).toHaveAttribute('aria-hidden', 'true');
  },
};

/**
 * The line joins each marker to the next, and stops at the last event: the
 * history ends there.
 */
export const TheLineEndsAtTheLastEvent: Story = {
  play: async ({ canvasElement }) => {
    const [first, second, last] = items(canvasElement);
    const line = (el: HTMLElement) => getComputedStyle(el, '::before');
    await expect(line(first).content).not.toBe('none');
    await expect(line(last).content).toBe('none');
    // It reaches the next marker: from under this one to the next one's top.
    const firstMarker = first.querySelector('.ion-timeline__marker')!;
    const nextMarker = second.querySelector('.ion-timeline__marker')!;
    const top = firstMarker.getBoundingClientRect().bottom;
    const bottom = nextMarker.getBoundingClientRect().top;
    const height = parseFloat(line(first).height);
    await expect(Math.abs(height - (bottom - top))).toBeLessThanOrEqual(1);
  },
};

/** An icon and a dot sit in the same column, so the line runs straight. */
export const MarkersShareOneColumn: Story = {
  play: async ({ canvasElement }) => {
    const centres = [
      ...canvasElement.querySelectorAll('.ion-timeline__marker'),
    ].map((m) => {
      const r = m.getBoundingClientRect();
      return Math.round(r.left + r.width / 2);
    });
    await expect(new Set(centres).size).toBe(1);
  },
};

/** A long title or a long token wraps inside the column, never sideways. */
export const LongTextWraps: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <Timeline aria-label="History">
        <TimelineItem
          title="Connected https://drive.example.com/finance/policies/expenses/2026/q3/"
          actor="Kwame Mensah"
          timestamp={AT.created}
        />
      </Timeline>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('.ion-timeline') as HTMLElement;
    await expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    const title = canvasElement.querySelector(
      '.ion-timeline__title',
    ) as HTMLElement;
    await expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(
      list.getBoundingClientRect().right,
    );
  },
};

/** The title reads as the event's lead: heavier than the time under it. */
export const TheTitleLeads: Story = {
  play: async ({ canvasElement }) => {
    const first = items(canvasElement)[0];
    const title = getComputedStyle(
      first.querySelector('.ion-timeline__title')!,
    );
    const meta = getComputedStyle(first.querySelector('.ion-timeline__meta')!);
    await expect(Number(title.fontWeight)).toBeGreaterThan(
      Number(meta.fontWeight),
    );
    await expect(parseFloat(meta.fontSize)).toBeLessThan(
      parseFloat(title.fontSize),
    );
  },
};

/** It renders on a server: no hooks, no effects, the same markup. */
export const ItRendersOnAServer: Story = {
  play: async () => {
    const html = renderToStaticMarkup(<History />);
    await expect(html).toContain('<ol');
    await expect(html).toMatch(/datetime="2026-09-27T14:05:00\.000Z"/i);
    await expect(html).toContain('27 Sept 2026, 14:05');
  },
};
