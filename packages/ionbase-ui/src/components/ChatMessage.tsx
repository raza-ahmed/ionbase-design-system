import React, { forwardRef, useId } from 'react';
import { Timestamp } from './timestamp.js';

export type ChatMessageFrom = 'person' | 'assistant';

export interface ChatMessageProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'children'
> {
  /**
   * Who wrote it. `person` is set apart — a tinted bubble on the trailing
   * side — so a long thread reads as turns; `assistant` spans the column,
   * since its answers carry lists, sources and tables.
   */
  from: ChatMessageFrom;
  /** The author's name, shown and read: "Ada Reyes", "Ionbase assistant". */
  author: React.ReactNode;
  /** A picture for the author — Avatar, AvatarGradient, LogoMark. Hidden from
   *  assistive tech: the name beside it says who. */
  avatar?: React.ReactNode;
  /** When it was sent. Rendered in a `<time>` with the exact instant. */
  timestamp?: Date | string;
  /** The text shown for the time — "10:42", "2 min ago" — in place of the
   *  default date and time. */
  timestampLabel?: React.ReactNode;
  /** Locale for the default time label. Pass it when rendering on a server. */
  locale?: string;
  /** Time zone for the default time label. */
  timeZone?: string;
  /** The message: text, StreamingText, Citations, a CitationList, an Alert. */
  children: React.ReactNode;
  /** What can be done with it — Copy, Retry, feedback. Buttons, after the
   *  content, in reading order. */
  actions?: React.ReactNode;
}

/**
 * ChatMessage — one turn in a transcript: who, when, what, and what can be
 * done with it.
 *
 * AN ARTICLE, NAMED BY ITS HEADER. Each message is an `<article>` labelled by
 * its author and time, so a screen reader moves message to message and hears
 * "Ada Reyes 10:42" before each. The avatar is decoration; the name says who.
 *
 * NOT A LIVE REGION. A thread that announced every message would read a
 * streaming answer out token by token — the reason StreamingText is not one
 * either. Say when an answer is ready once, from the thread, the way the
 * AssistantAnswer pattern does.
 *
 * It holds a message; it does not send, stream or store one.
 */
export const ChatMessage = forwardRef<HTMLElement, ChatMessageProps>(
  (
    {
      from,
      author,
      avatar,
      timestamp,
      timestampLabel,
      locale,
      timeZone,
      children,
      actions,
      className,
      ...rest
    },
    ref,
  ) => {
    const headerId = useId();
    return (
      <article
        ref={ref}
        aria-labelledby={headerId}
        {...rest}
        className={['ion-chat-message', `ion-chat-message--${from}`, className]
          .filter(Boolean)
          .join(' ')}
      >
        {avatar != null && (
          <span className="ion-chat-message__avatar" aria-hidden="true">
            {avatar}
          </span>
        )}
        <div className="ion-chat-message__main">
          <header id={headerId} className="ion-chat-message__header">
            <span className="ion-chat-message__author">{author}</span>
            {timestamp != null && (
              <span className="ion-chat-message__time">
                <Timestamp
                  value={timestamp}
                  label={timestampLabel}
                  locale={locale}
                  timeZone={timeZone}
                />
              </span>
            )}
          </header>
          <div className="ion-chat-message__body">{children}</div>
          {actions != null && (
            <div className="ion-chat-message__actions">{actions}</div>
          )}
        </div>
      </article>
    );
  },
);

ChatMessage.displayName = 'ChatMessage';
