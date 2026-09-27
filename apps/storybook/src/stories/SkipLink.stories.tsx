import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SkipLink } from 'ionbase-ui';

/**
 * Whether the last click on the link was left to the browser, as React's
 * next handler up sees it — straight after SkipLink's own. Anything the
 * test page does to link clicks later cannot blur the answer.
 */
let lastFollowed: boolean | undefined;

/** A page in miniature: the link first, a header of links, then <main>. */
const Page = ({
  children,
  spacer = 0,
  mainProps = {},
}: {
  children?: React.ReactNode;
  spacer?: number;
  mainProps?: React.HTMLAttributes<HTMLElement>;
}) => (
  <div
    onClick={(e) => {
      if ((e.target as Element).closest('.ion-skip-link')) {
        lastFollowed = !e.defaultPrevented;
        // Never let the test page itself navigate.
        e.preventDefault();
      }
    }}
  >
    {children ?? <SkipLink target="main" />}
    <nav aria-label="Primary">
      <a href="#/overview">Overview</a> <a href="#/agents">Agents</a>{' '}
      <a href="#/runs">Runs</a>
    </nav>
    <div style={{ height: spacer }} />
    <main id="main" {...mainProps}>
      <h1>Agents</h1>
      <a href="#/agents/new">New agent</a>
    </main>
  </div>
);

const meta: Meta<typeof SkipLink> = {
  title: 'Components/SkipLink',
  component: SkipLink,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The first focusable thing on the page: a keyboard user’s way past the header and navigation, straight to the content. Hidden until it has focus, then shown at the top of the window over everything. It moves focus to `target` itself, so it works under a hash router, where `#main` would be a route.',
      },
    },
  },
  render: () => <Page />,
};

export default meta;
type Story = StoryObj<typeof SkipLink>;

export const Default: Story = {};

const link = (el: HTMLElement) =>
  within(el).getByRole('link', { name: 'Skip to main content' });

// Every story starts with nothing focused.
const reset = () => (document.activeElement as HTMLElement | null)?.blur();

const followed = () => {
  lastFollowed = undefined;
  return () => lastFollowed;
};

/** Hidden until focused: clipped to nothing, but in the tab order. */
export const HiddenUntilFocused: Story = {
  play: async ({ canvasElement }) => {
    reset();
    const a = link(canvasElement);
    await expect(getComputedStyle(a).clipPath).toBe('inset(50%)');
    await expect(getComputedStyle(a).position).toBe('fixed');
    await userEvent.tab();
    await expect(a).toHaveFocus();
    const s = getComputedStyle(a);
    await expect(s.clipPath).toBe('none');
    await expect(s.outlineStyle).toBe('solid');
    const r = a.getBoundingClientRect();
    await expect(r.top).toBe(8);
    await expect(r.left).toBe(8);
    await expect(r.width).toBeGreaterThan(100);
  },
};

/**
 * Activating it moves focus into <main>, so the next Tab is the first
 * control in the content, not the header's first link.
 */
export const ItSkipsToTheContent: Story = {
  play: async ({ canvasElement }) => {
    reset();
    const main = canvasElement.querySelector('main')!;
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect(main).toHaveFocus();
    await expect(main).toHaveAttribute('tabindex', '-1');
    // The target is not a control: no ring around the whole content.
    await expect(getComputedStyle(main).outlineStyle).toBe('none');
    await userEvent.tab();
    await expect(
      within(canvasElement).getByRole('link', { name: 'New agent' }),
    ).toHaveFocus();
    // Focus gone, the target is as it was.
    await expect(main).not.toHaveAttribute('tabindex');
    await expect(main).not.toHaveAttribute('data-ion-skip-target');
  },
};

/** The fragment is not followed: under a hash router, `#main` is a route. */
export const TheHashIsLeftAlone: Story = {
  play: async ({ canvasElement }) => {
    reset();
    const href = location.href;
    const wasFollowed = followed();
    await userEvent.click(link(canvasElement));
    await expect(wasFollowed()).toBe(false);
    await expect(location.href).toBe(href);
    await expect(canvasElement.querySelector('main')).toHaveFocus();
  },
};

/** A target that is focusable already keeps its own tabindex. */
export const AFocusableTargetKeepsItsTabindex: Story = {
  render: () => <Page mainProps={{ tabIndex: -1 }} />,
  play: async ({ canvasElement }) => {
    reset();
    const main = canvasElement.querySelector('main')!;
    await userEvent.click(link(canvasElement));
    await expect(main).toHaveFocus();
    main.blur();
    await expect(main).toHaveAttribute('tabindex', '-1');
  },
};

/** A target below the fold is brought into view. */
export const ItScrollsToTheTarget: Story = {
  render: () => <Page spacer={2000} />,
  play: async ({ canvasElement }) => {
    reset();
    window.scrollTo(0, 0);
    const main = canvasElement.querySelector('main')!;
    await expect(main.getBoundingClientRect().top).toBeGreaterThan(
      window.innerHeight,
    );
    await userEvent.click(link(canvasElement));
    await waitFor(() => {
      const top = main.getBoundingClientRect().top;
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThan(window.innerHeight);
    });
    window.scrollTo(0, 0);
  },
};

/** No such target: the link is followed, the fragment at least. */
export const AMissingTargetFallsBackToTheLink: Story = {
  render: () => (
    <Page>
      <SkipLink target="nowhere" />
    </Page>
  ),
  play: async ({ canvasElement }) => {
    reset();
    const wasFollowed = followed();
    await userEvent.click(link(canvasElement));
    await expect(wasFollowed()).toBe(true);
  },
};

/** A caller's `onClick` runs first, and can stop the skip. */
export const ACallersClickCanStopIt: Story = {
  render: () => (
    <Page>
      <SkipLink target="main" onClick={(e) => e.preventDefault()} />
    </Page>
  ),
  play: async ({ canvasElement }) => {
    reset();
    await userEvent.click(link(canvasElement));
    await expect(canvasElement.querySelector('main')).not.toHaveFocus();
  },
};

/** Its words are the caller's. */
export const ItsWordsCanChange: Story = {
  render: () => (
    <Page>
      <SkipLink target="main" lang="fr">
        Aller au contenu
      </SkipLink>
    </Page>
  ),
  play: async ({ canvasElement }) => {
    const a = within(canvasElement).getByRole('link', {
      name: 'Aller au contenu',
    });
    await expect(a).toHaveAttribute('href', '#main');
  },
};

/**
 * Focused, it is on top of everything — a toast included — so nothing the
 * page shows can cover it.
 */
export const NothingCoversIt: Story = {
  render: () => (
    <Page>
      <SkipLink target="main" />
      <div
        style={{
          position: 'fixed',
          inset: '0 auto auto 0',
          width: 400,
          height: 80,
          zIndex: 1200,
          background: 'var(--surface-inverse)',
        }}
      />
    </Page>
  ),
  play: async ({ canvasElement }) => {
    reset();
    const a = link(canvasElement);
    await userEvent.tab();
    await expect(a).toHaveFocus();
    const r = a.getBoundingClientRect();
    const hit = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    );
    await expect(a.contains(hit)).toBe(true);
  },
};

/** The link renders on a server, with its fragment for no-script. */
export const ItRendersOnAServer: Story = {
  play: async () => {
    const html = renderToStaticMarkup(<SkipLink target="main" />);
    await expect(html).toContain('href="#main"');
    await expect(html).toContain('ion-skip-link');
    await expect(html).toContain('Skip to main content');
  },
};
