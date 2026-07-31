import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, Button } from 'ionbase-ui';
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
      border: '1px solid var(--border-default)',
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
        color: 'var(--text-tertiary)',
      }}
    >
      {title}
    </code>
    {note && (
      <span
        style={{
          fontSize: 'var(--font-size-12)',
          color: 'var(--text-secondary)',
        }}
      >
        {note}
      </span>
    )}
  </div>
);

/**
 * The five rungs are the `icon-size` ladder verbatim, so `md` here and
 * `icon-size/md` in Figma are the same 20px.
 *
 * This is a breaking change: `md` used to be 24, which meant the word named
 * `icon-size/lg` in code and `icon-size/md` in Figma. Callers who want the old
 * `md` should ask for `lg`.
 */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {(
        [
          ['xs', 12],
          ['sm', 16],
          ['md', 20],
          ['lg', 24],
          ['xl', 32],
        ] as const
      ).map(([size, px]) => (
        <Cell key={size} title={`size="${size}"`} note={`${px}px`}>
          <Icon as={Plus} size={size} />
          <Icon as={Search} size={size} />
          <Icon as={Check} size={size} />
        </Cell>
      ))}
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
        <span style={{ color: 'var(--icon-default)' }}>
          <Icon as={Settings} size="md" />
        </span>
      </Cell>
      <Cell title="fg/danger/default">
        <span style={{ color: 'var(--icon-error)' }}>
          <Icon as={Trash2} size="md" />
        </span>
      </Cell>
      <Cell title="fg/warning/default">
        <span style={{ color: 'var(--icon-warning)' }}>
          <Icon as={TriangleAlert} size="md" />
        </span>
      </Cell>
      <Cell title="fg/link/default">
        <span style={{ color: 'var(--text-link)' }}>
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
        <Button startIcon={<Icon as={Plus} />}>Add item</Button>
      </Cell>
      <Cell title='label="Add item"' note="role=img + aria-label — icon alone">
        <Button aria-label="Add item">
          <Icon as={Plus} label="Add item" />
        </Button>
      </Cell>
    </div>
  ),
};

/**
 * Note the icons pass no `size`.
 *
 * Button sizes its own icons in CSS from `--icon-size-*`, and that rule wins
 * over the width/height attributes this component sets. Passing `size` here
 * would look like it mattered and change nothing — which is exactly the kind of
 * dead prop that gets copied into real code.
 */
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
      <Button size="sm" startIcon={<Icon as={Plus} />}>
        Small
      </Button>
      <Button size="md" startIcon={<Icon as={Plus} />}>
        Medium
      </Button>
      <Button size="lg" endIcon={<Icon as={ArrowRight} />}>
        Large
      </Button>
      <Button variant="destructive" startIcon={<Icon as={Trash2} />}>
        Delete
      </Button>
    </div>
  ),
};
