import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { commands, userEvent } from 'vitest/browser';
import {
  Breadcrumb,
  BreadcrumbItem,
  Calendar,
  Citation,
  List,
  Menu,
  MenuItem,
  NumberInput,
  RadioGroup,
  SearchField,
  SelectableTile,
  SplitPane,
  Toggletip,
} from 'ionbase-ui';

/**
 * The rule for a highlight, from motion-system.md §3: **the pointer's hover
 * fades; a highlight the keys move snaps.** Hover is `base` + `out` like any
 * state change. A row the arrow keys move through, a focus indicator and a
 * chosen day are ones someone is waiting on, so they arrive at once — as a
 * press resolves on `fast`.
 */
const meta: Meta = {
  title: 'Foundations/Motion',
  parameters: {
    docs: {
      description: {
        component:
          "**The pointer's hover fades; a highlight the keys move snaps.** Hover is a state change, so it takes `base` + `out`. A row the arrow keys move through — Menu, Combobox, MultiSelect, CommandPalette — a focus indicator and a chosen day are ones someone is waiting on, and they arrive at once.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/** The properties still transitioning on an element. */
const transitioning = (el: Element) =>
  el
    .getAnimations()
    .filter((a): a is CSSTransition => a instanceof CSSTransition)
    .map((a) => a.transitionProperty);

const frame = () => new Promise((r) => requestAnimationFrame(r));

/** Every control that used to snap on hover, and the property that fades. */
export const TheHoverFades: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 24, width: 640 }}>
      <NumberInput label="Seats" defaultValue={3} />
      <SearchField aria-label="Search runs" defaultValue="refund" />
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Toggletip aria-label="About retention">Kept for 30 days.</Toggletip>
        <span>
          Totals
          <Citation index={1} source="Q3 invoice archive" href="#q3" />
        </span>
      </div>
      <Breadcrumb>
        <BreadcrumbItem href="#home">Home</BreadcrumbItem>
        <BreadcrumbItem isCurrent>Runs</BreadcrumbItem>
      </Breadcrumb>
      <RadioGroup label="Plan" defaultValue="team">
        <SelectableTile value="team" title="Team" />
        <SelectableTile value="scale" title="Scale" />
      </RadioGroup>
      <List
        aria-label="Runs"
        items={[
          { id: 'a', label: 'Invoice reconciliation' },
          { id: 'b', label: 'Refund replies' },
        ]}
        onAction={() => {}}
      />
      <Calendar label="Resume on" defaultFocusedValue="2026-10-01" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const q = (s: string) => canvasElement.querySelector<HTMLElement>(s)!;
    const cases: [string, HTMLElement, string][] = [
      ['NumberInput step', q('.ion-number-input__step'), 'background-color'],
      ['SearchField clear', q('.ion-search-field__clear'), 'background-color'],
      ['Toggletip', q('.ion-toggletip__button'), 'background-color'],
      ['Citation', q('a.ion-citation'), 'background-color'],
      ['Breadcrumb', canvas.getByRole('link', { name: 'Home' }), 'color'],
      [
        'SelectableTile',
        q('.ion-tile:not([data-selected])'),
        'background-color',
      ],
      ['List row', q('.ion-list__row'), 'background-color'],
      ['Calendar nav', q('.ion-calendar__nav-button'), 'background-color'],
      [
        'Calendar day',
        q('.ion-calendar__day:not([data-selected]):not([hidden])'),
        'background-color',
      ],
    ];
    for (const [name, el, property] of cases) {
      await userEvent.hover(el);
      await frame();
      await expect({ name, running: transitioning(el) }).toEqual({
        name,
        running: expect.arrayContaining([property]),
      });
      await commands.parkMouse();
    }
  },
};

/** Menu's highlight follows the arrow keys, so it snaps — hover included. */
export const AKeyMovedHighlightSnaps: Story = {
  render: () => (
    <Menu aria-label="Row actions" style={{ width: 240 }}>
      <MenuItem key="rename">Rename</MenuItem>
      <MenuItem key="duplicate">Duplicate</MenuItem>
    </Menu>
  ),
  play: async ({ canvasElement }) => {
    const [first, second] = within(canvasElement).getAllByRole('menuitem');
    first.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(second).toHaveAttribute('data-focused', 'true');
    await frame();
    await expect(transitioning(second)).not.toContain('background-color');
    await expect(transitioning(first)).not.toContain('background-color');
  },
};

/** Choosing a day fills it at once; only the pointer's hover fades. */
export const ChoosingADaySnaps: Story = {
  render: () => <Calendar label="Resume on" defaultFocusedValue="2026-10-01" />,
  play: async ({ canvasElement }) => {
    const day = within(canvasElement).getByRole('button', {
      name: /October 8/,
    });
    await userEvent.click(day);
    await expect(day).toHaveAttribute('data-selected');
    await frame();
    await expect(transitioning(day)).not.toContain('background-color');
  },
};

/** The divider's colour is its focus indicator: focus snaps, hover fades. */
export const TheDividerFocusSnaps: Story = {
  render: () => (
    <div style={{ width: 600, height: 160 }}>
      <SplitPane
        label="Resize the request"
        start={<p>Request</p>}
        end={<p>Response</p>}
        collapse="never"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const sep = within(canvasElement).getByRole('separator');
    await userEvent.hover(sep);
    await frame();
    await expect(transitioning(sep)).toContain('background-color');
    await commands.parkMouse();
    await new Promise((r) => setTimeout(r, 300));
    sep.focus({ focusVisible: true } as FocusOptions);
    await userEvent.keyboard('{ArrowRight}');
    await frame();
    await expect(transitioning(sep)).not.toContain('background-color');
  },
};
