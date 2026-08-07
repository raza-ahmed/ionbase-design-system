import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { Button, Icon } from 'ionbase-ui';
import { Plus } from 'ionbase-icons/icons/plus';
import { ArrowRight } from 'ionbase-icons/icons/arrow-right';

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
        'primary-soft',
        'secondary',
        'tertiary',
        'destructive',
        'success',
      ],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
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

/*
 * Real icons from `ionbase-icons`, through `Icon`, rather than the hand-rolled
 * inline SVGs that used to live here.
 *
 * Two things the old ones could not show. They were drawn at `strokeWidth 2.5`
 * where the shipped set is filled outlines, so the preview was demonstrating a
 * weight no consumer would ever see. And bypassing `Icon` meant no `.ion-icon`
 * class, so the alignment rule added in 0.6.1 never applied to anything in this
 * file — the stories were exercising a path the documentation tells people not
 * to take.
 *
 * Per-icon subpaths, not the barrel: it is what the README tells consumers to
 * write, and a story that imports differently from the advice is a story that
 * quietly contradicts it.
 */
const PlusIcon = () => <Icon as={Plus} />;
const ArrowRightIcon = () => <Icon as={ArrowRight} />;

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
      <Button {...args} variant="primary-soft">
        Primary Soft
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
      <Button {...args} variant="success">
        Success
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
      <Button {...args} size="xl">
        XLarge
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
      <Button {...args} isDisabled variant="primary-soft">
        Primary Soft
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
      <Button {...args} isDisabled variant="success">
        Success
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

/**
 * The icon ladder per size, asserted from the rendered box rather than the
 * stylesheet.
 *
 * Small is 14, not 16 — its label is 14px, and a 16px icon out-weighted the
 * text it sat beside. Medium and Large keep icons that run ahead of their
 * labels (20 vs 16, 24 vs 18), which reads correctly at those sizes.
 *
 * XLarge repeats Large's 24 rather than continuing the climb, so for the first
 * time in the ladder the icon sits *behind* its label (24 vs 20). That is a
 * deliberate binding to `icon-size/lg`, not a stray number — every one of the
 * four rungs is bound, so this one is a choice rather than an oversight.
 * Asserted anyway: if it is ever resolved upward, this story is what fails and
 * asks to be updated.
 *
 * This is measured because nothing else measures it. Before this story the
 * suite asserted hover, focus, press and prop leakage, and not one pixel of
 * icon geometry — so the 16 -> 14 change had no coverage in either direction.
 * The centring assertion is here for the same reason: `.ion-icon` gained its
 * first stylesheet in 0.6.1, and a regression there would be invisible to
 * every other test.
 */
export const IconSizePerButtonSize: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Button size="sm" startIcon={<PlusIcon />}>
        Small
      </Button>
      <Button size="md" startIcon={<PlusIcon />}>
        Medium
      </Button>
      <Button size="lg" startIcon={<PlusIcon />}>
        Large
      </Button>
      <Button size="xl" startIcon={<PlusIcon />}>
        XLarge
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const expected = { Small: 14, Medium: 20, Large: 24, XLarge: 24 };

    for (const [label, px] of Object.entries(expected)) {
      const button = canvas.getByRole('button', { name: label });
      const svg = button.querySelector('svg');
      await expect(svg).not.toBeNull();

      const box = svg!.getBoundingClientRect();
      await expect(Math.round(box.width)).toBe(px);
      await expect(Math.round(box.height)).toBe(px);

      // The icon must also still centre against its label. Geometry, not
      // stylesheet: this is what actually reaches the eye.
      const labelEl = button.querySelector('.ion-button__label')!;
      const labelBox = labelEl.getBoundingClientRect();
      const iconMid = box.top + box.height / 2;
      const labelMid = labelBox.top + labelBox.height / 2;
      await expect(Math.abs(iconMid - labelMid)).toBeLessThan(0.5);
    }
  },
};

/**
 * Height per size, measured.
 *
 * All four now read the spacing scale — `spacing/32`, `40`, `48`, `56` — so a
 * change to any of them shows up in the token export and `verify-geometry.mjs`
 * has something to check.
 *
 * XLarge's 56 was the exception until the primitive was added: the scale jumped
 * 48 -> 64, so Figma held the height as a raw number that no export could see,
 * and button.css carried it as a literal. This story was written as the only
 * thing standing under it, and it is kept now that the binding exists — it
 * asserts the rendered pixel, not the mechanism behind it, so it stays honest
 * whichever way the value is supplied.
 */
export const HeightPerButtonSize: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">XLarge</Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const expected = { Small: 32, Medium: 40, Large: 48, XLarge: 56 };

    for (const [label, px] of Object.entries(expected)) {
      const button = canvas.getByRole('button', { name: label });
      await expect(Math.round(button.getBoundingClientRect().height)).toBe(px);
    }
  },
};
