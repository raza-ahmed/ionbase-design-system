import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { Tabs, TabItem } from '@ionbase-ui/react';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['pill', 'underline'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: { type: 'pill', size: 'md', 'aria-label': 'Sections' },
  parameters: {
    docs: {
      description: {
        component:
          'Geometry measured from the Figma `Tabs Item` (156:259) and `Tabs` (157:126) components. Behaviour — roving tabindex, arrow-key navigation, the tab/panel ARIA pairing — comes from React Aria. Only the horizontal orientation is implemented; Figma also defines vertical.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const items = (
  <>
    <TabItem key="overview" title="Overview">
      Overview panel content.
    </TabItem>
    <TabItem key="activity" title="Activity">
      Activity panel content.
    </TabItem>
    <TabItem key="settings" title="Settings">
      Settings panel content.
    </TabItem>
  </>
);

export const Pill: Story = {
  args: { type: 'pill' },
  render: (args) => <Tabs {...args}>{items}</Tabs>,
};

export const Underline: Story = {
  args: { type: 'underline' },
  render: (args) => <Tabs {...args}>{items}</Tabs>,
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div
          key={size}
          style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}
        >
          <code
            style={{
              fontFamily: 'var(--font-family-mono)',
              fontSize: 'var(--font-size-12)',
              color: 'var(--text-tertiary)',
              minWidth: '2rem',
            }}
          >
            {size}
          </code>
          <Tabs {...args} type="pill" size={size} aria-label={`Pill ${size}`}>
            {items}
          </Tabs>
          <Tabs
            {...args}
            type="underline"
            size={size}
            aria-label={`Underline ${size}`}
          >
            {items}
          </Tabs>
        </div>
      ))}
    </div>
  ),
};

export const WithDisabledTab: Story = {
  render: (args) => (
    <Tabs {...args} disabledKeys={['activity']}>
      {items}
    </Tabs>
  ),
};

/*
 * Behaviour assertions.
 *
 * Server rendering shows no tab selected — React Stately picks the first one in
 * an effect — so the default-selection assertion below is what confirms it
 * actually resolves on the client rather than leaving an empty panel.
 */
export const SelectsFirstByDefault: Story = {
  render: (args) => <Tabs {...args}>{items}</Tabs>,
  play: async ({ canvas }) => {
    const tabs = canvas.getAllByRole('tab');
    await waitFor(() =>
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true'),
    );
    await expect(tabs[0]).toHaveAttribute('data-selected', 'true');
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent(
      'Overview panel content.',
    );
  },
};

export const ClickSelects: Story = {
  render: (args) => <Tabs {...args}>{items}</Tabs>,
  play: async ({ canvas, userEvent }) => {
    const tabs = canvas.getAllByRole('tab');
    await userEvent.click(tabs[2]);
    await waitFor(() =>
      expect(tabs[2]).toHaveAttribute('aria-selected', 'true'),
    );
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent(
      'Settings panel content.',
    );
  },
};

/** Arrow keys move between tabs — the roving tabindex React Aria provides. */
export const ArrowKeyNavigation: Story = {
  render: (args) => <Tabs {...args}>{items}</Tabs>,
  play: async ({ canvas, userEvent }) => {
    const tabs = canvas.getAllByRole('tab');
    await userEvent.click(tabs[0]);
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true'),
    );
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true'),
    );
  },
};

/** The same data-attribute contract the CSS depends on, as on Button. */
export const StateAttributes: Story = {
  render: (args) => (
    <Tabs {...args} disabledKeys={['activity']}>
      {items}
    </Tabs>
  ),
  play: async ({ canvas, userEvent }) => {
    const tabs = canvas.getAllByRole('tab');

    await userEvent.hover(tabs[2]);
    await waitFor(() =>
      expect(tabs[2]).toHaveAttribute('data-hovered', 'true'),
    );

    // A disabled tab must never report hover — useHover is passed isDisabled.
    await expect(tabs[1]).toHaveAttribute('data-disabled', 'true');
    await userEvent.hover(tabs[1]);
    await expect(tabs[1]).not.toHaveAttribute('data-hovered');
  },
};

/*
 * Rendered geometry, not token values.
 *
 * The tokens were correct and every value assert-checked, yet items shipped
 * 16px too tall: `<button>` inherits border-box from the UA stylesheet but
 * `<div>` does not, so `min-height` sized against the content box. Asserting
 * the measured box is the only check that catches that class of bug.
 */
export const RenderedHeightMatchesTokens: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Tabs {...args} key={size} size={size} aria-label={size}>
          {items}
        </Tabs>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const expected: Record<string, number> = { sm: 32, md: 40, lg: 48 };
    for (const [size, height] of Object.entries(expected)) {
      const list = canvas.getByRole('tablist', { name: size });
      const tab = list.querySelector('.ion-tabs__item') as HTMLElement;
      await expect(Math.round(tab.getBoundingClientRect().height)).toBe(height);
    }
  },
};
