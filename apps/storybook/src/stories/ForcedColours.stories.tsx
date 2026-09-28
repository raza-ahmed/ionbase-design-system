import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { commands } from 'vitest/browser';
import {
  AvatarGradient,
  Badge,
  Button,
  ChartLegend,
  Checkbox,
  Divider,
  DualListbox,
  Logo,
  Pagination,
  Radio,
  RadioGroup,
  ScrollProgress,
  StreamingText,
  TabItem,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  ThemeZone,
  Toggle,
  Tooltip,
  TreeGrid,
} from 'ionbase-ui';

/**
 * Windows High Contrast, emulated. Chromium remaps every colour to the system
 * palette, as the real mode does, and computed styles report the remapped
 * values — so each story here turns forced colours on and asserts what a
 * high-contrast user sees: that a state still shows, that a shape still has
 * an edge.
 *
 * These run under the test runner, which owns the emulation. In the Storybook
 * UI, turn on "Emulate CSS media feature forced-colors" in DevTools to see
 * the same thing.
 */
const meta: Meta = {
  title: 'Foundations/Forced colours',
  parameters: {
    docs: {
      description: {
        component:
          'Forced colours — Windows High Contrast — throw the token palette away: backgrounds become the page, borders and text the system colours, shadows disappear. Every component that shows a state or a shape with a fill has a `@media (forced-colors: active)` rule that re-draws it in system colours. These stories check each one with the mode emulated.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * Forced colours on, and every CSS transition it set off run to its end.
 * Switching the mode mid-story animates a transitioning property from its
 * old colour to its forced one — a real high-contrast user starts in the mode
 * and never sees that, but a reading taken straight away catches it halfway.
 * Only transitions: a spinner's endless rotation never finishes.
 */
const forced = async () => {
  await commands.forcedColors(true);
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r)),
  );
  await Promise.all(
    document
      .getAnimations()
      .filter((a) => a instanceof CSSTransition)
      .map((a) => a.finished.catch(() => {})),
  );
};

/** A system colour as this palette paints it. */
const system = (name: string) => {
  const el = document.createElement('span');
  el.style.color = name;
  document.body.append(el);
  const c = getComputedStyle(el).color;
  el.remove();
  return c;
};
const css = (el: Element | null, prop: string, pseudo?: string) =>
  getComputedStyle(el!, pseudo).getPropertyValue(prop);

/** The palette really is forced — the check every story below rests on. */
export const TheModeIsOn: Story = {
  render: () => <p>High contrast</p>,
  play: async () => {
    await forced();
    await expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    // Canvas and CanvasText differ, or nothing below means anything.
    await expect(system('Canvas')).not.toBe(system('CanvasText'));
  },
};

/**
 * An underline tab is chosen by its line alone. A transparent border is
 * drawn in the text colour in forced colours, so every tab used to wear the
 * selected one's line.
 */
export const TheChosenUnderlineTabShows: Story = {
  render: () => (
    <Tabs aria-label="Views" type="underline" defaultSelectedKey="a">
      <TabItem key="a" title="Run volume">
        A
      </TabItem>
      <TabItem key="b" title="Success rate">
        B
      </TabItem>
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    await forced();
    const [chosen, other] = within(canvasElement).getAllByRole('tab');
    await expect(css(chosen, 'border-bottom-color')).toBe(system('Highlight'));
    await expect(css(other, 'border-bottom-color')).toBe(system('Canvas'));
  },
};

/** A divider is a background, which forced colours paint as the page. */
export const ADividerStaysDrawn: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, height: 40 }}>
      <Divider data-d="h" />
      <Divider orientation="vertical" data-d="v" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await forced();
    for (const d of canvasElement.querySelectorAll('.ion-divider'))
      await expect(css(d, 'background-color')).toBe(system('CanvasText'));
  },
};

/**
 * The chart's own marks keep their colours — SVG is not remapped — so the
 * legend's swatches must keep theirs, or the key is what disappears.
 */
export const TheLegendKeepsItsColours: Story = {
  render: () => (
    <ChartLegend
      items={[
        { label: 'Completed', series: 1 },
        { label: 'Failed', series: 2 },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    await forced();
    const [a, b] = canvasElement.querySelectorAll('.ion-chart-swatch');
    const [ca, cb] = [a, b].map((s) => css(s, 'background-color'));
    await expect(ca).not.toBe(system('Canvas'));
    await expect(ca).not.toBe(cb);
  },
};

/** The gradient disc is a background image, which forced colours drop. */
export const AGradientAvatarKeepsItsCircle: Story = {
  render: () => <AvatarGradient initials="AB" alt="Ada Byron" />,
  play: async ({ canvasElement }) => {
    await forced();
    const disc = canvasElement.querySelector('.ion-avatar-gradient');
    await expect(css(disc, 'outline-style')).toBe('solid');
    await expect(css(disc, 'outline-color')).toBe(system('CanvasText'));
  },
};

/**
 * Disabled and on is still on. A checked disabled checkbox, radio and toggle
 * used to be painted as the page, the same as an unchecked one.
 */
export const DisabledStillShowsOn: Story = {
  render: () => (
    <div>
      <Checkbox isDisabled isSelected data-c="on">
        On
      </Checkbox>
      <Checkbox isDisabled data-c="off">
        Off
      </Checkbox>
      <Toggle isDisabled isSelected data-t="on">
        On
      </Toggle>
      <Toggle isDisabled data-t="off">
        Off
      </Toggle>
      <RadioGroup label="Plan" isDisabled defaultValue="a">
        <Radio value="a">On</Radio>
        <Radio value="b">Off</Radio>
      </RadioGroup>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await forced();
    const [cOn, cOff] = canvasElement.querySelectorAll(
      '.ion-checkbox__indicator',
    );
    await expect(css(cOn, 'background-color')).toBe(system('GrayText'));
    await expect(css(cOff, 'background-color')).toBe(system('Canvas'));
    await expect(css(cOn.querySelector('.ion-checkbox__mark'), 'color')).toBe(
      system('Canvas'),
    );

    const [tOn, tOff] = canvasElement.querySelectorAll('.ion-toggle__track');
    await expect(css(tOn, 'background-color')).toBe(system('GrayText'));
    await expect(css(tOff, 'background-color')).toBe(system('Canvas'));

    const [dOn] = canvasElement.querySelectorAll('.ion-radio__dot');
    await expect(css(dOn, 'background-color')).toBe(system('GrayText'));
  },
};

/** The current page is a tint, which forced colours paint as the page. */
export const TheCurrentPageShows: Story = {
  render: () => (
    <Pagination
      aria-label="Runs pages"
      page={2}
      pageCount={4}
      onPageChange={() => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    await forced();
    const current = canvasElement.querySelector(
      '.ion-pagination__item[data-selected]',
    );
    await expect(current).not.toBeNull();
    await expect(css(current, 'background-color')).toBe(system('Highlight'));
    const other = canvasElement.querySelector(
      '.ion-pagination__item:not([data-selected])',
    );
    await expect(css(other, 'background-color')).not.toBe(system('Highlight'));
  },
};

/** The rail's ticks are backgrounds; without a rule only the percentage stayed. */
export const TheScrollRailStaysDrawn: Story = {
  render: () => (
    <ScrollProgress
      progress={32}
      activeId="b"
      sections={[
        { id: 'a', label: 'Introduction' },
        { id: 'b', label: 'Getting started' },
        { id: 'c', label: 'Usage' },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    await forced();
    const ticks = [
      ...canvasElement.querySelectorAll('.ion-scroll-progress__tick'),
    ];
    await expect(ticks.length).toBeGreaterThan(1);
    const active = ticks.find((t) =>
      t.classList.contains('ion-scroll-progress__tick--active'),
    );
    await expect(css(active!, 'background-color')).toBe(system('Highlight'));
    const rest = ticks.find((t) => t !== active)!;
    await expect(css(rest, 'background-color')).toBe(system('CanvasText'));
  },
};

/** The cursor that says an answer is still being written stays. */
export const TheStreamingCursorStays: Story = {
  render: () => (
    <StreamingText isStreaming>Three are still unpaid</StreamingText>
  ),
  play: async ({ canvasElement }) => {
    await forced();
    const cursor = canvasElement.querySelector('.ion-streaming-text__cursor');
    await expect(cursor).not.toBeNull();
    await expect(css(cursor, 'background-color')).toBe(system('CanvasText'));
  },
};

/** A tooltip's bubble is a fill with no border; forced colours need an edge. */
export const ATooltipHasAnEdge: Story = {
  render: () => (
    <div style={{ padding: 48 }}>
      <Tooltip label="Retries the run" delay={0}>
        <Button>Retry</Button>
      </Tooltip>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await forced();
    within(canvasElement).getByRole('button').focus();
    const tip = await within(document.body).findByRole('tooltip');
    // The role is on the tooltip; the bubble is the box inside it.
    const bubble =
      tip.querySelector('.ion-tooltip__bubble') ??
      tip.closest('.ion-tooltip__bubble');
    await expect(bubble).not.toBeNull();
    await expect(css(bubble, 'border-top-style')).toBe('solid');
    await expect(css(bubble, 'border-top-color')).toBe(system('CanvasText'));
    (document.activeElement as HTMLElement).blur();
  },
};

/**
 * Chromium does not remap colour inside an SVG, so a `color` set on the <svg>
 * itself survives: the logo in a dark zone kept its near-white token on a
 * page forced to white. It inherits the forced colour instead — and so does
 * a badge's icon.
 */
export const IconsTakeTheForcedColour: Story = {
  render: () => (
    <div>
      <ThemeZone theme="dark" data-z>
        <Logo size="sm" wordmark="vector" />
      </ThemeZone>
      <Badge intent="success" icon={<svg data-icon viewBox="0 0 8 8" />}>
        Paid
      </Badge>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await forced();
    const zone = canvasElement.querySelector('[data-z]')!;
    for (const svg of zone.querySelectorAll('.ion-logo svg'))
      await expect(css(svg, 'color')).toBe(css(zone, 'color'));
    const badge = canvasElement.querySelector('.ion-badge')!;
    const icon = badge.querySelector('svg');
    if (icon) await expect(css(icon, 'color')).toBe(css(badge, 'color'));
  },
};

/** A selected row is Highlight, not the light theme's tint left in place. */
export const ASelectedRowIsHighlight: Story = {
  render: () => (
    <Table aria-label="Runs">
      <TableBody>
        <TableRow isSelected>
          <TableCell>run_4821</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>run_4822</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    await forced();
    const [chosen] = canvasElement.querySelectorAll('tbody tr');
    await expect(css(chosen, 'background-color')).toBe(system('Highlight'));
    await expect(css(chosen, 'color')).toBe(system('HighlightText'));
  },
};

/**
 * A picked option is a background, which forced colours paint as the page,
 * so a DualListbox would lose which options are about to move. It keeps an
 * outline; an unpicked option has none.
 */
export const APickedOptionKeepsAnOutline: Story = {
  render: () => (
    <div style={{ width: 640 }}>
      <DualListbox
        label="Approvers"
        options={[
          { value: 'ada', label: 'Ada Reyes' },
          { value: 'kwame', label: 'Kwame Mensah' },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const available = c.getByRole('listbox', { name: 'Approvers Available' });
    available.focus();
    const [picked, other] = within(available).getAllByRole('option');
    // Arriving in the list picks its first option.
    await waitFor(() =>
      expect(picked).toHaveAttribute('aria-selected', 'true'),
    );
    await forced();
    await expect(css(picked, 'outline-style')).toBe('solid');
    await expect(css(other, 'outline-style')).toBe('none');
  },
};

/**
 * A selected tree-grid row is Highlight, and it keeps its own colours to
 * stay so. On it the focus ring was blue on blue, the chevron grey, and the
 * checked box a Highlight square on a Highlight row: each takes the row's
 * text colour instead.
 */
export const ASelectedTreeGridRowKeepsItsMarks: Story = {
  render: () => (
    <div style={{ width: 480 }}>
      <TreeGrid
        aria-label="Spend"
        selectionMode="multiple"
        defaultSelectedKeys={['support']}
        columns={[{ id: 'name', header: 'Agent', cell: (r) => r.id }]}
        items={[{ id: 'support', children: [{ id: 'refunds' }] }]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const row = c.getByRole('row', { name: 'support' });
    // Tabbing in lands on the selected row, with a visible ring.
    await userEvent.tab();
    await waitFor(() => expect(document.activeElement).toBe(row));
    await forced();
    await expect(css(row, 'background-color')).toBe(system('Highlight'));
    await expect(css(row, 'outline-color')).toBe(system('HighlightText'));
    await expect(css(within(row).getByRole('button'), 'color')).toBe(
      system('HighlightText'),
    );
    const indicator = row.querySelector('.ion-checkbox__indicator');
    await expect(css(indicator, 'border-top-color')).toBe(
      system('HighlightText'),
    );
    await expect(css(indicator, 'background-color')).toBe(system('Highlight'));
  },
};
