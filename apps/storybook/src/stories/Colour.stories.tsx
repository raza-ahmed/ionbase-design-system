import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import {
  StatusIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from 'ionbase-ui';
import { tokens } from 'ionbase-ui/tokens-js';

import {
  contrast,
  cssVar,
  Section,
  THEMES,
  TokenName,
  useTokenValues,
  Value,
  type Resolved,
  type Theme,
} from './foundations-kit.js';

const meta: Meta = {
  title: 'Foundations/Colour',
  parameters: {
    docs: {
      description: {
        component:
          'Every colour token, in both themes, as the stylesheet resolves it. Use the interface tokens in components; the palette is what they are made of. Nothing here is typed by hand: the names come from `tokens` in `ionbase-ui` and the values from the live CSS.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

/* -------------------------------------------------------------- the tokens */

type Group = 'text' | 'icon' | 'surface' | 'border' | 'ring';

/** The interface tokens, by group. Chart colours have their own page. */
const GROUPS: Record<Group, { title: string; description: string }> = {
  text: {
    title: 'Text',
    description:
      'Words. The contrast is measured on the surface each is meant for: 4.5:1 is the WCAG AA minimum for text.',
  },
  icon: {
    title: 'Icon',
    description:
      'Glyphs and other non-text marks. They need 3:1 against what they sit on.',
  },
  surface: {
    title: 'Surface',
    description:
      'Backgrounds: the page, what sits on it, and each state and intent. `-subtle` and `-tint` are quieter versions of the same intent.',
  },
  border: {
    title: 'Border',
    description:
      'Edges, from `subtle` for dividers to `stronger` for a control that must be found. A control’s border needs 3:1 against its surface.',
  },
  ring: {
    title: 'Ring',
    description:
      'The focus ring: its colour, its error colour, and the gap between it and the control.',
  },
};

const tokensOf = (group: Group) =>
  Object.entries(tokens.ui)
    .filter(([name]) => name.startsWith(`${group}/`))
    .map(([name, reference]) => ({ name, property: cssVar(reference) }));

/**
 * The surface a text or icon token is meant for, and the minimum it needs
 * there. `disabled` is exempt: WCAG excludes inactive controls, and their
 * low contrast is how they say so.
 */
function pairing(name: string): { on: string; min: number } | 'exempt' {
  const [group, role] = name.split('/');
  if (role === 'disabled') return 'exempt';
  const min = group === 'text' ? 4.5 : 3;
  if (role === 'on-color') return { on: '--surface-primary', min };
  if (role === 'inverse') return { on: '--surface-inverse', min };
  return { on: '--surface-default', min };
}

/* -------------------------------------------------------------- swatches */

function Swatch({
  group,
  property,
  theme,
  on,
}: {
  group: Group;
  property: string;
  theme: Theme;
  on?: string;
}) {
  const box: React.CSSProperties = {
    display: 'inline-grid',
    placeItems: 'center',
    inlineSize: 'var(--spacing-48)',
    blockSize: 'var(--spacing-32)',
    borderRadius: 'var(--radius-sm)',
    flex: 'none',
  };
  const style: React.CSSProperties =
    group === 'surface'
      ? {
          ...box,
          background: `var(${property})`,
          boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
        }
      : group === 'border'
        ? {
            ...box,
            background: 'var(--surface-default)',
            border: `2px solid var(${property})`,
          }
        : group === 'ring'
          ? {
              ...box,
              background: 'var(--surface-default)',
              outline: `2px solid var(${property})`,
              outlineOffset: 2,
            }
          : {
              ...box,
              background: `var(${on ?? '--surface-default'})`,
              color: `var(${property})`,
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              fontWeight: 600,
            };
  return (
    <span data-theme={theme} style={style} aria-hidden="true">
      {group === 'text' ? 'Aa' : group === 'icon' ? '●' : null}
    </span>
  );
}

function Contrast({
  name,
  property,
  values,
  theme,
}: {
  name: string;
  property: string;
  values: Resolved;
  theme: Theme;
}) {
  const p = pairing(name);
  if (p === 'exempt')
    return <span className="ion-text-body-sm">Exempt (disabled)</span>;
  const ratio = contrast(values[theme][property], values[theme][p.on]);
  if (ratio === null) return <Value>—</Value>;
  const passes = ratio >= p.min;
  return (
    <span data-contrast={ratio.toFixed(2)}>
      <StatusIndicator size="sm" intent={passes ? 'success' : 'error'}>
        {`${ratio.toFixed(2)}:1 ${passes ? 'passes' : 'fails'} ${p.min}:1`}
      </StatusIndicator>
    </span>
  );
}

/* ---------------------------------------------------------------- tables */

function GroupTable({
  group,
  values,
}: {
  group: Group;
  values: Resolved | null;
}) {
  const rows = tokensOf(group);
  const measured = group === 'text' || group === 'icon';
  return (
    <Section
      title={GROUPS[group].title}
      description={GROUPS[group].description}
    >
      <Table aria-label={`${GROUPS[group].title} tokens`} density="compact">
        <TableHead>
          <TableRow>
            <TableCell header scope="col">
              Token
            </TableCell>
            {THEMES.map((t) => (
              <TableCell key={t} header scope="col">
                {t === 'light' ? 'Light' : 'Dark'}
              </TableCell>
            ))}
            {measured &&
              THEMES.map((t) => (
                <TableCell key={t} header scope="col">
                  {t === 'light' ? 'Contrast, light' : 'Contrast, dark'}
                </TableCell>
              ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ name, property }) => {
            const p = pairing(name);
            return (
              <TableRow key={name} data-token={name}>
                <TableCell>
                  <TokenName>{property}</TokenName>
                </TableCell>
                {THEMES.map((t) => (
                  <TableCell key={t}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-8)',
                      }}
                    >
                      <Swatch
                        group={group}
                        property={property}
                        theme={t}
                        on={p === 'exempt' ? undefined : p.on}
                      />
                      <Value>{values?.[t][property] ?? ''}</Value>
                    </span>
                  </TableCell>
                ))}
                {measured &&
                  THEMES.map((t) => (
                    <TableCell key={t} data-theme-cell={t}>
                      {values && (
                        <Contrast
                          name={name}
                          property={property}
                          values={values}
                          theme={t}
                        />
                      )}
                    </TableCell>
                  ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Section>
  );
}

const ALL_GROUPS = Object.keys(GROUPS) as Group[];
const PROPERTIES = [
  ...new Set([
    ...ALL_GROUPS.flatMap((g) => tokensOf(g).map((t) => t.property)),
    '--surface-default',
    '--surface-primary',
    '--surface-inverse',
  ]),
];

function InterfaceColours() {
  const { values, probes } = useTokenValues(PROPERTIES);
  return (
    <div style={{ maxInlineSize: '72rem' }}>
      {probes}
      {ALL_GROUPS.map((g) => (
        <GroupTable key={g} group={g} values={values} />
      ))}
    </div>
  );
}

/** The colours components use, by job. Read this page before picking one. */
export const Interface: Story = {
  render: () => <InterfaceColours />,
  play: async ({ canvasElement }) => {
    const shown = () =>
      [...canvasElement.querySelectorAll('[data-token]')].map((r) =>
        r.getAttribute('data-token'),
      );
    // Every interface token but the chart ones has a row, once.
    const expected = Object.keys(tokens.ui).filter(
      (n) => !n.startsWith('chart/'),
    );
    await expect(shown().sort()).toEqual([...expected].sort());

    // The values are read from the stylesheet, in both themes, and differ.
    const row = canvasElement.querySelector('[data-token="text/default"]')!;
    await waitFor(() =>
      expect(within(row as HTMLElement).getAllByText(/^#/)).toHaveLength(2),
    );
    const [light, dark] = within(row as HTMLElement)
      .getAllByText(/^#/)
      .map((e) => e.textContent);
    await expect(light).not.toBe(dark);

    // The formula, against known values: black on white is 21:1,
    // #767676 on white is the lightest grey that passes 4.5:1, and a
    // translucent colour counts as what it shows on the surface.
    await expect(contrast('#000', '#fff')).toBeCloseTo(21, 2);
    await expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    // A colour, so each channel's weight counts: pure red on white is 4:1.
    await expect(contrast('#ff0000', '#ffffff')).toBeCloseTo(4, 2);
    await expect(contrast('#00000080', '#ffffff')).toBeCloseTo(
      contrast('#7f7f7f', '#ffffff')!,
      1,
    );

    // The contrast shown is the contrast of those values.
    const cell = (t: Theme) =>
      row.querySelector(`[data-theme-cell="${t}"] [data-contrast]`)!;
    const bg = (t: Theme) =>
      getComputedStyle(
        canvasElement.querySelector(`span[data-theme="${t}"][hidden]`)!,
      )
        .getPropertyValue('--surface-default')
        .trim();
    for (const t of THEMES) {
      const ratio = Number(cell(t).getAttribute('data-contrast'));
      await expect(ratio).toBeCloseTo(
        contrast(t === 'light' ? light! : dark!, bg(t))!,
        2,
      );
      await expect(ratio).toBeGreaterThanOrEqual(4.5);
    }

    // Disabled is marked exempt, not failed.
    await expect(
      within(
        canvasElement.querySelector(
          '[data-token="text/disabled"]',
        ) as HTMLElement,
      ).getAllByText('Exempt (disabled)'),
    ).toHaveLength(2);
  },
};

/* --------------------------------------------------------------- palette */

/** The ramps the interface tokens are made of. */
const RAMPS = [
  ...new Set(
    Object.keys(tokens.semantics)
      .filter((n) =>
        /^(primary|neutral|success|warning|error|information|palette\/\d)\//.test(
          n,
        ),
      )
      .map((n) => n.split('/').slice(0, -1).join('/')),
  ),
];

function Ramp({ ramp }: { ramp: string }) {
  const steps = Object.entries(tokens.semantics).filter(
    ([n]) => n.split('/').slice(0, -1).join('/') === ramp,
  );
  const { values, probes } = useTokenValues(steps.map(([, r]) => cssVar(r)));
  return (
    <div data-ramp={ramp} style={{ marginBlockEnd: 'var(--spacing-24)' }}>
      {probes}
      <h3
        className="ion-text-body-sm ion-text--semibold"
        style={{ marginBlockEnd: 'var(--spacing-8)' }}
      >
        {ramp.replace('palette/', 'palette ')}
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(6.5rem, 1fr))',
          gap: 'var(--spacing-8)',
        }}
      >
        {steps.map(([name, reference]) => {
          const property = cssVar(reference);
          return (
            <div key={name} data-step={name}>
              <div
                style={{
                  blockSize: 'var(--spacing-48)',
                  borderRadius: 'var(--radius-sm)',
                  background: `var(${property})`,
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
                }}
              />
              <TokenName>{property}</TokenName>
              <div>
                <Value>{values?.light[property] ?? ''}</Value>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The palette. Components never use these directly: an interface token picks
 * a step for each theme, which is how one component works in both.
 */
export const Palette: Story = {
  render: () => (
    <div style={{ maxInlineSize: '72rem' }}>
      <Section
        title="Palette"
        description="The ramps, from 50 to 900. They have one value in both themes; the interface tokens choose a different step for dark."
      >
        {RAMPS.map((r) => (
          <Ramp key={r} ramp={r} />
        ))}
      </Section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const steps = [...canvasElement.querySelectorAll('[data-step]')].map((e) =>
      e.getAttribute('data-step'),
    );
    const expected = Object.keys(tokens.semantics).filter((n) =>
      RAMPS.some((r) => n.startsWith(`${r}/`)),
    );
    await expect(steps.sort()).toEqual(expected.sort());
    await expect(canvasElement.querySelectorAll('[data-ramp]').length).toBe(
      RAMPS.length,
    );
  },
};
