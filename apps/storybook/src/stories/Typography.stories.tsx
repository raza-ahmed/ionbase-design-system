import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * The classes below are generated from the Figma text styles — see
 * packages/tokens/scripts/build-typography.mjs. They reference breakpoint-scoped
 * `type/*` tokens, so resizing the viewport resizes the type with no media
 * query in the classes themselves. Narrow the preview to see it.
 */
const meta: Meta = {
  title: 'Foundations/Typography',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Generated from the Figma text styles. Every declaration is a token reference, so these classes resize across breakpoints on their own — drag the preview narrower to see it.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const Row = ({
  className,
  label,
  sample = 'The quick brown fox jumps over the lazy dog',
}: {
  className: string;
  label: string;
  sample?: string;
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(9rem, max-content) 1fr',
      gap: '1.5rem',
      alignItems: 'baseline',
      padding: '0.75rem 0',
      borderBottom: '1px solid var(--border-default)',
    }}
  >
    <code
      style={{
        fontFamily: 'var(--font-family-mono)',
        fontSize: 'var(--font-size-12)',
        color: 'var(--text-tertiary)',
      }}
    >
      .{className}
    </code>
    <div className={className}>{label ? `${label} — ${sample}` : sample}</div>
  </div>
);

const Group = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section style={{ marginBottom: '2.5rem' }}>
    <h2
      className="ion-text-h6"
      style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}
    >
      {title}
    </h2>
    {children}
  </section>
);

export const Scale: Story = {
  render: () => (
    <div style={{ maxWidth: '68rem' }}>
      <Group title="Display & Headings">
        <Row className="ion-text-display" label="Display" />
        <Row className="ion-text-h1" label="H1" />
        <Row className="ion-text-h2" label="H2" />
        <Row className="ion-text-h3" label="H3" />
        <Row className="ion-text-h4" label="H4" />
        <Row className="ion-text-h5" label="H5" />
        <Row className="ion-text-h6" label="H6" />
      </Group>

      <Group title="Body">
        <Row className="ion-text-body-lg" label="Body Large" />
        <Row className="ion-text-body-md" label="Body Medium" />
        <Row className="ion-text-body" label="Body Default" />
        <Row className="ion-text-body-sm" label="Body Small" />
        <Row className="ion-text-caption" label="Caption" />
      </Group>

      <Group title="Editorial">
        <Row className="ion-text-editorial-display" label="Editorial Display" />
        <Row className="ion-text-editorial-h1" label="Editorial H1" />
        <Row className="ion-text-editorial-h2" label="Editorial H2" />
        <Row className="ion-text-editorial-h3" label="Editorial H3" />
      </Group>
    </div>
  ),
};

/**
 * Emphasis is a weight-only modifier rather than four separate classes, because
 * that is the only thing the Figma "… Emphasis" styles change. The generator
 * asserts this and fails the build if it ever stops being true.
 */
export const Emphasis: Story = {
  render: () => (
    <div style={{ maxWidth: '68rem' }}>
      {[
        'ion-text-body-lg',
        'ion-text-body-md',
        'ion-text-body',
        'ion-text-body-sm',
      ].map((cls) => (
        <div
          key={cls}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            padding: '0.75rem 0',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div className={cls}>Regular — {cls}</div>
          <div className={`${cls} ion-text--emphasis`}>
            Emphasis — + .ion-text--emphasis
          </div>
        </div>
      ))}
    </div>
  ),
};
