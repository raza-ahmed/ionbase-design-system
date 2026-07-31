import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { Logo, LogoMark } from '@ionbase-ui/react';

const meta: Meta<typeof Logo> = {
  title: 'Components/Logo',
  component: Logo,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'lg'] },
    wordmark: { control: 'inline-radio', options: ['vector', 'text'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Measured from Figma `Logo-Ionbase` (52:21369) — Small (24px mark) and Large (32px), each with two wordmark treatments.\n\n`wordmark="vector"` matches Figma\'s `Type=Logo`: a serif logotype, drawn as outlined artwork immune to the brand font not being loaded. `wordmark="text"` matches `Type=Icon`: a live, sans-serif Host Grotesk run, real and selectable. These are two different typefaces for two different contexts, not one word rendered two ways — confirmed by rendering both, not assumed from the variant names. The token bindings differ to match: the vector reads `icon/default`, the text reads `text/tertiary`, so this component keeps both distinct rather than forcing one `currentColor`.\n\nFigma also has a `Property=Name` axis (wordmark only, no mark), but both of its variants currently render the placeholder text "raza" in an unbound colour rather than real "IonBase" artwork. That looks like leftover debug content, not a shipped asset, so it is not implemented here — `LogoMark` already covers "no wordmark" for the cases that are real.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <Logo {...args} size="sm" />
      <Logo {...args} size="lg" />
    </div>
  ),
};

export const WordmarkKinds: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Logo {...args} wordmark="vector" />
      <Logo {...args} wordmark="text" />
    </div>
  ),
};

/** What `Header` actually renders — bare mark, no wordmark, sized to match
 *  the two Figma sizes. */
export const MarkOnly: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <LogoMark size="sm" />
      <LogoMark size="lg" />
    </div>
  ),
};

/**
 * Geometry pinned against Figma's measurements: 24px mark with a 4px gap at
 * Small, 32px with an 8px gap at Large.
 */
export const RenderedGeometryMatchesFigma: Story = {
  render: () => (
    <div>
      <Logo size="sm" />
      <Logo size="lg" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const logos = canvasElement.querySelectorAll('.ion-logo');
    const sm = logos[0] as HTMLElement;
    const lg = logos[1] as HTMLElement;

    const smMark = sm.querySelector('.ion-logo__mark') as HTMLElement;
    const lgMark = lg.querySelector('.ion-logo__mark') as HTMLElement;

    await expect(Math.round(smMark.getBoundingClientRect().width)).toBe(24);
    await expect(getComputedStyle(sm).gap).toBe('4px');
    await expect(Math.round(lgMark.getBoundingClientRect().width)).toBe(32);
    await expect(getComputedStyle(lg).gap).toBe('8px');
  },
};

/**
 * The vector wordmark carries no text of its own, so the whole lockup is
 * announced as "IonBase" via `role="img"`. The text wordmark already is real
 * text, so it must NOT also get `role="img"` — that would suppress the very
 * text it is trying to expose.
 *
 * Queried by wrapper, not by `aria-label` on the component itself: `Logo`
 * sets its own `role`/`aria-label` in `wordmark="vector"` mode, so a test
 * passing `aria-label` as a query hook would be overwritten by the
 * component's real logic rather than reflect it.
 */
export const VectorLockupIsLabelled: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div data-testid="vector-wrap">
        <Logo wordmark="vector" />
      </div>
      <div data-testid="text-wrap">
        <Logo wordmark="text" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const vector = canvasElement.querySelector(
      '[data-testid="vector-wrap"] .ion-logo',
    ) as HTMLElement;
    const text = canvasElement.querySelector(
      '[data-testid="text-wrap"] .ion-logo',
    ) as HTMLElement;

    await expect(vector).toHaveAttribute('role', 'img');
    await expect(vector).toHaveAttribute('aria-label', 'IonBase');
    await expect(text).not.toHaveAttribute('role');
    await expect(text.textContent).toContain('IonBase');
  },
};

/**
 * `LogoMark` alone is decorative by default; passing `label` makes it a
 * standalone accessible mark instead — e.g. a favicon-style link.
 *
 * Queried by wrapper for the same reason as above: `label` and `aria-hidden`
 * are exactly what this test verifies, so neither can double as the query
 * hook without risking a false pass.
 */
export const BareMarkAccessibility: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div data-testid="decorative-wrap">
        <LogoMark />
      </div>
      <div data-testid="labelled-wrap">
        <LogoMark label="IonBase home" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const decorative = canvasElement.querySelector(
      '[data-testid="decorative-wrap"] .ion-logo__mark',
    ) as HTMLElement;
    const labelled = canvasElement.querySelector(
      '[data-testid="labelled-wrap"] .ion-logo__mark',
    ) as HTMLElement;

    await expect(decorative).toHaveAttribute('aria-hidden', 'true');
    await expect(labelled).toHaveAttribute('role', 'img');
    await expect(labelled).toHaveAttribute('aria-label', 'IonBase home');
  },
};
