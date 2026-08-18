import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { Alert, Button } from 'ionbase-ui';

const INTENTS = [
  'neutral',
  'primary',
  'success',
  'warning',
  'error',
  'information',
] as const;

const meta: Meta<typeof Alert> = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    intent: { control: 'select', options: INTENTS },
    emphasis: { control: 'select', options: ['subtle', 'solid'] },
    layout: { control: 'select', options: ['inline', 'banner'] },
  },
  args: {
    intent: 'information',
    emphasis: 'subtle',
    layout: 'inline',
    children: 'A short explanation of what happened and what to do about it.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Alert` (812:1902). `Intent` x `Emphasis` x `Layout`, with the parts as props rather than variants.\n\nIntents match `Badge` exactly, so a status mapped to one can be passed to the other.\n\n**The ARIA role is chosen by intent, not passed in.** `error` and `warning` render `role="alert"`, which interrupts a screen reader; the rest render `role="status"`, which waits for a pause. A page of `role="alert"` status messages talks over the user, and an error announced as a status gets missed.\n\n**Known:** solid `information` measures 3.44:1 in Dark against `text/on-color`, short of WCAG AA. It is tracked in `contrast-exceptions.json` and reported on every build. Solid `success` was listed here too at 3.69:1 Light; it is now 5.24:1, fixed by shifting the green primitives rather than re-pointing the role.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {};

export const Intents: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {INTENTS.map((intent) => (
        <Alert {...args} key={intent} intent={intent} title={intent} />
      ))}
    </div>
  ),
};

export const Solid: Story = {
  args: { emphasis: 'solid' },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {INTENTS.map((intent) => (
        <Alert {...args} key={intent} intent={intent} title={intent} />
      ))}
    </div>
  ),
};

export const Banner: Story = {
  args: { layout: 'banner', intent: 'warning' },
};

export const WithTitleAndActions: Story = {
  args: {
    intent: 'error',
    title: 'Upload failed',
    actions: (
      <>
        <Button variant="secondary" size="sm">
          Retry
        </Button>
        <Button variant="tertiary" size="sm">
          Details
        </Button>
      </>
    ),
  },
};

export const Dismissible: Story = {
  args: { intent: 'success', title: 'Saved', onDismiss: fn() },
};

export const WithoutIcon: Story = { args: { hideIcon: true } };

/**
 * The ARIA role follows the intent.
 *
 * `role="alert"` is an assertive live region — it interrupts whatever a screen
 * reader is saying. `role="status"` is polite and waits for a pause. Applying
 * one uniformly is the usual mistake in both directions: a page of assertive
 * status messages talks over the user, and an error announced politely is
 * missed while they are reading something else.
 *
 * This is derived rather than passed in, so a caller cannot get it wrong by
 * omission — which is exactly why it needs a test.
 */
export const RoleFollowsIntent: Story = {
  render: () => (
    <div>
      {INTENTS.map((intent) => (
        <Alert key={intent} intent={intent} data-testid={`alert-${intent}`}>
          {intent}
        </Alert>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const expected: Record<string, string> = {
      neutral: 'status',
      primary: 'status',
      success: 'status',
      information: 'status',
      warning: 'alert',
      error: 'alert',
    };
    for (const [intent, role] of Object.entries(expected)) {
      await expect(canvas.getByTestId(`alert-${intent}`)).toHaveAttribute(
        'role',
        role,
      );
    }
  },
};

/**
 * The icon is decorative and must not be announced.
 *
 * It repeats what the intent's colour and the copy already say. Left readable,
 * a screen reader announces a shape before the message in every alert on the
 * page.
 */
export const IconIsHiddenFromAssistiveTech: Story = {
  render: () => <Alert intent="error">Something went wrong.</Alert>,
  play: async ({ canvas }) => {
    const alert = canvas.getByRole('alert');
    const icon = alert.querySelector('.ion-alert__icon')!;
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
    // The live region carries the text alone.
    await expect(alert).toHaveTextContent('Something went wrong.');
  },
};

/**
 * Each intent renders its own glyph.
 *
 * In Figma these were briefly all `info`, because binding the icon to a single
 * instance-swap default discarded the per-intent glyphs — a success alert with
 * an info circle. Here they are separate components, and this asserts they stay
 * distinct rather than collapsing to one shared symbol.
 */
export const EachIntentHasItsOwnGlyph: Story = {
  render: () => (
    <div>
      {INTENTS.map((intent) => (
        <Alert key={intent} intent={intent} data-testid={`alert-${intent}`}>
          {intent}
        </Alert>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const paths: Record<string, string> = {};
    for (const intent of INTENTS) {
      const svg = canvas
        .getByTestId(`alert-${intent}`)
        .querySelector('.ion-alert__icon svg')!;
      paths[intent] = svg.innerHTML;
    }
    // success, warning and error are each distinct from the shared info glyph.
    await expect(paths.success).not.toBe(paths.information);
    await expect(paths.warning).not.toBe(paths.information);
    await expect(paths.error).not.toBe(paths.information);
    await expect(new Set(Object.values(paths)).size).toBe(4);
  },
};

/**
 * Banner drops its radius and side borders, keeping the block edges.
 *
 * A 1px rule at the viewport edge is invisible on one side and reads as a seam
 * on the other; the top and bottom are what separate a subtle banner from the
 * page behind it. Asserted from the resolved style, since the whole difference
 * between the two layouts is these four values.
 */
export const BannerMeetsItsEdges: Story = {
  render: () => (
    <div>
      <Alert intent="warning" layout="inline" data-testid="inline">
        inline
      </Alert>
      <Alert intent="warning" layout="banner" data-testid="banner">
        banner
      </Alert>
    </div>
  ),
  play: async ({ canvas }) => {
    const inline = getComputedStyle(canvas.getByTestId('inline'));
    const banner = getComputedStyle(canvas.getByTestId('banner'));

    await expect(inline.borderTopLeftRadius).toBe('8px');
    await expect(banner.borderTopLeftRadius).toBe('0px');

    await expect(banner.borderLeftWidth).toBe('0px');
    await expect(banner.borderRightWidth).toBe('0px');
    // ...but the block edges survive, which is the point.
    await expect(banner.borderTopWidth).toBe('1px');
    await expect(banner.borderBottomWidth).toBe('1px');
  },
};

/**
 * Dismiss is a 32px target around a 20px glyph, and only exists when handled.
 *
 * WCAG 2.2 SC 2.5.8 asks 24x24 minimum, so the box is what is measured rather
 * than the icon. Rendering the button without an `onDismiss` would offer an
 * action that does nothing, so its presence is tied to the handler.
 */
export const DismissTargetAndWiring: Story = {
  args: { onDismiss: fn() },
  render: (args) => <Alert {...args}>Dismiss me</Alert>,
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole('button', { name: 'Dismiss' });
    const box = button.getBoundingClientRect();
    await expect(Math.round(box.width)).toBe(32);
    await expect(Math.round(box.height)).toBe(32);

    await userEvent.click(button);
    await expect(args.onDismiss).toHaveBeenCalledTimes(1);
  },
};

export const NoDismissWithoutHandler: Story = {
  render: () => <Alert intent="success">Saved</Alert>,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  },
};
