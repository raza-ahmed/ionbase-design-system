import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Table, TableBody, TableCell, TableHead, TableRow } from 'ionbase-ui';
import { tokens, tokenValues } from 'ionbase-ui/tokens-js';

import { cssVar, Section, TokenName, Value } from './foundations-kit.js';

const meta: Meta = {
  title: 'Foundations/Spacing',
  parameters: {
    docs: {
      description: {
        component:
          'The spacing scale: every gap, padding and margin in a component is one of these. The names are the pixel values, so `--spacing-16` is 16px.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const STEPS = Object.entries(tokens.primitives)
  .filter(([name]) => name.startsWith('spacing/'))
  .map(([name, reference]) => ({
    name,
    property: cssVar(reference),
    px: (tokenValues as unknown as Record<string, { Value?: number }>)[name]
      .Value!,
  }));

export const Scale: Story = {
  render: () => (
    <div style={{ maxInlineSize: '56rem' }}>
      <Section
        title="Spacing"
        description="Steps of 4 from 4 to 24, then wider steps for the space between sections. 2, 6 and 14 are for the tight insides of small controls. In Figma these are the spacing variables, bound to every gap and padding."
      >
        <Table aria-label="Spacing tokens" density="compact">
          <TableHead>
            <TableRow>
              <TableCell header scope="col">
                Token
              </TableCell>
              <TableCell header scope="col" align="trailing">
                Value
              </TableCell>
              <TableCell header scope="col">
                <span className="ion-visually-hidden">Drawn</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {STEPS.map((s) => (
              <TableRow key={s.name} data-token={s.name}>
                <TableCell>
                  <TokenName>{s.property}</TokenName>
                </TableCell>
                <TableCell align="trailing">
                  <Value>{`${s.px}px`}</Value>
                </TableCell>
                <TableCell>
                  <span
                    data-bar
                    aria-hidden="true"
                    style={{
                      display: 'block',
                      inlineSize: `var(${s.property})`,
                      blockSize: 'var(--spacing-12)',
                      background: 'var(--surface-primary)',
                      borderRadius: 'var(--radius-2xs)',
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const rows = [...canvasElement.querySelectorAll('[data-token]')];
    await expect(rows.map((r) => r.getAttribute('data-token'))).toEqual(
      STEPS.map((s) => s.name),
    );
    // Each bar is drawn by the token itself, so its width is the token's value.
    for (const [i, row] of rows.entries())
      await expect(
        row.querySelector<HTMLElement>('[data-bar]')!.getBoundingClientRect()
          .width,
      ).toBeCloseTo(STEPS[i].px, 0);
  },
};
