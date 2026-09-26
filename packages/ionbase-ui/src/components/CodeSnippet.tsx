'use client';

import React, { forwardRef, useId, useState } from 'react';
import { Button } from './Button.js';
import { CopyButton, type CopyButtonProps } from './CopyButton.js';

export type CodeSnippetType = 'inline' | 'single' | 'multi';

export interface CodeSnippetProps {
  /** The code, as text. It is shown and copied exactly as given. */
  children: string;
  /**
   * `inline` sits in a sentence and has no copy button. `single` is one line
   * that scrolls sideways — a command. `multi` is a block — a config file, a
   * request.
   */
  type?: CodeSnippetType;
  /**
   * Names the block for a screen reader — "Install command". `single` and
   * `multi` are focusable regions, and a region needs a name. Default "Code";
   * with more than one snippet on a page, name each.
   */
  label?: string;
  /**
   * The copy button's name. Default "Copy code"; with more than one snippet
   * on a page, say which — "Copy install command".
   */
  copyLabel?: string;
  /** Default "Copied". */
  copiedLabel?: string;
  /** Leaves out the copy button — for code that is read, not run. */
  hideCopyButton?: boolean;
  /** `multi` only: lines shown before "Show more". Default 12. */
  maxLines?: number;
  /** Default "Show more". */
  showMoreLabel?: string;
  /** Default "Show less". */
  showLessLabel?: string;
  /**
   * Set as `language-<name>` on the `<code>`, the class highlighters look
   * for. IonBase does not highlight.
   */
  language?: string;
  onCopy?: CopyButtonProps['onCopy'];
  onCopyError?: CopyButtonProps['onCopyError'];
  className?: string;
}

/**
 * CodeSnippet — code shown as code: a command to run, a config to paste, a
 * name in a sentence.
 *
 * THE BLOCK IS A REGION YOU CAN SCROLL FROM THE KEYBOARD. Code does not wrap
 * — a wrapped command reads as two — so `single` and `multi` scroll sideways,
 * and a scroll area that cannot be focused cannot be scrolled without a
 * mouse. Each is a named, focusable region; the arrow keys scroll it.
 * Chromium has made a scroll area focusable by itself since 130, so a test
 * there passes without `tabIndex`; Safari does not, and axe's
 * `scrollable-region-focusable` is what catches it.
 *
 * THE WHOLE TEXT IS ALWAYS THERE. A long `multi` block is cut to `maxLines`
 * by height, not by dropping lines, so find-in-page still finds them, and the
 * copy button copies all of it whether it is expanded or not.
 *
 * COPYING IS CopyButton's. It confirms on the button and announces; the code
 * itself is on screen, so a copy that fails leaves it there to select.
 */
export const CodeSnippet = forwardRef<HTMLElement, CodeSnippetProps>(
  (
    {
      children,
      type = 'single',
      label = 'Code',
      copyLabel = 'Copy code',
      copiedLabel,
      hideCopyButton = false,
      maxLines = 12,
      showMoreLabel = 'Show more',
      showLessLabel = 'Show less',
      language,
      onCopy,
      onCopyError,
      className,
    },
    ref,
  ) => {
    const [isExpanded, setExpanded] = useState(false);
    const scrollId = useId();
    const codeClass = language ? `language-${language}` : undefined;

    if (type === 'inline') {
      return (
        <code
          ref={ref}
          className={[
            'ion-code-snippet',
            'ion-code-snippet--inline',
            codeClass,
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </code>
      );
    }

    // A trailing newline is not a line anyone reads.
    const lines = children.replace(/\n$/, '').split('\n').length;
    const isLong = type === 'multi' && lines > maxLines;
    const isCut = isLong && !isExpanded;

    const code = <code className={codeClass}>{children}</code>;
    const scroll = {
      id: scrollId,
      className: 'ion-code-snippet__scroll',
      role: 'region',
      'aria-label': label,
      tabIndex: 0,
      'data-cut': isCut || undefined,
    };

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={['ion-code-snippet', `ion-code-snippet--${type}`, className]
          .filter(Boolean)
          .join(' ')}
        style={
          isLong
            ? ({ '--ion-code-snippet-lines': maxLines } as React.CSSProperties)
            : undefined
        }
      >
        {type === 'multi' ? (
          <pre {...scroll}>{code}</pre>
        ) : (
          <div {...scroll}>{code}</div>
        )}
        {!hideCopyButton && (
          <CopyButton
            className="ion-code-snippet__copy"
            value={children}
            isIconOnly
            size="sm"
            label={copyLabel}
            copiedLabel={copiedLabel}
            onCopy={onCopy}
            onCopyError={onCopyError}
          />
        )}
        {isLong && (
          <Button
            className="ion-code-snippet__toggle"
            variant="tertiary"
            size="sm"
            aria-expanded={isExpanded}
            aria-controls={scrollId}
            onPress={() => setExpanded((open) => !open)}
          >
            {isExpanded ? showLessLabel : showMoreLabel}
          </Button>
        )}
      </div>
    );
  },
);

CodeSnippet.displayName = 'CodeSnippet';
