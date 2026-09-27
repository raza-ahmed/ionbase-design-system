import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Stack, type StackGap } from 'ionbase-ui';

const Box = ({
  children,
  h = 32,
}: {
  children: React.ReactNode;
  h?: number;
}) => (
  <div
    data-box
    style={{
      height: h,
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      background: 'var(--surface-muted)',
      borderRadius: 6,
    }}
  >
    {children}
  </div>
);

const meta: Meta<typeof Stack> = {
  title: 'Components/Stack',
  component: Stack,
  tags: ['autodocs'],
  argTypes: {
    direction: { control: 'inline-radio', options: ['column', 'row'] },
    gap: {
      control: 'select',
      options: [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Children in a column or a row, with a gap from the spacing scale between them. The layout primitive to reach for before writing flex CSS: `gap` takes the scale's steps and nothing else, so a screen built from Stacks cannot drift off the tokens. Layout only — it adds no role; `as` picks the element that means something.",
      },
    },
  },
  render: (args) => (
    <Stack {...args}>
      <Box>One</Box>
      <Box>Two</Box>
      <Box>Three</Box>
    </Stack>
  ),
};

export default meta;
type Story = StoryObj<typeof Stack>;

export const Default: Story = {};
export const Row: Story = { args: { direction: 'row', gap: 8 } };

const probe = (token: string) => {
  const el = document.createElement('div');
  el.style.width = `var(${token})`;
  document.body.append(el);
  const w = getComputedStyle(el).width;
  el.remove();
  return w;
};
const stack = (el: HTMLElement) =>
  el.querySelector('.ion-stack') as HTMLElement;

/** A column, 16 apart, children stretched across — the defaults. */
export const TheDefaultIsAColumn: Story = {
  play: async ({ canvasElement }) => {
    const s = getComputedStyle(stack(canvasElement));
    await expect(s.display).toBe('flex');
    await expect(s.flexDirection).toBe('column');
    await expect(s.rowGap).toBe(probe('--spacing-16'));
    await expect(s.alignItems).toBe('normal');
    const [a] = canvasElement.querySelectorAll('[data-box]');
    await expect(a.getBoundingClientRect().width).toBe(
      stack(canvasElement).getBoundingClientRect().width,
    );
  },
};

const GAPS: StackGap[] = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64];

/** Every gap is its spacing token, measured between real children. */
export const EveryGapIsItsToken: Story = {
  render: () => (
    <div>
      {GAPS.map((g) => (
        <Stack key={g} gap={g} direction="row" data-gap={g}>
          <Box>a</Box>
          <Box>b</Box>
        </Stack>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const el of canvasElement.querySelectorAll<HTMLElement>(
      '[data-gap]',
    )) {
      const g = el.dataset.gap;
      const [a, b] = el.children;
      const between =
        b.getBoundingClientRect().left - a.getBoundingClientRect().right;
      await expect(`${between}px`).toBe(probe(`--spacing-${g}`));
    }
  },
};

/**
 * A gap off the scale does not compile. The typecheck gate runs over this
 * file, so dropping the scale from the type fails the build.
 */
export const AGapOffTheScaleIsATypeError: Story = {
  render: () => (
    // @ts-expect-error — 10 is not a step of the spacing scale.
    <Stack gap={10}>
      <Box>One</Box>
    </Stack>
  ),
};

/** A row centres its children on the line; `align` overrides it. */
export const ARowCentres: Story = {
  render: () => (
    <div>
      <Stack direction="row" data-s="row">
        <Box h={24}>short</Box>
        <Box h={48}>tall</Box>
      </Stack>
      <Stack direction="row" align="start" data-s="start">
        <Box h={24}>short</Box>
        <Box h={48}>tall</Box>
      </Stack>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const top = (sel: string) => {
      const [a, b] = canvasElement.querySelector(sel)!.children;
      return [a.getBoundingClientRect(), b.getBoundingClientRect()];
    };
    const [a, b] = top('[data-s="row"]');
    await expect(a.top + a.height / 2).toBeCloseTo(b.top + b.height / 2, 0);
    const [c, d] = top('[data-s="start"]');
    await expect(c.top).toBe(d.top);
  },
};

/** `between` puts the first and last at the ends. */
export const BetweenPushesToTheEnds: Story = {
  render: () => (
    <div style={{ width: 480 }}>
      <Stack direction="row" justify="between">
        <Box>Left</Box>
        <Box>Right</Box>
      </Stack>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const s = stack(canvasElement).getBoundingClientRect();
    const [a, b] = stack(canvasElement).children;
    await expect(a.getBoundingClientRect().left).toBe(s.left);
    await expect(b.getBoundingClientRect().right).toBe(s.right);
  },
};

/** A wrapping row goes onto a second line instead of overflowing. */
export const AWrappingRowWraps: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <Stack direction="row" wrap gap={8}>
        {['Refunds', 'Support', 'Finance', 'Legal', 'People'].map((t) => (
          <Button key={t} size="sm" variant="secondary">
            {t}
          </Button>
        ))}
      </Stack>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const s = stack(canvasElement);
    await expect(s.scrollWidth).toBeLessThanOrEqual(s.clientWidth);
    const tops = new Set(
      [...s.children].map((c) => Math.round(c.getBoundingClientRect().top)),
    );
    await expect(tops.size).toBeGreaterThan(1);
    // And the lines are the gap apart, too.
    await expect(getComputedStyle(s).rowGap).toBe(probe('--spacing-8'));
  },
};

/** A row's text shrinks and wraps rather than widening the row. */
export const TextInARowWraps: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <Stack direction="row" gap={8}>
        <Box>Name</Box>
        <p style={{ margin: 0 }}>
          {'A description that is much longer than the row is wide '.repeat(2)}
        </p>
      </Stack>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const s = stack(canvasElement);
    await expect(s.scrollWidth).toBeLessThanOrEqual(s.clientWidth);
  },
};

/** `as="ul"` is a list — no bullets, no indent, still a list to a screen reader. */
export const AsAList: Story = {
  render: () => (
    <Stack as="ul" gap={8} aria-label="Teams">
      <li>Support</li>
      <li>Finance</li>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole('list', { name: 'Teams' });
    await expect(list.tagName).toBe('UL');
    await expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    const s = getComputedStyle(list);
    await expect(s.listStyleType).toBe('none');
    await expect(s.paddingLeft).toBe('0px');
    await expect(s.marginTop).toBe('0px');
  },
};

/** It adds no role: a Stack of buttons is just the buttons. */
export const ItAddsNoRole: Story = {
  play: async ({ canvasElement }) => {
    const s = stack(canvasElement);
    await expect(s.tagName).toBe('DIV');
    await expect(s).not.toHaveAttribute('role');
  },
};

/** A Stack inside a Stack keeps its own gap. */
export const NestedStacksKeepTheirGaps: Story = {
  render: () => (
    <Stack gap={32} data-s="outer">
      <Stack direction="row" gap={4} data-s="inner">
        <Box>a</Box>
        <Box>b</Box>
      </Stack>
      <Box>c</Box>
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const gap = (sel: string) =>
      getComputedStyle(canvasElement.querySelector(sel)!).columnGap;
    await expect(gap('[data-s="inner"]')).toBe(probe('--spacing-4'));
    await expect(
      getComputedStyle(canvasElement.querySelector('[data-s="outer"]')!).rowGap,
    ).toBe(probe('--spacing-32'));
  },
};

/** No client code: it renders on a server. */
export const ItRendersOnAServer: Story = {
  play: async () => {
    const html = renderToStaticMarkup(
      <Stack as="nav" direction="row" gap={8} aria-label="Sections">
        <a href="#a">A</a>
      </Stack>,
    );
    await expect(html).toContain('<nav');
    await expect(html).toContain('ion-stack--gap-8');
    await expect(html).toContain('ion-stack--row');
  },
};

/**
 * A row's child whose content cannot wrap — a name over a one-line,
 * ellipsised ID — still shrinks to the row: the line is cut there, rather
 * than the child running past the row's end.
 */
export const AOneLineChildShrinksToTheRow: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <Stack direction="row" gap={8}>
        <Box>Icon</Box>
        <div data-child>
          <strong>Contract clause checker</strong>
          <span
            data-line
            style={{
              display: 'block',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            agt_contract-clause-checker-7f3a91c2-review-queue
          </span>
        </div>
      </Stack>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const s = stack(canvasElement).getBoundingClientRect();
    const child = canvasElement.querySelector('[data-child]')!;
    await expect(child.getBoundingClientRect().right).toBeLessThanOrEqual(
      s.right + 0.5,
    );
    const line = canvasElement.querySelector('[data-line]') as HTMLElement;
    await expect(line.scrollWidth).toBeGreaterThan(line.clientWidth);
  },
};
