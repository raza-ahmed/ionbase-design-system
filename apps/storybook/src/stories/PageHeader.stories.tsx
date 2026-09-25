import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Icon,
  Menu,
  MenuItem,
  MenuTrigger,
  PageHeader,
  TabItem,
  Tabs,
} from 'ionbase-ui';
import { Ellipsis } from 'ionbase-icons/icons/ellipsis';
import { Pause, Plus } from 'lucide-react';

const meta: Meta<typeof PageHeader> = {
  title: 'Components/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "The top of a page: breadcrumb, the page's h1, a description, the record's status and the page's actions. Promoted from the demo, where five screens hand-wrote it three ways.\n\nIt is a `<div>`, not a `<header>` — the app shell's Header is the banner. Pass `titleId` and point `<main aria-labelledby>` at it.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

const DESCRIPTION =
  'Every agent in the workspace, what it does, and how it is doing.';

/** A list page: title, description, one primary action. */
export const ListPage: Story = {
  render: () => (
    <PageHeader
      title="Agents"
      description={DESCRIPTION}
      actions={
        <Button variant="primary-brand" startIcon={<Icon as={Plus} />}>
          New agent
        </Button>
      }
    />
  ),
};

/** A record page: where it sits, its state, and what can be done to it. */
export const RecordPage: Story = {
  render: () => (
    <PageHeader
      title="Payroll reconciler"
      description="Matches payroll exports against the ledger every night at 02:00 UTC."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem href="#">Agents</BreadcrumbItem>
          <BreadcrumbItem isCurrent>Payroll reconciler</BreadcrumbItem>
        </Breadcrumb>
      }
      status={<Badge intent="warning">Paused</Badge>}
      actions={
        <>
          <MenuTrigger placement="bottom end">
            <Button
              variant="tertiary"
              aria-label="More actions"
              startIcon={<Icon as={Ellipsis} />}
            />
            <Menu>
              <MenuItem key="duplicate">Duplicate</MenuItem>
              <MenuItem key="delete">Delete…</MenuItem>
            </Menu>
          </MenuTrigger>
          <Button variant="secondary" startIcon={<Icon as={Pause} />}>
            Resume
          </Button>
        </>
      }
    />
  ),
};

/** The row beneath belongs to the header: the page's own tabs. */
export const WithTabs: Story = {
  render: () => (
    <PageHeader title="Settings" description="Workspace defaults and access.">
      <Tabs aria-label="Settings sections" type="underline">
        <TabItem key="general" title="General">
          {null}
        </TabItem>
        <TabItem key="members" title="Members">
          {null}
        </TabItem>
        <TabItem key="billing" title="Billing">
          {null}
        </TabItem>
      </Tabs>
    </PageHeader>
  ),
};

// ------------------------------------------------------------------ tests

export const TitleIsTheH1: Story = {
  render: () => (
    <PageHeader titleId="page-title" title="Agents" description={DESCRIPTION} />
  ),
  play: async ({ canvas }) => {
    const h1 = canvas.getByRole('heading', { level: 1, name: 'Agents' });
    await expect(h1).toHaveAttribute('id', 'page-title');
  },
};

export const HeadingLevelTwoForAPane: Story = {
  render: () => <PageHeader headingLevel={2} title="Run 4821" />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 2, name: 'Run 4821' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('heading', { level: 1 })).toBeNull();
  },
};

/** A <header> here would be a second banner; the shell's Header is the one. */
export const IsNotALandmark: Story = {
  ...RecordPage,
  play: async ({ canvasElement, canvas }) => {
    const root = canvasElement.querySelector('.ion-page-header')!;
    await expect(root.tagName).toBe('DIV');
    await expect(canvas.queryByRole('banner')).toBeNull();
  },
};

/** Omitted slots leave no empty wrappers to take up gap space. */
export const OmittedSlotsRenderNothing: Story = {
  render: () => <PageHeader title="Overview" />,
  play: async ({ canvasElement }) => {
    for (const part of [
      'breadcrumb',
      'status',
      'description',
      'actions',
      'below',
    ]) {
      await expect(
        canvasElement.querySelector(`.ion-page-header__${part}`),
      ).toBeNull();
    }
  },
};

/**
 * The actions sit on the title's line however long the description runs —
 * the demo's `flex-end` let them drift down to the description's last line.
 */
export const ActionsAlignToTheTitle: Story = {
  render: () => (
    <div style={{ width: 720 }}>
      <PageHeader
        title="Agents"
        description={`${DESCRIPTION} ${DESCRIPTION} ${DESCRIPTION}`}
        actions={<Button variant="primary-brand">New agent</Button>}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const title = canvasElement.querySelector('.ion-page-header__title')!;
    const actions = canvasElement.querySelector('.ion-page-header__actions')!;
    const t = title.getBoundingClientRect();
    const a = actions.getBoundingClientRect();
    await expect(a.left).toBeGreaterThan(t.right);
    // Top-aligned with the title row, not the description's last line.
    await expect(Math.abs(a.top - t.top)).toBeLessThanOrEqual(8);
  },
};

/** Too narrow for both: the actions wrap beneath, still after the title. */
export const ActionsWrapBeneathWhenNarrow: Story = {
  render: () => (
    <div style={{ width: 280 }}>
      <PageHeader
        title="Payroll reconciler"
        description={DESCRIPTION}
        actions={
          <>
            <Button variant="tertiary">Duplicate</Button>
            <Button variant="secondary">Pause</Button>
            <Button variant="primary-brand">Resume agent</Button>
          </>
        }
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector('.ion-page-header__heading')!;
    const actions = canvasElement.querySelector('.ion-page-header__actions')!;
    await expect(actions.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      heading.getBoundingClientRect().bottom,
    );
    // DOM order is reading order: heading first, then the actions.
    await expect(
      heading.compareDocumentPosition(actions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Three buttons wider than the row wrap among themselves, not off-screen.
    const frame = canvasElement.firstElementChild as HTMLElement;
    for (const b of actions.querySelectorAll('button')) {
      await expect(b.getBoundingClientRect().right).toBeLessThanOrEqual(
        frame.getBoundingClientRect().right + 1,
      );
    }
  },
};

/** The demo's measurements, kept: 16 between rows, 4 title to description. */
export const GeometryMatchesTheDemo: Story = {
  ...RecordPage,
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('.ion-page-header') as HTMLElement;
    const heading = canvasElement.querySelector(
      '.ion-page-header__heading',
    ) as HTMLElement;
    const title = canvasElement.querySelector(
      '.ion-page-header__title',
    ) as HTMLElement;
    await expect(getComputedStyle(root).rowGap).toBe('16px');
    await expect(getComputedStyle(heading).rowGap).toBe('4px');
    // h4-sized: the page's h1 in the outline, not a marketing headline.
    await expect(getComputedStyle(title).fontWeight).toBe('600');
  },
};
