import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AvatarGradient,
  Button,
  ChatMessage,
  Citation,
  LogoMark,
} from 'ionbase-ui';

const AT = {
  asked: new Date('2026-09-27T10:42:00Z'),
  answered: new Date('2026-09-27T10:43:00Z'),
};

function Thread({ width = 560 }: { width?: number }) {
  return (
    <div style={{ display: 'grid', gap: 24, width }}>
      <ChatMessage
        from="person"
        author="Ada Reyes"
        avatar={
          <AvatarGradient
            size="sm"
            color="blue"
            initials="AR"
            alt="Ada Reyes"
          />
        }
        timestamp={AT.asked}
        locale="en-GB"
        timeZone="UTC"
      >
        What is our refund limit without approval?
      </ChatMessage>
      <ChatMessage
        from="assistant"
        author="Ionbase assistant"
        avatar={<LogoMark size="sm" label="Ionbase assistant" />}
        timestamp={AT.answered}
        locale="en-GB"
        timeZone="UTC"
        actions={
          <>
            <Button size="sm" variant="tertiary">
              Copy answer
            </Button>
            <Button size="sm" variant="tertiary">
              Ask again
            </Button>
          </>
        }
      >
        Agents can refund up to $200 on their own; anything above waits for a
        person. <Citation index={1} source="Refund policy" href="#policy" />
      </ChatMessage>
    </div>
  );
}

const meta: Meta<typeof ChatMessage> = {
  title: 'Components/ChatMessage',
  component: ChatMessage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "One turn in a transcript: who, when, what, and what can be done with it. An `<article>` named by its author and time, so a screen reader moves message to message. Not a live region — a thread that announced every message would read a streaming answer out token by token; say when an answer is ready once, from the thread.\n\nA person's message sits on the trailing side in a muted bubble; the assistant's spans the column.",
      },
    },
  },
  render: () => <Thread />,
};

export default meta;
type Story = StoryObj<typeof ChatMessage>;

export const Default: Story = {};

const articles = (el: HTMLElement) => within(el).getAllByRole('article');

/** Each message is an article, heard as its author then its time. */
export const IsAnArticleNamedByItsHeader: Story = {
  play: async ({ canvasElement }) => {
    const [asked, answered] = articles(canvasElement);
    await expect(asked).toHaveAccessibleName('Ada Reyes 27 Sept 2026, 10:42');
    await expect(answered).toHaveAccessibleName(
      'Ionbase assistant 27 Sept 2026, 10:43',
    );
  },
};

/** The time is a real `<time>` with the exact instant, whatever its label. */
export const TheTimeIsExact: Story = {
  render: () => (
    <ChatMessage
      from="person"
      author="Ada Reyes"
      timestamp={AT.asked}
      timestampLabel="2 min ago"
    >
      Hello
    </ChatMessage>
  ),
  play: async ({ canvasElement }) => {
    const time = canvasElement.querySelector('time')!;
    await expect(time).toHaveAttribute('datetime', '2026-09-27T10:42:00.000Z');
    await expect(time).toHaveTextContent('2 min ago');
    await expect(articles(canvasElement)[0]).toHaveAccessibleName(
      'Ada Reyes 2 min ago',
    );
  },
};

/** With no time, the name is the author alone. */
export const NoTimeTheAuthorAlone: Story = {
  render: () => (
    <ChatMessage from="assistant" author="Ionbase assistant">
      Hello
    </ChatMessage>
  ),
  play: async ({ canvasElement }) => {
    await expect(articles(canvasElement)[0]).toHaveAccessibleName(
      'Ionbase assistant',
    );
    await expect(canvasElement.querySelector('time')).toBeNull();
  },
};

/** The avatar is decoration; the name beside it says who. */
export const TheAvatarIsHidden: Story = {
  play: async ({ canvasElement }) => {
    const avatars = canvasElement.querySelectorAll('.ion-chat-message__avatar');
    await expect(avatars).toHaveLength(2);
    for (const a of avatars)
      await expect(a).toHaveAttribute('aria-hidden', 'true');
    await expect(within(canvasElement).queryByRole('img')).toBeNull();
  },
};

/** A thread never announces itself: no live region on a message. */
export const NotALiveRegion: Story = {
  play: async ({ canvasElement }) => {
    for (const a of articles(canvasElement)) {
      await expect(a).not.toHaveAttribute('aria-live');
      await expect(a).not.toHaveAttribute('role');
    }
    await expect(
      canvasElement.querySelector('[aria-live], [role="log"], [role="status"]'),
    ).toBeNull();
  },
};

/**
 * A person's turn sits on the trailing side, its avatar at the edge; the
 * assistant's spans the column.
 */
export const APersonIsOnTheTrailingSide: Story = {
  play: async ({ canvasElement }) => {
    const [asked, answered] = articles(canvasElement);
    const box = (el: Element) => el.getBoundingClientRect();
    const main = (a: Element) => a.querySelector('.ion-chat-message__main')!;
    const avatar = (a: Element) =>
      a.querySelector('.ion-chat-message__avatar')!;
    await expect(Math.round(box(avatar(asked)).right)).toBe(
      Math.round(box(asked).right),
    );
    await expect(box(main(asked)).width).toBeLessThan(box(asked).width * 0.8);
    await expect(Math.round(box(avatar(answered)).left)).toBe(
      Math.round(box(answered).left),
    );
    await expect(Math.round(box(main(answered)).right)).toBe(
      Math.round(box(answered).right),
    );
  },
};

/** Right to left, the sides swap. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <Thread />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [asked] = articles(canvasElement);
    const avatar = asked.querySelector('.ion-chat-message__avatar')!;
    await expect(Math.round(avatar.getBoundingClientRect().left)).toBe(
      Math.round(asked.getBoundingClientRect().left),
    );
  },
};

/**
 * A person's words are in a muted bubble — never the primary tint, which is
 * AILabel's, so nothing a person wrote reads as generated.
 */
export const APersonsBubbleIsMuted: Story = {
  play: async ({ canvasElement }) => {
    const [asked, answered] = articles(canvasElement);
    const probe = document.createElement('span');
    document.body.append(probe);
    const colour = (token: string) => {
      probe.style.backgroundColor = `var(${token})`;
      return getComputedStyle(probe).backgroundColor;
    };
    const bg = (a: Element) =>
      getComputedStyle(a.querySelector('.ion-chat-message__body')!)
        .backgroundColor;
    await expect(bg(asked)).toBe(colour('--surface-muted'));
    await expect(bg(asked)).not.toBe(colour('--surface-primary-subtle'));
    await expect(bg(answered)).toBe('rgba(0, 0, 0, 0)');
    probe.remove();
  },
};

/** The actions follow the content, so Tab reaches the source before them. */
export const ActionsFollowTheContent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('link', { name: /Source 1/ }).focus();
    await userEvent.tab();
    await expect(
      canvas.getByRole('button', { name: 'Copy answer' }),
    ).toHaveFocus();
    const [, answered] = articles(canvasElement);
    const body = answered.querySelector('.ion-chat-message__body')!;
    const actions = answered.querySelector('.ion-chat-message__actions')!;
    await expect(
      body.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  },
};

/** A long unbroken string wraps inside the message instead of widening it. */
export const LongWordsWrap: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <ChatMessage from="person" author="Ada Reyes">
        {'https://example.com/' + 'a'.repeat(200)}
      </ChatMessage>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [a] = articles(canvasElement);
    await expect(a.scrollWidth).toBeLessThanOrEqual(a.clientWidth);
  },
};

/** No client code: it renders on a server, time and all. */
export const ItRendersOnAServer: Story = {
  play: async () => {
    const html = renderToStaticMarkup(<Thread />);
    await expect(html).toContain('<article');
    await expect(html).toMatch(/datetime="2026-09-27T10:42:00\.000Z"/i);
    await expect(html).toContain('27 Sept 2026, 10:42');
  },
};

/** A long question wraps at most 80% across, so it still reads as a turn. */
export const ALongQuestionStaysATurn: Story = {
  render: () => (
    <div style={{ width: 560 }}>
      <ChatMessage from="person" author="Ada Reyes">
        {'Which of our agents refunded more than two hundred dollars last week, and did any of them do it without an approval on file? '.repeat(
          3,
        )}
      </ChatMessage>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [a] = articles(canvasElement);
    const main = a.querySelector('.ion-chat-message__main')!;
    await expect(main.getBoundingClientRect().width).toBeLessThanOrEqual(
      a.getBoundingClientRect().width * 0.8 + 1,
    );
    await expect(Math.round(main.getBoundingClientRect().right)).toBe(
      Math.round(a.getBoundingClientRect().right),
    );
  },
};
