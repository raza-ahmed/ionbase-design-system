import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';

/*
 * The worked example itself, compiled from
 * packages/ionbase-ui/patterns/examples/ListDetail.tsx by the build and
 * imported by path, since it is not a package export.
 */
import {
  MembersDirectory,
  type Member,
  type OwnedAgent,
} from '../../../../packages/ionbase-ui/dist/pattern-examples/ListDetail.js';

const MEMBERS: Member[] = [
  {
    id: 'usr_ada',
    name: 'Ada Reyes',
    initials: 'AR',
    email: 'ada@acme.test',
    role: 'admin',
    team: 'Finance',
  },
  {
    id: 'usr_bo',
    name: 'Bo Lindqvist',
    initials: 'BL',
    email: 'bo@acme.test',
    role: 'member',
    team: 'Legal',
  },
  {
    id: 'usr_cy',
    name: 'Cy Okafor',
    initials: 'CO',
    email: 'cy@acme.test',
    role: 'member',
    team: 'Support',
  },
];
const AGENTS: Record<string, OwnedAgent[]> = {
  usr_ada: [{ id: 'agt_1', name: 'Invoice reconciler' }],
  usr_bo: [],
  usr_cy: [{ id: 'agt_2', name: 'Ticket triage' }],
};

const members = () => Promise.resolve(MEMBERS);
const owned = (id: string) => Promise.resolve(AGENTS[id] ?? []);

/** Wide or narrow before the render: the example reads the width on mount. */
const sized =
  (width: number, hash = '#/members') =>
  async () => {
    const [w, h] = [window.innerWidth, window.innerHeight];
    await page.viewport(width, 800);
    window.history.replaceState(null, '', hash);
    return async () => {
      window.history.replaceState(null, '', '#');
      await page.viewport(w, h);
    };
  };
const wide = (hash?: string) => sized(1200, hash);

const panelTitle = () =>
  document.querySelector('#member-panel h2')?.textContent ?? null;

const meta: Meta<typeof MembersDirectory> = {
  title: 'Patterns/List detail (worked example)',
  component: MembersDirectory,
  beforeEach: wide(),
  args: { loadMembers: members, loadOwnedAgents: owned },
  parameters: {
    docs: {
      description: {
        component:
          'The ListDetail pattern’s worked example, `patterns/examples/ListDetail.tsx`, rendered: a List whose selection follows focus, the record in a SidePanel beside it, and the selection in the address. The build type-checks it against the published types; it ships in `ionbase-ui/patterns/ListDetail.json` as `example.source`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MembersDirectory>;

export const Default: Story = {};

/** Arrow down the list and the panel follows; focus stays in the list. */
export const TheDetailFollowsFocus: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('grid', { name: 'Members' });
    const before = window.history.length;

    await userEvent.tab(); // the search box
    await userEvent.tab(); // the list: its first row is selected
    await waitFor(() => expect(panelTitle()).toBe('Ada Reyes'));
    await expect(window.location.hash).toBe('#/members/usr_ada');
    await expect(canvas.getByRole('row', { name: /Ada Reyes/ })).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(panelTitle()).toBe('Bo Lindqvist'));
    await expect(window.location.hash).toBe('#/members/usr_bo');
    await expect(
      canvas.getByRole('row', { name: /Bo Lindqvist/ }),
    ).toHaveFocus();
    // Replaced, not pushed: Back leaves the page instead of walking the list.
    await expect(window.history.length).toBe(before);
  },
};

/** A link opens the record it names. */
export const TheAddressOpensTheRecord: Story = {
  beforeEach: wide('#/members/usr_cy'),
  play: async () => {
    await waitFor(() => expect(panelTitle()).toBe('Cy Okafor'));
    await expect(
      await within(document.body).findByText('Ticket triage'),
    ).toBeVisible();
  },
};

/** An id that matches no one: the list, and the panel saying so. */
export const UnknownId: Story = {
  beforeEach: wide('#/members/usr_gone'),
  play: async ({ canvas }) => {
    await canvas.findByRole('grid', { name: 'Members' });
    const body = within(document.body);
    await expect(
      await body.findByRole('heading', {
        name: 'There is no member with this ID',
      }),
    ).toBeVisible();
    await userEvent.click(body.getByRole('button', { name: 'Show everyone' }));
    await waitFor(() => expect(window.location.hash).toBe('#/members'));
    await waitFor(() => expect(panelTitle()).toBeNull());
  },
};

/** A row the search hides takes the panel with it, and brings it back. */
export const SearchHidesTheDetail: Story = {
  beforeEach: wide('#/members/usr_bo'),
  play: async ({ canvas }) => {
    await waitFor(() => expect(panelTitle()).toBe('Bo Lindqvist'));
    await userEvent.type(canvas.getByRole('searchbox'), 'ada');
    await waitFor(() => expect(panelTitle()).toBeNull());
    await userEvent.clear(canvas.getByRole('searchbox'));
    await waitFor(() => expect(panelTitle()).toBe('Bo Lindqvist'));
  },
};

/** The detail's own request failing: an Alert in the panel; the rest stays. */
export const DetailError: Story = {
  beforeEach: wide('#/members/usr_ada'),
  args: {
    loadOwnedAgents: () =>
      Promise.reject(new Error('The agents service is down.')),
  },
  play: async ({ canvas }) => {
    const alert = await within(document.body).findByRole('alert');
    await expect(alert).toHaveTextContent('Their agents couldn’t load');
    await expect(
      within(document.getElementById('member-panel')!).getByText(
        'ada@acme.test',
      ),
    ).toBeVisible();
    await expect(canvas.getByRole('grid', { name: 'Members' })).toBeVisible();
  },
};

/** The list failing is the page failing. */
export const ListError: Story = {
  args: {
    loadMembers: (() => {
      let calls = 0;
      return () =>
        ++calls === 1
          ? Promise.reject(new Error('The directory timed out.'))
          : members();
    })(),
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'Members couldn’t load' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }));
    await expect(
      await canvas.findByRole('grid', { name: 'Members' }),
    ).toBeVisible();
  },
};

export const Loading: Story = {
  args: { loadMembers: () => new Promise<Member[]>(() => {}) },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Loading members')).toBeInTheDocument();
    await expect(
      canvas.getByText('Loading members').closest('[aria-busy="true"]'),
    ).not.toBeNull();
  },
};

export const Empty: Story = {
  args: { loadMembers: () => Promise.resolve([]) },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'No one else is here yet' }),
    ).toBeVisible();
    await expect(panelTitle()).toBeNull();
  },
};

/**
 * Narrow, where the panel is a modal Drawer: tabbing into the list opens
 * nothing, and a press does.
 */
export const NarrowOpensOnPress: Story = {
  beforeEach: sized(600),
  play: async ({ canvas }) => {
    await canvas.findByRole('grid', { name: 'Members' });
    await userEvent.tab();
    await userEvent.tab();
    await expect(within(document.body).queryByRole('dialog')).toBeNull();
    await expect(window.location.hash).toBe('#/members');

    await userEvent.keyboard('{Enter}');
    await expect(
      await within(document.body).findByRole('dialog', { name: 'Ada Reyes' }),
    ).toBeVisible();
    await expect(window.location.hash).toBe('#/members/usr_ada');
  },
};
