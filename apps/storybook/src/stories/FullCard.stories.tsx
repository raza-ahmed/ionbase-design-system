import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { ArrowRight } from 'lucide-react';
import { FullCard, Badge, Button, Icon } from 'ionbase-ui';

const HEADLINE =
  'AI Native Clinical Copilot for Documentation & Decision Support';

const DESCRIPTION =
  'CARE is an AI native clinical copilot platform designed to reduce documentation burden, provide real-time decision support, and streamline downstream administrative workflows for healthcare providers.';

const ExploreAction = () => (
  <Button variant="secondary" size="sm" endIcon={<Icon as={ArrowRight} />}>
    Explore Case Study
  </Button>
);

const meta: Meta<typeof FullCard> = {
  title: 'Components/Full Card',
  component: FullCard,
  tags: ['autodocs'],
  argTypes: {
    alignment: { control: 'inline-radio', options: ['right', 'left'] },
    headingLevel: { control: 'inline-radio', options: [2, 3, 4, 5, 6] },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          "Measured from Figma `Full Card` (592:857) — a full-bleed case study band: a text column beside a framed media panel, split down the middle. `alignment` is Figma's one variant axis, and its `right` / `left` name the **media**, not the text.\n\n**The `show*` booleans are gone.** Figma carries `Show Eyebrow`, `Show Description` and `Show Actions` because a Figma instance always holds every layer and needs a switch to hide one. React has no such constraint — an absent prop is the switch, the same call Badge made with `Show Dot`. Keeping both would let `showActions` and `actions` disagree.\n\n**Content is first in the DOM in both alignments.** CSS reverses the row for `media-left`, so reading and focus order stay headline → actions → media whichever way the design mirrors.\n\n**Three things in the design were not copied.** The 366px height falls out of the box model (48 + 8 + 310) so it is not restated; the body gap reads 9px, which is not on the spacing ladder, so it is `spacing/8`; and the left variant's media rule sits on the card's outer edge in Figma where the right variant's faces the text — read as a mirroring oversight, so both draw it on the inner edge here. The left variant also hard-codes a 48px top padding where the right binds `spacing/48`. Both are worth fixing in the file.\n\n**Size is a media query, not a prop.** The split holds from **1080** and stacks below it. The halves are even only while there is room for it: below roughly 1190 the media column holds at the panel plus a 48px gutter and the text column takes what is left, bottoming out near 375px of text at 1080. The panel is never the thing that gives — without that floor it shrank to fill its column, losing its gutter against the centre rule and reading as a full-bleed block right up to the moment the card stacked. Figma has no narrow variant, so the stacked layout is repo-owned, on the same reasoning as Header's device media queries.\n\n**Stacked puts the media on top in both alignments.** `column-reverse`, so the DOM order never changes. `alignment` names a horizontal side and stops meaning anything once there is one column, so it does not get to decide the vertical order too; and the panel is both the point of the card and the only part with a fixed height, so putting it second would push it below the fold on every narrow viewport. The vertical rule between the halves becomes a horizontal one under the panel, and the panel picks up the text's own left/right gutters — in the split it deliberately bleeds off the outer edge instead.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof FullCard>;

/** Figma `Alignment=Right` (590:189) — media on the right, text on the left. */
export const MediaRight: Story = {
  args: {
    alignment: 'right',
    headline: HEADLINE,
    description: DESCRIPTION,
    actions: <ExploreAction />,
  },
};

/** Figma `Alignment=Left` (592:858) — the same card mirrored. */
export const MediaLeft: Story = {
  args: {
    alignment: 'left',
    headline: HEADLINE,
    description: DESCRIPTION,
    actions: <ExploreAction />,
  },
};

/** Figma's `Show Eyebrow` is on: a Badge fills the slot. */
export const WithEyebrow: Story = {
  args: {
    headline: HEADLINE,
    description: DESCRIPTION,
    eyebrow: <Badge>Case Study</Badge>,
    actions: <ExploreAction />,
  },
};

/** Headline only — every slot but `headline` is optional, as in Figma. */
export const HeadlineOnly: Story = {
  args: { headline: HEADLINE },
};

/** Cards stack into a band; the shared 1px rules collapse into single lines. */
export const Stacked: Story = {
  render: () => (
    <>
      <FullCard
        alignment="right"
        eyebrow={<Badge>Healthcare</Badge>}
        headline={HEADLINE}
        description={DESCRIPTION}
        actions={<ExploreAction />}
      />
      <FullCard
        alignment="left"
        eyebrow={<Badge intent="primary">Fintech</Badge>}
        headline="Real-time Risk Scoring for Cross-border Payments"
        description={DESCRIPTION}
        actions={<ExploreAction />}
      />
    </>
  ),
};

/**
 * The media slot takes the screenshot itself, not the frame — the mat, the
 * 32/24 double radius and the three-sided rule are the component's job.
 */
export const WithMedia: Story = {
  args: {
    headline: HEADLINE,
    description: DESCRIPTION,
    actions: <ExploreAction />,
    media: (
      <div
        style={{
          height: 310,
          display: 'grid',
          placeItems: 'center',
          background:
            'linear-gradient(135deg, var(--surface-primary-tint), var(--surface-muted))',
          color: 'var(--text-secondary)',
          font: 'var(--type-body-sm)/1 var(--font-family-sans)',
        }}
      >
        Product screenshot
      </div>
    ),
  },
};

/**
 * `headingLevel` exists because the document outline is the page's decision,
 * not the card's. The `Type/H3` style Figma applies is the default, and it is
 * a style, not an outline position.
 */
export const HeadingLevel: Story = {
  args: { headline: HEADLINE, description: DESCRIPTION, headingLevel: 2 },
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector('.ion-full-card__headline')!;

    await expect(heading.tagName).toBe('H2');
  },
};

/**
 * Content precedes media in the DOM in both alignments — the mirror is a CSS
 * row reversal, so the accessible reading order does not flip with it.
 */
export const ReadingOrderSurvivesTheMirror: Story = {
  args: {
    alignment: 'left',
    headline: HEADLINE,
    description: DESCRIPTION,
    actions: <ExploreAction />,
  },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('.ion-full-card')!;
    const [first, second] = Array.from(card.children);

    await expect(first.className).toContain('ion-full-card__content');
    await expect(second.className).toContain('ion-full-card__media');
    await expect(card.className).toContain('ion-full-card--media-left');
  },
};

/**
 * The media panel is never *below* the content: level with it in the split,
 * above it once stacked.
 *
 * Asserted geometrically rather than against a breakpoint, so it holds at
 * whatever width the test browser happens to be — and still fails if the
 * stacked layout is ever flipped back to plain `column`, which is the
 * regression worth catching. Resize the preview past 1080 to see both halves
 * of it: the media queries key off the viewport, so a fixed-width wrapper
 * would not restyle the card and is not offered as a story.
 */
export const StackedPutsMediaOnTop: Story = {
  args: {
    alignment: 'left',
    headline: HEADLINE,
    description: DESCRIPTION,
    actions: <ExploreAction />,
  },
  play: async ({ canvasElement }) => {
    const content = canvasElement.querySelector('.ion-full-card__content')!;
    const media = canvasElement.querySelector('.ion-full-card__media')!;

    const contentTop = content.getBoundingClientRect().top;
    const mediaTop = media.getBoundingClientRect().top;

    await expect(mediaTop).toBeLessThanOrEqual(contentTop + 1);
  },
};

/**
 * Figma: the media mat is `surface/sunken` with the frame's white screen
 * inset by 8, and the card is ruled top and bottom at 1px.
 */
export const RenderedGeometryMatchesFigma: Story = {
  args: { headline: HEADLINE, description: DESCRIPTION },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('.ion-full-card') as HTMLElement;
    const mat = canvasElement.querySelector(
      '.ion-full-card__media-mat',
    ) as HTMLElement;
    const frame = canvasElement.querySelector(
      '.ion-full-card__media-frame',
    ) as HTMLElement;

    await expect(getComputedStyle(card).borderTopWidth).toBe('1px');
    await expect(getComputedStyle(card).borderBottomWidth).toBe('1px');
    await expect(getComputedStyle(mat).paddingTop).toBe('8px');
    await expect(getComputedStyle(frame).borderBottomWidth).toBe('0px');
  },
};
