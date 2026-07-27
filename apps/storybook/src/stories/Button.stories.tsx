import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@ionbase/react';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary-brand', 'primary-neutral', 'secondary', 'tertiary', 'destructive'],
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
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Button {...args} variant="primary-brand">Primary Brand</Button>
      <Button {...args} variant="primary-neutral">Primary Neutral</Button>
      <Button {...args} variant="secondary">Secondary</Button>
      <Button {...args} variant="tertiary">Tertiary</Button>
      <Button {...args} variant="destructive">Destructive</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Button {...args} size="sm">Small</Button>
      <Button {...args} size="md">Medium</Button>
      <Button {...args} size="lg">Large</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
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
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Button {...args} isDisabled variant="primary-brand">Primary Brand</Button>
      <Button {...args} isDisabled variant="primary-neutral">Primary Neutral</Button>
      <Button {...args} isDisabled variant="secondary">Secondary</Button>
      <Button {...args} isDisabled variant="tertiary">Tertiary</Button>
      <Button {...args} isDisabled variant="destructive">Destructive</Button>
    </div>
  ),
};
