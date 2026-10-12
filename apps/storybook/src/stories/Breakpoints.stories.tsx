import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import {
  StatusIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from 'ionbase-ui';
import { tokenValues } from 'ionbase-ui/tokens-js';

/*
 * The breakpoints are the media queries the token pipeline writes around each
 * mode's values, so they are read from those files rather than restated.
 */
import tabletCss from '../../../../packages/ionbase-ui/src/styles/tokens/breakpoint-tablet.css?raw';
import mobileCss from '../../../../packages/ionbase-ui/src/styles/tokens/breakpoint-mobile.css?raw';

import { Section, TokenName, Value } from './foundations-kit.js';

const meta: Meta = {
  title: 'Foundations/Breakpoints',
  parameters: {
    docs: {
      description: {
        component:
          'Three modes of the Breakpoint collection: Desktop, Tablet and Mobile. The grid and section tokens change value at each; a component reading them adapts without a media query of its own. Resize the preview to watch the current mode change.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const maxWidth = (css: string) =>
  Number(css.match(/@media \(max-width: (\d+)px\)/)![1]);
const TABLET_MAX = maxWidth(tabletCss);
const MOBILE_MAX = maxWidth(mobileCss);

type Mode = 'Desktop' | 'Tablet' | 'Mobile';
const MODES: { mode: Mode; range: string; query: string }[] = [
  {
    mode: 'Desktop',
    range: `${TABLET_MAX + 1}px and wider`,
    query: `(min-width: ${TABLET_MAX + 1}px)`,
  },
  {
    mode: 'Tablet',
    range: `${MOBILE_MAX + 1}–${TABLET_MAX}px`,
    query: `(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`,
  },
  {
    mode: 'Mobile',
    range: `${MOBILE_MAX}px and narrower`,
    query: `(max-width: ${MOBILE_MAX}px)`,
  },
];

/** The tokens whose value depends on the mode, from the Breakpoint collection. */
const values = tokenValues as unknown as Record<
  string,
  Partial<Record<Mode, number>>
>;
const GRID = Object.keys(values).filter((n) =>
  /^(grid|container|section)\//.test(n),
);

/** 9999 is how the container says "no maximum". */
const show = (n: number | undefined, name: string) =>
  n === undefined
    ? '—'
    : name === 'grid/columns'
      ? String(n)
      : n >= 9999
        ? 'none'
        : `${n}px`;

function useMode(): Mode | null {
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => {
    const lists = MODES.map((m) => ({
      mode: m.mode,
      list: window.matchMedia(m.query),
    }));
    const update = () =>
      setMode(lists.find((l) => l.list.matches)?.mode ?? null);
    update();
    for (const l of lists) l.list.addEventListener('change', update);
    return () => {
      for (const l of lists) l.list.removeEventListener('change', update);
    };
  }, []);
  return mode;
}

function BreakpointTable() {
  const current = useMode();
  return (
    <div style={{ maxInlineSize: '64rem' }}>
      <Section
        title="Modes"
        description="Desktop-first: Tablet and Mobile override Desktop's values below their width. Components with a breakpoint of their own, such as Header, say so in their contract."
      >
        <Table aria-label="Breakpoint modes" density="compact">
          <TableHead>
            <TableRow>
              <TableCell header scope="col">
                Mode
              </TableCell>
              <TableCell header scope="col">
                Viewport width
              </TableCell>
              <TableCell header scope="col">
                <span className="ion-visually-hidden">Current</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MODES.map((m) => (
              <TableRow key={m.mode} data-mode={m.mode}>
                <TableCell scope="row" header>
                  {m.mode}
                </TableCell>
                <TableCell>
                  <Value>{m.range}</Value>
                </TableCell>
                <TableCell>
                  {current === m.mode && (
                    <StatusIndicator size="sm" intent="information">
                      This preview
                    </StatusIndicator>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section
        title="Tokens by mode"
        description="The layout tokens, at each breakpoint. Use them for page margins, gutters and the space between sections, and the page adapts on its own."
      >
        <Table aria-label="Layout tokens by mode" density="compact">
          <TableHead>
            <TableRow>
              <TableCell header scope="col">
                Token
              </TableCell>
              {MODES.map((m) => (
                <TableCell key={m.mode} header scope="col" align="trailing">
                  {m.mode}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {GRID.map((name) => (
              <TableRow key={name} data-token={name}>
                <TableCell>
                  <TokenName>{`--${name.replace(/\//g, '-')}`}</TokenName>
                </TableCell>
                {MODES.map((m) => (
                  <TableCell key={m.mode} align="trailing">
                    <Value>{show(values[name][m.mode], name)}</Value>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </div>
  );
}

export const Modes: Story = {
  render: () => <BreakpointTable />,
  play: async ({ canvas, canvasElement }) => {
    await expect(TABLET_MAX).toBeGreaterThan(MOBILE_MAX);
    await expect(canvasElement.querySelectorAll('[data-token]').length).toBe(
      GRID.length,
    );

    // The current mode follows the viewport, at the widths the CSS states.
    // Resizing needs the test runner; in Storybook itself, drag the preview.
    if (!page?.viewport) return;
    const [w, h] = [window.innerWidth, window.innerHeight];
    const currentRow = () =>
      canvas
        .getByText('This preview')
        .closest('[data-mode]')!
        .getAttribute('data-mode');
    try {
      for (const [width, mode] of [
        [TABLET_MAX + 1, 'Desktop'],
        [TABLET_MAX, 'Tablet'],
        [MOBILE_MAX + 1, 'Tablet'],
        [MOBILE_MAX, 'Mobile'],
      ] as const) {
        await page.viewport(width, 800);
        await waitFor(() => expect(currentRow()).toBe(mode));
        // And the stylesheet agrees: the live margin is that mode's token.
        await expect(
          getComputedStyle(document.documentElement)
            .getPropertyValue('--grid-margin')
            .trim(),
        ).toBe(`${values['grid/margin'][mode]}px`);
      }
    } finally {
      await page.viewport(w, h);
    }
  },
};
