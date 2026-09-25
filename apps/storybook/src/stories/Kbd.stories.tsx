import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Kbd } from 'ionbase-ui';

const meta: Meta<typeof Kbd> = {
  title: 'Components/Kbd',
  component: Kbd,
  tags: ['autodocs'],
  args: { shortcut: 'mod+k' },
  parameters: {
    docs: {
      description: {
        component:
          'A key, or a shortcut, as printed on the keyboard. Drawn in Figma as `Kbd` on the Command Palette page.\n\n**Write `mod`, not `ctrl` or `cmd`.** `mod+k` draws ⌘ K on a Mac and Ctrl K elsewhere, detected from the reader\'s platform. A screen reader hears the keys spelled out — "Command K" — not the symbols.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {};
export const SingleKey: Story = {
  args: { shortcut: undefined, children: '/' },
};

export const BothPlatforms: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
      <span data-testid="mac">
        <Kbd shortcut="mod+shift+p" platform="mac" />
      </span>
      <span data-testid="other">
        <Kbd shortcut="mod+shift+p" platform="other" />
      </span>
    </div>
  ),
  play: async ({ canvas }) => {
    const drawn = (id: string) =>
      [...canvas.getByTestId(id).querySelectorAll('.ion-kbd[aria-hidden]')].map(
        (k) => k.textContent,
      );
    // Each platform's own modifier order: ⇧ before ⌘ on a Mac.
    await expect(drawn('mac')).toEqual(['⇧', '⌘', 'P']);
    await expect(drawn('other')).toEqual(['Ctrl', 'Shift', 'P']);
  },
};

/** The symbols are hidden; the names are what is read. */
export const AScreenReaderHearsNamesNotSymbols: Story = {
  args: { shortcut: 'mod+shift+p', platform: 'mac' },
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('.ion-kbd-group') as HTMLElement;
    await expect(group.tagName).toBe('KBD');
    await expect(group.querySelector('.ion-visually-hidden')).toHaveTextContent(
      'Shift Command P',
    );
  },
};

export const AShortcutWithNoKeyThrows: Story = {
  render: function Render() {
    let message = 'no error';
    try {
      Kbd({ shortcut: 'mod+shift', platform: 'mac' });
    } catch (e) {
      message = (e as Error).message;
    }
    return <p data-testid="thrown">{message}</p>;
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('thrown')).toHaveTextContent(
      'has no key, only modifiers',
    );
  },
};

/** Figma `Kbd`: 20 tall, at least 20 wide. */
export const RenderedGeometryMatchesFigma: Story = {
  args: { shortcut: 'mod+k', platform: 'mac' },
  play: async ({ canvasElement }) => {
    const keys = [
      ...canvasElement.querySelectorAll('.ion-kbd'),
    ] as HTMLElement[];
    for (const k of keys) {
      await expect(k.getBoundingClientRect().height).toBe(20);
      await expect(k.getBoundingClientRect().width).toBeGreaterThanOrEqual(20);
    }
  },
};
