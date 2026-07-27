import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '@ionbase/icons';
import {
  Plus,
  ArrowRight,
  Check,
  TriangleAlert,
  Search,
  Trash2,
  Settings,
  Download,
} from 'lucide-react';
import { Button } from '@ionbase/react';

const meta: Meta<typeof Icon> = {
  title: 'Foundations/Icon',
  component: Icon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The icon set is Lucide. This package does not re-export the 1,753 icons — a barrel that large defeats tree-shaking — so import the one you need from `lucide-react` and pass it as `as`. `Icon` supplies the sizing, colour inheritance and accessibility defaults.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

const Cell = ({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      padding: '1rem',
      border: '1px solid var(--border-neutral-muted)',
      borderRadius: 'var(--radius-8)',
      minWidth: '12rem',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {children}
    </div>
    <code
      style={{
        fontFamily: 'var(--font-family-mono)',
        fontSize: 'var(--font-size-12)',
        color: 'var(--fg-neutral-muted)',
      }}
    >
      {title}
    </code>
    {note && (
      <span
        style={{
          fontSize: 'var(--font-size-12)',
          color: 'var(--fg-neutral-secondary)',
        }}
      >
        {note}
      </span>
    )}
  </div>
);

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Cell title='size="sm"' note="16px — the size Button uses at Small">
        <Icon as={Plus} size="sm" />
        <Icon as={Search} size="sm" />
        <Icon as={Check} size="sm" />
      </Cell>
      <Cell title='size="md"' note="24px — Button at Medium and Large">
        <Icon as={Plus} size="md" />
        <Icon as={Search} size="md" />
        <Icon as={Check} size="md" />
      </Cell>
      <Cell title="no size" note="1em — scales with surrounding text">
        <span
          style={{ fontSize: '2rem', display: 'inline-flex', gap: '0.5rem' }}
        >
          <Icon as={Plus} />
          <Icon as={Search} />
        </span>
      </Cell>
    </div>
  ),
};

/**
 * Colour is never set by the component — `currentColor` means an icon takes the
 * text colour it sits in, so it themes without any icon-specific tokens.
 */
export const InheritsColour: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Cell title="fg/neutral/default">
        <span style={{ color: 'var(--fg-neutral-default)' }}>
          <Icon as={Settings} size="md" />
        </span>
      </Cell>
      <Cell title="fg/danger/default">
        <span style={{ color: 'var(--fg-danger-default)' }}>
          <Icon as={Trash2} size="md" />
        </span>
      </Cell>
      <Cell title="fg/warning/default">
        <span style={{ color: 'var(--fg-warning-default)' }}>
          <Icon as={TriangleAlert} size="md" />
        </span>
      </Cell>
      <Cell title="fg/link/default">
        <span style={{ color: 'var(--fg-link-default)' }}>
          <Icon as={Download} size="md" />
        </span>
      </Cell>
    </div>
  ),
};

/**
 * Decorative icons are hidden from assistive tech; meaningful ones get a name.
 * Passing `label` next to a visible text label makes a screen reader announce
 * the same thing twice, which is why it is opt-in rather than the default.
 */
export const Accessibility: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Cell title="decorative" note="aria-hidden — paired with a visible label">
        <Button startIcon={<Icon as={Plus} size="sm" />}>Add item</Button>
      </Cell>
      <Cell title='label="Add item"' note="role=img + aria-label — icon alone">
        <Button aria-label="Add item">
          <Icon as={Plus} size="sm" label="Add item" />
        </Button>
      </Cell>
    </div>
  ),
};

export const InButtons: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Button size="sm" startIcon={<Icon as={Plus} size="sm" />}>
        Small
      </Button>
      <Button size="md" startIcon={<Icon as={Plus} size="md" />}>
        Medium
      </Button>
      <Button size="lg" endIcon={<Icon as={ArrowRight} size="md" />}>
        Large
      </Button>
      <Button variant="destructive" startIcon={<Icon as={Trash2} size="md" />}>
        Delete
      </Button>
    </div>
  ),
};
