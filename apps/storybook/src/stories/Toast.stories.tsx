import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { Toast, ToastProvider, useToast, Button } from 'ionbase-ui';

const INTENTS = [
  'neutral',
  'primary',
  'success',
  'warning',
  'error',
  'information',
] as const;

const meta: Meta<typeof Toast> = {
  title: 'Components/Toast',
  component: Toast,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Toast` (820:1655). Six intents on neutral chrome — `surface/raised` with a shadow, intent carried by the icon alone. A tinted panel floating over unknown content competes with whatever is behind it, and makes Toast and Alert indistinguishable at a glance.\n\n`ToastProvider` renders the queue and supplies `useToast()`. Placement, stacking and the limit belong to the provider; the toast itself knows none of it.\n\n**Auto-dismiss pauses on hover and focus** — a toast that keeps counting down while being read, or while its action has keyboard focus, takes the action away mid-reach.\n\n**Every intent is `role="status"`, including error.** Unlike Alert, a toast arrives unbidden and often several at once; assertive regions would interrupt whatever is being read each time one lands.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

/** Rendered directly, outside the provider, so the visuals can be inspected. */
const Static = (props: Partial<React.ComponentProps<typeof Toast>>) => (
  <Toast
    id="static"
    title="Changes saved"
    message="Your changes are live."
    duration={null}
    onDismiss={() => {}}
    {...props}
  />
);

export const Default: Story = { render: () => <Static /> };

export const Intents: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {INTENTS.map((intent) => (
        <Static key={intent} intent={intent} title={intent} />
      ))}
    </div>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Static
      intent="error"
      title="Upload failed"
      message="The file was larger than 10MB."
      action={{ label: 'Retry', onPress: fn() }}
    />
  ),
};

export const TitleOnly: Story = {
  render: () => <Static message={undefined} />,
};

/** The provider is how this is used in practice. */
function Demo({
  placement,
}: {
  placement?: React.ComponentProps<typeof ToastProvider>['placement'];
}) {
  return (
    <ToastProvider placement={placement}>
      <Trigger />
    </ToastProvider>
  );
}

function Trigger() {
  const { toast } = useToast();
  return (
    <Button
      onPress={() =>
        toast({
          intent: 'success',
          title: 'Changes saved',
          message: 'Your changes are live.',
          duration: null,
        })
      }
    >
      Show toast
    </Button>
  );
}

export const FromProvider: Story = { render: () => <Demo /> };
export const TopRight: Story = { render: () => <Demo placement="top-right" /> };

/**
 * Every intent is a polite live region — including error.
 *
 * Alert derives its role from intent, because an error there is content the
 * user has navigated to. A toast arrives unbidden and often several at once,
 * so an assertive region would interrupt whatever is being read each time one
 * lands. Anything urgent enough to interrupt should not be transient.
 *
 * This is the deliberate difference from Alert, so it is asserted rather than
 * left as a comment someone later "fixes".
 */
export const AllIntentsArePolite: Story = {
  render: () => (
    <div>
      {INTENTS.map((intent) => (
        <Static key={intent} intent={intent} title={intent} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const toasts = canvas.getAllByRole('status');
    await expect(toasts).toHaveLength(INTENTS.length);
    await expect(canvas.queryAllByRole('alert')).toHaveLength(0);
  },
};

/**
 * The live region is the container, and it exists before any toast does.
 *
 * A region announced into existence at the same moment as its content is not
 * reliably read — assistive tech has to be watching the node before the text
 * lands in it. So the provider renders the region always, empty or not.
 */
export const RegionExistsBeforeAnyToast: Story = {
  render: () => <Demo />,
  play: async ({ canvas }) => {
    const region = canvas.getByRole('region', { name: 'Notifications' });
    await expect(region).toBeInTheDocument();
    await expect(region.children).toHaveLength(0);

    await expect(canvas.queryAllByRole('status')).toHaveLength(0);
  },
};

/** `useToast()` pushes into the queue, and dismissing removes it. */
export const QueueAddsAndRemoves: Story = {
  render: () => <Demo />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));

    const toast = await waitFor(() => canvas.getByRole('status'));
    await expect(toast).toHaveTextContent('Changes saved');

    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await waitFor(() =>
      expect(canvas.queryAllByRole('status')).toHaveLength(0),
    );
  },
};

/**
 * Auto-dismiss fires — and the timer is real, not decorative.
 *
 * A short duration is used so the assertion is about behaviour rather than
 * patience. The default is 5000ms.
 */
export const AutoDismisses: Story = {
  render: () => {
    const [gone, setGone] = React.useState(false);
    return gone ? (
      <span data-testid="gone">dismissed</span>
    ) : (
      <Toast
        id="auto"
        intent="success"
        title="Saved"
        duration={80}
        onDismiss={() => setGone(true)}
      />
    );
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByTestId('gone')).toBeInTheDocument());
  },
};

/**
 * Hovering pauses the countdown — WCAG 2.2.1.
 *
 * A toast that keeps counting down while being read takes its action away
 * mid-reach. Asserted by hovering and then waiting well past the duration:
 * if the timer were still running, the toast would be gone.
 *
 * Hover is safe to rely on here, unlike the pulse cases in AGENTS.md, and the
 * reason is the mechanism rather than the assertion. Those cases involve CSS
 * `:hover` and React Aria's `useHover`, both of which the browser withdraws on
 * its own. This pauses on a plain `mouseenter`, and `mouseleave` fires only
 * when the pointer actually leaves — so once paused, it stays paused.
 */
export const HoverPausesTheTimer: Story = {
  render: () => {
    const [gone, setGone] = React.useState(false);
    return gone ? (
      <span data-testid="gone">dismissed</span>
    ) : (
      <Toast
        id="pause"
        intent="information"
        title="Still here"
        duration={100}
        onDismiss={() => setGone(true)}
      />
    );
  },
  play: async ({ canvas, userEvent }) => {
    const toast = canvas.getByRole('status');
    await userEvent.hover(toast);

    await new Promise((r) => setTimeout(r, 300));
    await expect(canvas.queryByTestId('gone')).toBeNull();
    await expect(canvas.getByRole('status')).toBeInTheDocument();
  },
};

/**
 * The stack is capped, oldest dropped first.
 *
 * An unbounded queue covers the page it is reporting on. `limit` defaults to
 * 4; this drives six through a limit of 2 and checks which two survive.
 */
export const QueueIsCapped: Story = {
  render: () => {
    function Many() {
      const { toast } = useToast();
      return (
        <Button
          onPress={() => {
            for (const n of [1, 2, 3, 4, 5, 6])
              toast({ title: `Toast ${n}`, duration: null });
          }}
        >
          Add six
        </Button>
      );
    }
    return (
      <ToastProvider limit={2}>
        <Many />
      </ToastProvider>
    );
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add six' }));

    await waitFor(() => expect(canvas.getAllByRole('status')).toHaveLength(2));
    // The newest survive; the oldest are dropped.
    await expect(canvas.getByText('Toast 5')).toBeInTheDocument();
    await expect(canvas.getByText('Toast 6')).toBeInTheDocument();
    await expect(canvas.queryByText('Toast 1')).toBeNull();
  },
};

/**
 * The region must not swallow clicks where no toast is drawn.
 *
 * It is a fixed box spanning a corner of the viewport. Without
 * `pointer-events: none` on the container and `auto` on each toast, it would
 * block whatever sits underneath across that whole area.
 */
export const RegionDoesNotBlockThePage: Story = {
  render: () => <Demo />,
  play: async ({ canvas }) => {
    const region = canvas.getByRole('region', { name: 'Notifications' });
    await expect(getComputedStyle(region).pointerEvents).toBe('none');
  },
};
