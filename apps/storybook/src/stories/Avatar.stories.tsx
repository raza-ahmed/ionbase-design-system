import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { Avatar, AvatarGroup, Icon } from 'ionbase-ui';
import { User } from 'lucide-react';
// A real photo, supplied for this repo's own demo — not stock art standing
// in for one. See the note on `Types` for how any consumer swaps their own.
import avatarPhoto from './assets/avatar-photo.jpg';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['mini', 'sm', 'md', 'lg'] },
    shape: { control: 'inline-radio', options: ['circle', 'square'] },
  },
  args: { initials: 'AB' },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Avatar` — Mini 24, Small 32, Medium 40, Large 48. Circle is `radius/full` at every size; square steps up with the box (xs / sm / md / md), which is concentric-corner arithmetic rather than one shared corner.\n\nContent is chosen by precedence — image, then initials, then icon — rather than by a `type` prop, so passing `src` and `initials` gives you the image with the initials as its alt fallback.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {(['mini', 'sm', 'md', 'lg'] as const).map((size) => (
        <Avatar key={size} {...args} size={size} />
      ))}
    </div>
  ),
};

export const Shapes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      {(['mini', 'sm', 'md', 'lg'] as const).map((size) => (
        <Avatar key={size} {...args} size={size} shape="square" />
      ))}
    </div>
  ),
};

/**
 * The three `Type` variants Figma defines: image, initials, icon.
 *
 * `avatarPhoto` is a real image, checked into `assets/avatar-photo.jpg`.
 * Swap it for a different one the same way any consumer would: replace the
 * file at that path, or point `src` at a URL instead. Nothing else about the
 * component changes.
 */
export const Types: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Avatar {...args} src={avatarPhoto} alt="Profile photo" />
      <Avatar {...args} initials="AB" />
      <Avatar {...args} initials={undefined} icon={<Icon as={User} />} />
    </div>
  ),
};

export const Group: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <AvatarGroup>
        <Avatar initials="KR" />
        <Avatar initials="AB" />
        <Avatar initials="EF" />
        <Avatar initials="ST" />
      </AvatarGroup>
      <AvatarGroup max={3}>
        <Avatar initials="KR" />
        <Avatar initials="AB" />
        <Avatar initials="EF" />
        <Avatar initials="ST" />
        <Avatar initials="JP" />
        <Avatar initials="CN" />
      </AvatarGroup>
      <AvatarGroup size="sm" shape="square" max={3}>
        <Avatar initials="KR" />
        <Avatar initials="AB" />
        <Avatar initials="EF" />
        <Avatar initials="ST" />
      </AvatarGroup>
    </div>
  ),
};

/** Figma: 24 / 32 / 40 / 48, with square corners xs / sm / md / md. */
export const RenderedGeometryMatchesFigma: Story = {
  render: (args) => (
    <div>
      {(['mini', 'sm', 'md', 'lg'] as const).map((size) => (
        <Avatar key={size} {...args} size={size} shape="square" alt={size} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const [size, px, radius] of [
      ['mini', 24, '4px'],
      ['sm', 32, '6px'],
      ['md', 40, '8px'],
      ['lg', 48, '8px'],
    ] as const) {
      const el = canvas.getByLabelText(size);
      await expect(Math.round(el.getBoundingClientRect().width)).toBe(px);
      await expect(getComputedStyle(el).borderRadius).toBe(radius);
    }
  },
};

/**
 * The overlap is a quarter of the avatar size — Figma's -6 / -8 / -10 / -12 at
 * Mini / Small / Medium / Large. Negative space cannot be a spacing token, so
 * it is derived from the size rather than written as four literals.
 */
export const GroupOverlapIsAQuarterOfTheSize: Story = {
  render: () => (
    <AvatarGroup size="md">
      <Avatar initials="AA" alt="first" />
      <Avatar initials="BB" alt="second" />
    </AvatarGroup>
  ),
  play: async ({ canvas }) => {
    const first = canvas.getByLabelText('first').getBoundingClientRect();
    const second = canvas.getByLabelText('second').getBoundingClientRect();

    // 40px avatars overlapping by 10 leaves 30px between their left edges.
    await expect(Math.round(second.left - first.left)).toBe(30);
  },
};

/** Overflow past `max` becomes a `+N` avatar with a real accessible name. */
export const OverflowCounts: Story = {
  render: () => (
    <AvatarGroup max={2}>
      <Avatar initials="AA" alt="first" />
      <Avatar initials="BB" alt="second" />
      <Avatar initials="CC" alt="third" />
      <Avatar initials="DD" alt="fourth" />
    </AvatarGroup>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('2 more')).toBeTruthy();
    await expect(canvas.queryByLabelText('third')).toBeNull();
  },
};

/**
 * Group defaults fill gaps only — an Avatar that already set `size` keeps it,
 * and non-Avatar children are not given `size`/`shape` as DOM attributes.
 */
export const GroupRespectsChildSizeAndSkipsNonAvatars: Story = {
  render: () => (
    <AvatarGroup size="lg">
      <Avatar initials="AA" alt="defaulted" />
      <Avatar initials="BB" alt="explicit" size="mini" />
      <span data-testid="not-avatar">x</span>
    </AvatarGroup>
  ),
  play: async ({ canvas, canvasElement }) => {
    const defaulted = canvas.getByLabelText('defaulted');
    const explicit = canvas.getByLabelText('explicit');
    await expect(Math.round(defaulted.getBoundingClientRect().width)).toBe(48);
    await expect(Math.round(explicit.getBoundingClientRect().width)).toBe(24);

    const stranger = canvas.getByTestId('not-avatar');
    await expect(stranger.getAttribute('size')).toBeNull();
    await expect(stranger.getAttribute('shape')).toBeNull();
    await expect(canvasElement.querySelectorAll('.ion-avatar').length).toBe(2);
  },
};

/** An avatar without an image still has to announce who it is — initials alone
 *  read as nonsense to a screen reader. */
export const InitialsAvatarIsLabelled: Story = {
  render: () => <Avatar initials="AB" alt="Ada Byron" />,
  play: async ({ canvas }) => {
    const el = canvas.getByLabelText('Ada Byron');
    await expect(el).toHaveAttribute('role', 'img');
  },
};

/**
 * With `src` present, the image wins over `initials` — Figma's precedence,
 * not a caller decision. The initials still matter: they become the `<img>`'s
 * `alt` fallback for a broken/slow-loading image, rather than being discarded.
 *
 * Crop is `object-fit: cover` inside `overflow: hidden`, so a non-square photo
 * fills the box without distorting rather than being letterboxed.
 */
export const WithImage: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Avatar src={avatarPhoto} initials="AB" alt="Profile photo" size="lg" />
      <Avatar
        src={avatarPhoto}
        initials="AB"
        alt="Profile photo"
        size="lg"
        shape="square"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const img = canvasElement.querySelector(
      '.ion-avatar__image',
    ) as HTMLImageElement;

    await expect(img).toBeTruthy();
    // Image wins: initials never render as visible text alongside it.
    await expect(img.parentElement?.textContent).toBe('');
    // Falls back to the same name a text-only avatar would announce.
    await expect(img.alt).toBe('Profile photo');
    await expect(getComputedStyle(img).objectFit).toBe('cover');
  },
};

/** A failing `src` falls through to initials rather than the broken-image glyph. */
export const BrokenImageFallsBackToInitials: Story = {
  render: () => (
    <Avatar
      src="/this-image-does-not-exist-404.png"
      initials="AB"
      alt="Ada Byron"
    />
  ),
  play: async ({ canvas, canvasElement }) => {
    // Wait for the error path: image gone, initials present, span labelled.
    await waitFor(() => {
      expect(canvasElement.querySelector('.ion-avatar__image')).toBeNull();
    });
    const avatar = canvas.getByLabelText('Ada Byron');
    await expect(avatar).toBeTruthy();
    await expect(avatar.textContent).toBe('AB');
  },
};

/**
 * Figma's `Show Ring`, `Show Top Indicator` and `Show Bottom Indicator`.
 *
 * The two indicators are separate booleans in Figma because the intent lives on
 * the nested `Status Indicator` instance, which a boolean cannot carry. Code
 * takes the intent directly, so passing one is what shows the mark — there is
 * no second `showIndicator` prop to keep in sync with it.
 */
export const RingAndIndicators: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <Avatar initials="AB" alt="Ada Byron" ring />
      <Avatar
        initials="AB"
        alt="Ada Byron"
        bottomIndicator="success"
        bottomIndicatorLabel="Online"
      />
      <Avatar
        initials="AB"
        alt="Ada Byron"
        topIndicator="primary"
        topIndicatorLabel="Verified"
      />
      <Avatar
        src={avatarPhoto}
        initials="AB"
        alt="Ada Byron"
        size="lg"
        ring
        topIndicator="primary"
        topIndicatorLabel="Verified"
        bottomIndicator="warning"
        bottomIndicatorLabel="Away"
      />
      <Avatar
        initials="AB"
        alt="Ada Byron"
        shape="square"
        size="lg"
        bottomIndicator="error"
        bottomIndicatorLabel="Offline"
      />
    </div>
  ),
};

/** Figma: 16 / 14 / 12 / 8, flush in the corner at every size. */
export const IndicatorGeometryMatchesFigma: Story = {
  render: () => (
    <div>
      {(['mini', 'sm', 'md', 'lg'] as const).map((size) => (
        <Avatar
          key={size}
          size={size}
          initials="AB"
          alt={size}
          bottomIndicator="success"
        />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    for (const [size, avatar, dot] of [
      ['mini', 24, 8],
      ['sm', 32, 12],
      ['md', 40, 14],
      ['lg', 48, 16],
    ] as const) {
      const el = canvas.getByLabelText(size);
      const indicator = el.querySelector(
        '.ion-avatar__indicator',
      ) as HTMLElement;

      await expect(Math.round(indicator.getBoundingClientRect().width)).toBe(
        dot,
      );

      // Flush in the corner: Figma writes the offset as `size - indicator`,
      // which is `right: 0`. Assert the edges rather than the offset, so the
      // test still means something if the CSS is expressed differently.
      const box = el.getBoundingClientRect();
      const mark = indicator.getBoundingClientRect();
      await expect(Math.round(mark.right)).toBe(Math.round(box.right));
      await expect(Math.round(mark.bottom)).toBe(Math.round(box.bottom));
      await expect(Math.round(box.width)).toBe(avatar);
    }
  },
};

/**
 * The ring is drawn INSIDE the avatar's edge, so it does not change the
 * footprint. An outline or a spread shadow would, and that would quietly break
 * the group's overlap arithmetic.
 */
export const RingDoesNotChangeTheFootprint: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Avatar initials="AB" alt="plain" size="lg" />
      <Avatar initials="AB" alt="ringed" size="lg" ring />
    </div>
  ),
  play: async ({ canvas }) => {
    const plain = canvas.getByLabelText('plain').getBoundingClientRect();
    const ringed = canvas.getByLabelText('ringed').getBoundingClientRect();

    await expect(Math.round(ringed.width)).toBe(Math.round(plain.width));
    await expect(Math.round(ringed.width)).toBe(48);
  },
};

/**
 * An indicator that means something has to say so.
 *
 * Where the name goes depends on whether there is an image, and that is not an
 * inconsistency: with no image the root is `role="img"` and therefore a leaf,
 * so nothing inside it would be announced and the names fold into its own
 * label. With an image the root has no role, so each indicator carries its own
 * hidden text instead.
 */
export const IndicatorNamesAreAnnouncedEitherWay: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Avatar
        initials="AB"
        alt="Ada Byron"
        bottomIndicator="success"
        bottomIndicatorLabel="Online"
      />
      <Avatar
        src={avatarPhoto}
        initials="AB"
        alt="Grace Hopper"
        bottomIndicator="warning"
        bottomIndicatorLabel="Away"
        data-testid="with-image"
      />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    // No image: one name, carrying both facts.
    const initialsAvatar = canvas.getByLabelText('Ada Byron, Online');
    await expect(initialsAvatar).toHaveAttribute('role', 'img');

    // Image: the <img> keeps the person's name, and the status rides alongside
    // it rather than being swallowed by a role that hides its own subtree.
    const withImage = canvas.getByTestId('with-image');
    await expect(withImage.getAttribute('role')).toBeNull();
    await expect(
      (withImage.querySelector('.ion-avatar__image') as HTMLImageElement).alt,
    ).toBe('Grace Hopper');
    await expect(withImage.textContent).toContain('Away');
    await expect(canvasElement.textContent).not.toContain('Online, Away');
  },
};

/**
 * An unlabelled indicator is decorative, and is treated as such rather than
 * being announced as an unnamed graphic.
 */
export const UnlabelledIndicatorIsHidden: Story = {
  render: () => (
    <Avatar initials="AB" alt="Ada Byron" bottomIndicator="success" />
  ),
  play: async ({ canvas }) => {
    const el = canvas.getByLabelText('Ada Byron');
    const indicator = el.querySelector('.ion-avatar__indicator');
    await expect(indicator).toHaveAttribute('aria-hidden', 'true');
  },
};
