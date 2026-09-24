import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import {
  Button,
  Card,
  Link,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from 'ionbase-ui';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    intent: { control: 'inline-radio', options: ['default', 'danger'] },
    headingLevel: { control: 'inline-radio', options: [2, 3, 4, 5, 6] },
  },
  args: {
    title: 'Notifications',
    description: 'Changes apply as soon as you make them.',
    children: (
      <p className="ion-text-body" style={{ margin: 0 }}>
        Card content goes here.
      </p>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '32rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "A bordered surface that groups one part of a page. Drawn in Figma as `Card` (1441:294); promoted from the demo app, where nine screens hand-wrote the same `.demo-panel`.\n\n**The title decides the element.** A titled card is a `<section>` named by its heading, so it is a landmark; an untitled card is a plain `<div>`. Set `isRegion={false}` when the card's only content is a landmark named by the same words.\n\nFor a feature row with media use `FullCard`; for one headline figure use `StatTile`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    title: 'Recent runs',
    description: undefined,
    action: (
      <Link variant="standalone" href="#">
        All runs
      </Link>
    ),
  },
};

export const Danger: Story = {
  args: {
    intent: 'danger',
    title: 'Danger zone',
    description: 'These actions cannot be undone.',
    children: (
      <div>
        <Button variant="destructive">Delete workspace</Button>
      </div>
    ),
  },
};

/** No title: a plain surface, for a loading placeholder or self-headed content. */
export const Untitled: Story = {
  args: {
    title: undefined,
    description: undefined,
    children: (
      <>
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="rect" height="6rem" />
      </>
    ),
  },
};

export const TitledCardIsANamedRegion: Story = {
  play: async ({ canvas }) => {
    const region = canvas.getByRole('region', { name: 'Notifications' });
    await expect(region.tagName).toBe('SECTION');
    await expect(
      canvas.getByRole('heading', { level: 2, name: 'Notifications' }),
    ).toBeInTheDocument();
  },
};

export const UntitledCardIsNotALandmark: Story = {
  args: { ...Untitled.args },
  play: async ({ canvasElement, canvas }) => {
    const card = canvasElement.querySelector('.ion-card') as HTMLElement;
    await expect(card.tagName).toBe('DIV');
    await expect(canvas.queryByRole('region')).toBeNull();
  },
};

/**
 * The card's only content is a Table whose scroll region carries the same
 * name. `isRegion={false}` keeps the heading and drops the duplicate landmark.
 */
export const IsRegionFalseAvoidsTwoRegionsWithOneName: Story = {
  args: {
    title: 'Recent runs',
    description: undefined,
    isRegion: false,
    children: (
      <Table aria-label="Recent runs">
        <TableHead>
          <TableRow>
            <TableCell>Run</TableCell>
            <TableCell>Outcome</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>run_01</TableCell>
            <TableCell>Completed</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    ),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Recent runs' }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryAllByRole('region', { name: 'Recent runs' }).length,
    ).toBeLessThanOrEqual(1);
    await expect(
      canvas.getByRole('heading', { name: 'Recent runs' }).closest('section'),
    ).toBeNull();
  },
};

export const HeadingLevelIsTheCallersChoice: Story = {
  args: { headingLevel: 3 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 3, name: 'Notifications' }),
    ).toBeInTheDocument();
  },
};

/** Danger changes the rule and nothing else — the warning stays in the words. */
export const DangerChangesOnlyTheRule: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Card title="Normal" data-testid="normal" />
      <Card title="Danger" intent="danger" data-testid="danger" />
    </div>
  ),
  play: async ({ canvas }) => {
    const normal = getComputedStyle(canvas.getByTestId('normal'));
    const danger = getComputedStyle(canvas.getByTestId('danger'));
    await expect(danger.borderTopColor).not.toBe(normal.borderTopColor);
    await expect(danger.backgroundColor).toBe(normal.backgroundColor);
    await expect(danger.padding).toBe(normal.padding);
  },
};

/** Figma `Card` (1441:294): 16 padding, 12 gap, 1px rule, radius/lg. */
export const RenderedGeometryMatchesFigma: Story = {
  play: async ({ canvasElement }) => {
    const card = getComputedStyle(
      canvasElement.querySelector('.ion-card') as HTMLElement,
    );
    await expect(card.paddingTop).toBe('16px');
    await expect(card.rowGap).toBe('12px');
    await expect(card.borderTopWidth).toBe('1px');
    const heading = getComputedStyle(
      canvasElement.querySelector('.ion-card__heading') as HTMLElement,
    );
    await expect(heading.rowGap).toBe('2px');
  },
};
