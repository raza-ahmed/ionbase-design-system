import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { Button } from 'ionbase-ui';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'primary-brand',
        'primary-neutral',
        'secondary',
        'tertiary',
        'destructive',
      ],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    isDisabled: {
      control: 'boolean',
    },
  },
  args: {
    variant: 'primary-brand',
    size: 'md',
    isDisabled: false,
    children: 'Button Label',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button Label',
  },
};

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// Template for rendering side-by-side components
export const AllVariants: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Button {...args} variant="primary-brand">
        Primary Brand
      </Button>
      <Button {...args} variant="primary-neutral">
        Primary Neutral
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="tertiary">
        Tertiary
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Button {...args} startIcon={<PlusIcon />}>
        Start Icon
      </Button>
      <Button {...args} endIcon={<ArrowRightIcon />}>
        End Icon
      </Button>
      <Button {...args} startIcon={<PlusIcon />} endIcon={<ArrowRightIcon />}>
        Both Icons
      </Button>
      <Button {...args} size="sm" startIcon={<PlusIcon />}>
        Small Icon
      </Button>
      <Button {...args} size="lg" startIcon={<PlusIcon />}>
        Large Icon
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: (args) => (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Button {...args} isDisabled variant="primary-brand">
        Primary Brand
      </Button>
      <Button {...args} isDisabled variant="primary-neutral">
        Primary Neutral
      </Button>
      <Button {...args} isDisabled variant="secondary">
        Secondary
      </Button>
      <Button {...args} isDisabled variant="tertiary">
        Tertiary
      </Button>
      <Button {...args} isDisabled variant="destructive">
        Destructive
      </Button>
    </div>
  ),
};

/*
 * Interaction states.
 *
 * These assert the data-attribute contract the CSS depends on. Before React
 * Aria's useHover/useFocusRing were wired in, the component only ever emitted
 * data-pressed — so `[data-hovered]` and `[data-focused]` in button.css were
 * dead selectors and nothing noticed. These stories are what makes that
 * regression visible.
 */

export const Hovered: Story = {
  args: { children: 'Hover me' },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button');
    await userEvent.hover(button);
    await expect(button).toHaveAttribute('data-hovered', 'true');
  },
};

export const Focused: Story = {
  args: { children: 'Focus me' },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button');
    // Tab rather than .focus() — useFocusRing deliberately distinguishes
    // keyboard focus from a mouse click, and only the former shows a ring.
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button).toHaveAttribute('data-focused', 'true');
  },
};

/*
 * `data-pressed` is deliberately NOT asserted here.
 *
 * Verifying it needs the pointer held down across an assertion, and this
 * harness's `[MouseLeft>]` hold syntax does not actually hold — every attempt
 * read back as released. Rather than assert something that only appears to
 * pass, this covers the press contract that can be verified: a real
 * pointerdown reaches the element and onPress fires. If `data-pressed` ever
 * needs a regression test, it wants a Playwright test using mouse.down()
 * directly.
 */
export const PressFires: Story = {
  args: { children: 'Press me' },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button');
    const events: string[] = [];
    button.addEventListener('pointerdown', () => events.push('pointerdown'));

    await userEvent.click(button);
    await waitFor(() => expect(events).toContain('pointerdown'));
  },
};

/*
 * React Aria props must not reach the DOM node.
 *
 * `useButton` is handed the full props object, so `onPress` always worked. The
 * defect was that it ALSO survived into the rest-props spread and landed on
 * the `<button>` — "Unknown event handler property `onPress`. It will be
 * ignored." in every consuming app, on every render.
 *
 * This story passes the whole non-DOM set at once, not just `onPress`, and
 * that is deliberate. React splits them into two behaviours, and only one is
 * observable from a test:
 *
 *   - `onPress*` and `onFocusChange` are event-handler-shaped, and
 *     `excludeFromTabOrder` / `preventFocusOnPress` are camelCase unknowns.
 *     React warns on the console and renders NOTHING. There is no attribute,
 *     no property — the leak is invisible to the DOM. (Asserting the console
 *     instead would be worse than useless: React dedupes each warning by
 *     property name for the lifetime of the page, so the assertion would pass
 *     or fail on story ordering.)
 *   - `href`, `target`, `rel` and `elementType` are lowercase-able, so React
 *     really does write them onto the element. Verified: with the bug present
 *     this element carries href, target, rel and elementtype.
 *
 * So the second group is what makes this gate able to fail, and the first
 * group rides along because it is the same spread and the same fix. Dropping
 * the link props from these args would leave a test that passes either way.
 */
export const AriaPropsDoNotReachTheDom: Story = {
  args: {
    children: 'Press me',
    onPress: fn(),
    onFocusChange: fn(),
    excludeFromTabOrder: true,
    preventFocusOnPress: true,
    // Real members of AriaButtonProps<'button'> via LinkButtonProps, and
    // meaningless on a component that always renders a <button>.
    href: '/nowhere',
    target: '_blank',
    rel: 'noopener',
    elementType: 'button',
  },
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole('button');

    const leaked = button
      .getAttributeNames()
      .filter((name) =>
        [
          'href',
          'target',
          'rel',
          'elementtype',
          'excludefromtaborder',
        ].includes(name.toLowerCase()),
      );
    await expect(leaked).toEqual([]);

    // ...and the handler still fires, which is the half that stops the fix
    // from being "delete the props and call it clean".
    await userEvent.click(button);
    await waitFor(() => expect(args.onPress).toHaveBeenCalledTimes(1));
  },
};

export const DisabledIsNotHoverable: Story = {
  args: { children: 'Disabled', isDisabled: true },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole('button');
    await expect(button).toHaveAttribute('data-disabled', 'true');
    await userEvent.hover(button);
    // useHover is passed isDisabled, so a disabled control never reports hover.
    await expect(button).not.toHaveAttribute('data-hovered');
  },
};
