import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Avatar, AvatarGroup } from '@ionbase/react';
import { Icon } from '@ionbase/icons';
import { User } from 'lucide-react';
// Placeholder art, not a photo of a real person — see the note on `Types`
// below for how to swap in a real one.
import avatarPhoto from './assets/avatar-photo.svg';

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
 * `avatarPhoto` here is placeholder art generated for this repo, not a photo
 * of a real person — shipping an actual stock photo would be a licensing and
 * likeness question that has no place in a component library. Swap it for a
 * real image the same way any consumer would: drop a file in next to it and
 * point `src` at it, or pass a URL. Nothing else about the component changes.
 */
export const Types: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Avatar {...args} src={avatarPhoto} alt="Ada Byron" />
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
      <Avatar src={avatarPhoto} initials="AB" alt="Ada Byron" size="lg" />
      <Avatar
        src={avatarPhoto}
        initials="AB"
        alt="Ada Byron"
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
    await expect(img.alt).toBe('Ada Byron');
    await expect(getComputedStyle(img).objectFit).toBe('cover');
  },
};
