import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { Link, Icon } from 'ionbase-ui';
import { ArrowRight } from 'ionbase-icons/icons/arrow-right';
import { Plus } from 'ionbase-icons/icons/plus';

const meta: Meta<typeof Link> = {
  title: 'Components/Link',
  component: Link,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['inline', 'standalone'] },
    isDisabled: { control: 'boolean' },
  },
  args: {
    variant: 'inline',
    href: '/somewhere',
    children: 'Link',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Link` (774:1516). Two types x five states.\n\n`inline` is underlined in **every** state — a link inside a paragraph must not rely on colour alone (WCAG 1.4.1). `standalone` earns its lack of underline from context (a table cell, a list, a card footer) and underlines on hover.\n\n**There is no size prop, deliberately.** A link is inline and inherits its type from the text around it; icons are sized in `em` so they scale with it. Figma draws its variants at 16/24 because a variant must have a concrete size — that is a sample, not a specification.\n\nRenders an `<a>` with `href` and a `<button>` without one, the same judgment `NavItem` makes.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Link>;

const ArrowIcon = () => <Icon as={ArrowRight} />;
const PlusIcon = () => <Icon as={Plus} />;

export const Default: Story = {};

export const Standalone: Story = { args: { variant: 'standalone' } };

export const InProse: Story = {
  render: (args) => (
    <p style={{ maxWidth: '46ch', margin: 0 }}>
      Tokens are decided in Figma and exported into this repo. See the{' '}
      <Link {...args}>token architecture</Link> for how the four collections
      resolve, or read the <Link {...args}>naming decisions</Link> for why.
    </p>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
      <Link {...args} endIcon={<ArrowIcon />}>
        Trailing icon
      </Link>
      <Link {...args} startIcon={<PlusIcon />}>
        Leading icon
      </Link>
      <Link {...args} variant="standalone" endIcon={<ArrowIcon />}>
        Standalone
      </Link>
    </div>
  ),
};

export const Disabled: Story = { args: { isDisabled: true } };

export const AsButton: Story = {
  args: { href: undefined, onPress: fn(), children: 'Acts on this page' },
};

/**
 * The element follows what the caller passes, not an `as` prop.
 *
 * A link that does not navigate is a button, and shipping one as an anchor
 * breaks middle-click, "open in new tab" and the screen-reader announcement at
 * once. `NavItem` makes the same call; this asserts both directions so the
 * rule cannot drift between the two components.
 */
export const ElementMatchesIntent: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <Link href="/docs">Navigates</Link>
      <Link onPress={() => {}}>Acts</Link>
    </div>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Navigates' });
    await expect(link.tagName).toBe('A');
    await expect(link).toHaveAttribute('href', '/docs');

    const button = canvas.getByRole('button', { name: 'Acts' });
    await expect(button.tagName).toBe('BUTTON');
    await expect(button).toHaveAttribute('type', 'button');
  },
};

/**
 * A disabled link must not stay navigable.
 *
 * `aria-disabled` alone announces the state and changes nothing else — the
 * href is still clickable, still focusable, still middle-clickable. Dropping
 * the href and leaving the tab order is what actually disables it, and it is
 * the same treatment `NavItem` applies.
 */
export const DisabledLinkIsNotNavigable: Story = {
  render: () => (
    <Link href="/nowhere" isDisabled>
      Unavailable
    </Link>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByText('Unavailable').closest('a')!;
    await expect(link).toHaveAttribute('aria-disabled', 'true');
    await expect(link.getAttribute('href')).toBeNull();
    await expect(link.tabIndex).toBe(-1);
  },
};

/**
 * The underline contract, which is the entire Type axis.
 *
 * Inline is underlined at rest because a link in body copy distinguished only
 * by colour fails WCAG 1.4.1. Standalone is not, because its context already
 * says "interactive" — that is what lets it sit in a table cell without
 * changing how the cell reads.
 *
 * Asserted from the resolved style rather than the class name: the class is
 * what we wrote, `text-decoration-line` is what a reader actually gets.
 */
export const UnderlineDistinguishesTheTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <Link href="/a" variant="inline">
        Inline
      </Link>
      <Link href="/b" variant="standalone">
        Standalone
      </Link>
    </div>
  ),
  play: async ({ canvas }) => {
    const inline = canvas.getByRole('link', { name: 'Inline' });
    const standalone = canvas.getByRole('link', { name: 'Standalone' });

    await expect(getComputedStyle(inline).textDecorationLine).toBe('underline');
    await expect(getComputedStyle(standalone).textDecorationLine).toBe('none');
  },
};

/**
 * Standalone underlines on hover, so the affordance is deferred, never absent.
 *
 * `data-hovered` is a pulse in headless Chromium — see the rule in AGENTS.md —
 * so this observes the transition with a MutationObserver rather than sampling
 * the attribute after the fact. Reading the computed style instead would race
 * the same drop.
 */
export const StandaloneUnderlinesOnHover: Story = {
  render: () => (
    <Link href="/a" variant="standalone">
      Hover me
    </Link>
  ),
  play: async ({ canvas, userEvent }) => {
    const link = canvas.getByRole('link', { name: 'Hover me' });
    await expect(getComputedStyle(link).textDecorationLine).toBe('none');

    let underlinedWhileHovered = false;
    const observer = new MutationObserver(() => {
      if (link.getAttribute('data-hovered') === 'true') {
        underlinedWhileHovered =
          getComputedStyle(link).textDecorationLine === 'underline';
      }
    });
    observer.observe(link, {
      attributes: true,
      attributeFilter: ['data-hovered'],
    });

    try {
      await userEvent.hover(link);
      await waitFor(() => expect(underlinedWhileHovered).toBe(true));
    } finally {
      observer.disconnect();
    }
  },
};

/**
 * Icons inherit the link's colour and scale with its type.
 *
 * Both are `currentColor`/`em` rather than an `icon/*` token and an
 * `icon-size` rung, which is what keeps an icon from drifting from the text it
 * belongs to. The Figma component binds the label's colour token on the icon
 * vectors to depict the same thing, because Figma has no inheritance — the
 * icons were `icon/default` (near-black) on a blue link until that was caught.
 *
 * Measured at two inherited sizes, because a single size cannot tell a real
 * `em` from a hard-coded 16px.
 */
export const IconsInheritColourAndSize: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
      <span style={{ fontSize: '16px' }}>
        <Link href="/a" endIcon={<ArrowIcon />}>
          Sixteen
        </Link>
      </span>
      <span style={{ fontSize: '24px' }}>
        <Link href="/b" endIcon={<ArrowIcon />}>
          TwentyFour
        </Link>
      </span>
    </div>
  ),
  play: async ({ canvas }) => {
    for (const [name, px] of [
      ['Sixteen', 16],
      ['TwentyFour', 24],
    ] as const) {
      const link = canvas.getByRole('link', { name });
      const svg = link.querySelector('svg')!;
      const box = svg.getBoundingClientRect();

      // 1em against the inherited font size.
      await expect(Math.round(box.width)).toBe(px);
      await expect(Math.round(box.height)).toBe(px);

      // ...and the icon is the same colour as the label, not a separate role.
      const label = link.querySelector('.ion-link__label')!;
      await expect(getComputedStyle(svg.parentElement!).color).toBe(
        getComputedStyle(label).color,
      );
    }
  },
};

/**
 * Disabled recolours the icon too, which is the payoff of `currentColor`:
 * there is no second rule keeping them in step, so they cannot fall out of it.
 */
export const DisabledRecoloursIconWithLabel: Story = {
  render: () => (
    <Link href="/a" isDisabled endIcon={<ArrowIcon />}>
      Unavailable
    </Link>
  ),
  play: async ({ canvas }) => {
    const link = canvas.getByText('Unavailable').closest('a')!;
    const label = link.querySelector('.ion-link__label')!;
    const iconSlot = link.querySelector('.ion-link__icon-end')!;

    await expect(getComputedStyle(iconSlot).color).toBe(
      getComputedStyle(label).color,
    );
    // ...and it is actually the disabled colour, not merely consistent.
    const probe = document.createElement('span');
    probe.style.cssText =
      'position:fixed;visibility:hidden;color:var(--text-disabled)';
    document.body.appendChild(probe);
    const disabledColour = getComputedStyle(probe).color;
    probe.remove();

    await expect(getComputedStyle(label).color).toBe(disabledColour);
  },
};

/**
 * React Aria props must not reach the DOM node.
 *
 * `useLink`/`useButton` are handed the full props object, so `onPress` always
 * worked — the defect was that it ALSO survived into the rest-props spread and
 * landed on the element, logging "Unknown event handler property `onPress`. It
 * will be ignored." in every consuming app on every render. Button has had this
 * guard since 0.7.x; Link shipped in 0.10.0 without it, and the warning showed
 * up in a CI log.
 *
 * The assertion leans on the half React makes observable. `onPress*` and
 * `onFocusChange` are event-handler-shaped, so React warns and renders nothing
 * — invisible to the DOM. `elementType` and the anchor-only attributes are
 * lowercase-able, so they really are written onto the element, and those are
 * what make this able to fail.
 *
 * The button branch is the one under test because it strips MORE: `target`,
 * `rel` and `download` are valid on an `<a>` and meaningless on a `<button>`.
 */
export const AriaPropsDoNotReachTheDom: Story = {
  args: {
    href: undefined,
    children: 'Acts',
    onPress: fn(),
    onFocusChange: fn(),
    elementType: 'a',
    target: '_blank',
    rel: 'noopener',
    download: true,
  },
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole('button', { name: 'Acts' });

    const leaked = button
      .getAttributeNames()
      .filter((name) =>
        [
          'elementtype',
          'target',
          'rel',
          'download',
          'ping',
          'hreflang',
        ].includes(name.toLowerCase()),
      );
    await expect(leaked).toEqual([]);

    // ...and the handler still fires, which stops the fix being "drop the props".
    await userEvent.click(button);
    await waitFor(() => expect(args.onPress).toHaveBeenCalledTimes(1));
  },
};

/**
 * ...while a real link keeps its anchor attributes.
 *
 * The mirror of the above, and the reason the two strip lists are separate:
 * folding `target`/`rel` into one set would silently break every external
 * link in the system.
 */
export const AnchorAttributesSurvive: Story = {
  args: {
    href: 'https://example.com',
    children: 'External',
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'External' });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).not.toHaveAttribute('elementtype');
  },
};
