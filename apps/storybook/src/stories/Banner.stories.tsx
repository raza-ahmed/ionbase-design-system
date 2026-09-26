import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Banner, Button, Link, type BannerProps } from 'ionbase-ui';

const KEY = 'story-maintenance';
const STORED = `ionbase:banner-dismissed:${KEY}`;

const Maintenance = (props: Partial<BannerProps>) => (
  <Banner
    intent="information"
    title="Maintenance on Sunday"
    actions={<Link href="#status">Status page</Link>}
    {...props}
  >
    From 02:00 to 03:00 UTC. Runs started then are queued, not lost.
  </Banner>
);

/** A banner above something to move on to, and a way to mount it again. */
function Page(props: Partial<BannerProps>) {
  const [mount, setMount] = useState(0);
  return (
    <div>
      <Maintenance key={mount} {...props} />
      <Button onPress={() => setMount((n) => n + 1)}>Next page</Button>
    </div>
  );
}

const meta: Meta<typeof Banner> = {
  title: 'Components/Banner',
  component: Banner,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A notice about the whole product, across the top of it: maintenance, a trial ending, read-only mode. It is Alert with `layout="banner"`, on one line where there is room. With `dismissKey` a dismissal is remembered in this browser; a banner that must stay has no dismiss button. Dismissing moves focus to what comes after it.',
      },
    },
  },
  render: () => <Maintenance dismissKey={KEY} />,
  beforeEach: () => {
    window.localStorage.removeItem(STORED);
  },
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const Default: Story = {};
export const MustStay: Story = {
  render: () => (
    <Banner
      intent="warning"
      title="Northwind Robotics will be deleted on 3 Oct"
      actions={<Link href="#settings">Cancel deletion</Link>}
    >
      Agents are paused until then.
    </Banner>
  ),
};

// ------------------------------------------------------------------ tests

const dismissButton = (c: ReturnType<typeof within>) =>
  c.getByRole('button', { name: 'Dismiss' });

/**
 * It is Alert's banner: edge to edge, and the role follows the intent — a
 * status for information, an alert for a warning.
 */
export const ItIsAnAlertBanner: Story = {
  render: () => (
    <>
      <Maintenance />
      <Banner intent="warning">Read-only until 14:00.</Banner>
    </>
  ),
  play: async ({ canvasElement }) => {
    const [info, warning] = canvasElement.querySelectorAll('.ion-banner');
    await expect(info).toHaveClass('ion-alert', 'ion-alert--banner');
    await expect(info).toHaveAttribute('role', 'status');
    await expect(warning).toHaveAttribute('role', 'alert');
  },
};

/** With neither `dismissKey` nor `onDismiss` there is nothing to dismiss. */
export const WithoutAKeyItStays: Story = {
  ...MustStay,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  },
};

/** `onDismiss` alone: dismissed until it is mounted again. */
export const OnDismissHidesIt: Story = {
  render: () => {
    function Counted() {
      const [calls, setCalls] = useState(0);
      return (
        <>
          <Page onDismiss={() => setCalls((n) => n + 1)} />
          <output data-testid="calls">{calls}</output>
        </>
      );
    }
    return <Counted />;
  },
  play: async ({ canvas }) => {
    await userEvent.click(dismissButton(canvas));
    await expect(canvas.queryByText('Maintenance on Sunday')).toBeNull();
    await expect(canvas.getByTestId('calls')).toHaveTextContent('1');
    await userEvent.click(canvas.getByRole('button', { name: 'Next page' }));
    await expect(canvas.getByText('Maintenance on Sunday')).toBeInTheDocument();
    await expect(window.localStorage.getItem(STORED)).toBeNull();
  },
};

/**
 * `dismissKey`: dismissed stays dismissed — on the next page, and the next
 * visit — and the key is stored.
 */
export const ADismissalIsRemembered: Story = {
  render: () => <Page dismissKey={KEY} />,
  play: async ({ canvas }) => {
    await userEvent.click(dismissButton(canvas));
    await expect(canvas.queryByText('Maintenance on Sunday')).toBeNull();
    await expect(window.localStorage.getItem(STORED)).toBe('1');
    await userEvent.click(canvas.getByRole('button', { name: 'Next page' }));
    await expect(canvas.queryByText('Maintenance on Sunday')).toBeNull();
  },
};

/** A new key is a new notice: it shows, whatever was dismissed before. */
export const ANewKeyShowsAgain: Story = {
  render: () => <Maintenance dismissKey="story-maintenance-next" />,
  beforeEach: () => {
    window.localStorage.setItem(STORED, '1');
    window.localStorage.removeItem(
      'ionbase:banner-dismissed:story-maintenance-next',
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Maintenance on Sunday')).toBeInTheDocument();
  },
};

/** Already dismissed, it is not rendered at all. */
export const ARememberedBannerIsNotRendered: Story = {
  beforeEach: () => {
    window.localStorage.setItem(STORED, '1');
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('.ion-banner')).toBeNull();
  },
};

/**
 * With storage blocked — a private window — the banner still shows and can
 * still be dismissed, for this page.
 */
export const BlockedStorageStillWorks: Story = {
  render: () => <Page dismissKey={KEY} />,
  play: async ({ canvas }) => {
    const proto = Object.getPrototypeOf(window.localStorage);
    const get = proto.getItem;
    const set = proto.setItem;
    proto.getItem = () => {
      throw new Error('blocked');
    };
    proto.setItem = () => {
      throw new Error('blocked');
    };
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Next page' }));
      await expect(
        canvas.getByText('Maintenance on Sunday'),
      ).toBeInTheDocument();
      await userEvent.click(dismissButton(canvas));
      await expect(canvas.queryByText('Maintenance on Sunday')).toBeNull();
    } finally {
      proto.getItem = get;
      proto.setItem = set;
    }
  },
};

/**
 * Dismissing removes the button that had focus; focus goes to what comes
 * after the banner, not back to the top of the document.
 */
export const FocusGoesForward: Story = {
  render: () => <Page dismissKey={KEY} />,
  play: async ({ canvas }) => {
    const dismiss = dismissButton(canvas);
    dismiss.focus();
    await userEvent.keyboard('{Enter}');
    await expect(
      canvas.getByRole('button', { name: 'Next page' }),
    ).toHaveFocus();
  },
};

/** With room, the title, message and action share one line. */
export const OneLineWhereThereIsRoom: Story = {
  play: async ({ canvasElement }) => {
    const b = canvasElement.querySelector('.ion-banner')!;
    const top = (sel: string) => b.querySelector(sel)!.getBoundingClientRect();
    const title = top('.ion-alert__title');
    const message = top('.ion-alert__message');
    const actions = top('.ion-alert__actions');
    await expect(Math.abs(title.top - message.top)).toBeLessThan(4);
    await expect(Math.abs(title.top - actions.top)).toBeLessThan(4);
    await expect(message.left).toBeGreaterThan(title.right);
  },
};

/** On a phone it wraps, and never runs past the edge. */
export const WrapsOnAPhone: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Maintenance dismissKey={KEY} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const b = canvasElement.querySelector('.ion-banner')!;
    await expect(b.scrollWidth).toBeLessThanOrEqual(b.clientWidth);
    const title = b.querySelector('.ion-alert__title')!.getBoundingClientRect();
    const message = b
      .querySelector('.ion-alert__message')!
      .getBoundingClientRect();
    await expect(message.top).toBeGreaterThan(title.top);
  },
};
