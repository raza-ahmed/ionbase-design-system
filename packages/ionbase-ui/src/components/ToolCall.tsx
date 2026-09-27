'use client';

import React, { forwardRef, useId, useState } from 'react';
import { useLocale } from 'react-aria';
import { DEFAULT_STATUS_LABELS, STATUS_GLYPHS } from './agent-status.js';
import type { AgentActivityStatus } from './agent-status.js';

export interface ToolCallProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  /**
   * What the call did, in the user's language — "Searched the invoice archive".
   * Required: the tool's function name is not a description of the work.
   */
  title: string;
  /** The tool's technical name, shown in monospace beside the title. */
  name?: string;
  /** The same vocabulary as AgentActivityStep, so the two never disagree. */
  status?: AgentActivityStatus;
  /**
   * What the agent passed in. Objects and arrays render as formatted JSON,
   * strings as they are. Redact secrets before passing it — this renders
   * exactly what it is given.
   */
  input?: unknown;
  /** What came back. Rendered as `input` is. */
  output?: unknown;
  /**
   * Why a `failed` call failed. Shown under the header whether or not the
   * details are expanded — a failure that takes a click to read is not read.
   */
  errorMessage?: React.ReactNode;
  /** How long the call took, in milliseconds. */
  durationMs?: number;
  /** Uncontrolled: whether the details start open. */
  defaultExpanded?: boolean;
  /** Controlled: whether the details are open. Pass `onExpandedChange` with it. */
  isExpanded?: boolean;
  onExpandedChange?: (isExpanded: boolean) => void;
  /** The status in words, as AgentActivityStep's. Pass the translation for `status`. */
  statusLabel?: string;
  /** Every other string the call renders, for translation. English by default. */
  labels?: ToolCallLabels;
}

export interface ToolCallLabels {
  /** "Input", above what the agent passed in. */
  input?: string;
  /** "Output", above what came back. */
  output?: string;
  /** Names the scrollable input — "Input to search_invoices". */
  inputName?: (tool: string) => string;
  /** Names the scrollable output — "Output from search_invoices". */
  outputName?: (tool: string) => string;
}

const DEFAULTS: Required<ToolCallLabels> = {
  input: 'Input',
  output: 'Output',
  inputName: (tool) => `Input to ${tool}`,
  outputName: (tool) => `Output from ${tool}`,
};

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m6 9 6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function formatPayload(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    // Circular structures and BigInt both throw. Showing something beats
    // taking the whole thread down with it.
    return String(value);
  }
}

/** "120ms", "1.4s" — in the locale's digits and units. */
function formatDuration(ms: number, locale: string): string {
  return ms < 1000
    ? new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'millisecond',
        unitDisplay: 'narrow',
        maximumFractionDigits: 0,
      }).format(ms)
    : new Intl.NumberFormat(locale, {
        style: 'unit',
        unit: 'second',
        unitDisplay: 'narrow',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(ms / 1000);
}

/**
 * ToolCall — the evidence behind one step of an agent run.
 *
 * AgentActivityStep says what the agent did in the user's language. ToolCall
 * is where the person checking that account goes next: which tool, with what
 * arguments, and what came back. The title is still plain language and still
 * required, so the technical detail supplements the account rather than
 * replacing it.
 *
 * COLLAPSED BY DEFAULT, EXCEPT THE FAILURE
 *
 * A run makes dozens of calls, and a thread of expanded JSON is unreadable.
 * But `errorMessage` renders outside the disclosure: evidence that takes a
 * click to reach is evidence nobody reads, and a failure is the one thing in
 * the call a reader must not miss.
 *
 * THE DETAILS ARE UNMOUNTED WHEN CLOSED — unlike Accordion, deliberately.
 * Accordion keeps collapsed panels for the form state inside them; a tool call
 * holds no user state, and its payloads can be megabytes of JSON multiplied by
 * every call in the thread.
 *
 * A CALL WITH NOTHING TO SHOW IS NOT A BUTTON. With no input and no output the
 * header renders as text: a disclosure that discloses nothing announces as
 * expandable and does nothing.
 *
 * THE PAYLOADS ARE FOCUSABLE. Each is a scroll container capped in height, and
 * a scroll container a keyboard user cannot focus is one they cannot scroll.
 *
 * It does not announce status changes. AgentActivity owns the run's live
 * region; a second one here would talk over it.
 */
export const ToolCall = forwardRef<HTMLDivElement, ToolCallProps>(
  (
    {
      title,
      name,
      status = 'pending',
      input,
      output,
      errorMessage,
      durationMs,
      defaultExpanded = false,
      isExpanded: isExpandedProp,
      onExpandedChange,
      statusLabel,
      labels,
      className,
      ...rest
    },
    ref,
  ) => {
    const { locale } = useLocale();
    const l = { ...DEFAULTS, ...labels };
    const [internal, setInternal] = useState(defaultExpanded);
    const isControlled = isExpandedProp !== undefined;
    const isExpanded = isControlled ? isExpandedProp : internal;
    const bodyId = useId();

    const hasInput = input !== undefined;
    const hasOutput = output !== undefined;
    const hasDetails = hasInput || hasOutput;
    const Glyph = STATUS_GLYPHS[status];

    const toggle = () => {
      const next = !isExpanded;
      if (!isControlled) setInternal(next);
      onExpandedChange?.(next);
    };

    const header = (
      <>
        <span className="ion-tool-call__glyph" aria-hidden="true">
          <Glyph />
        </span>
        <span className="ion-tool-call__heading">
          <span className="ion-tool-call__title">{title}</span>
          {name && <code className="ion-tool-call__name">{name}</code>}
        </span>
        {/* Status as text, never only as the glyph's colour. */}
        <span className="ion-visually-hidden">{`, ${statusLabel ?? DEFAULT_STATUS_LABELS[status]}`}</span>
        {durationMs !== undefined && (
          <span className="ion-tool-call__duration">
            {formatDuration(durationMs, locale)}
          </span>
        )}
        {hasDetails && (
          <span className="ion-tool-call__chevron" aria-hidden="true">
            <Chevron />
          </span>
        )}
      </>
    );

    return (
      <div
        {...rest}
        ref={ref}
        className={[
          'ion-tool-call',
          `ion-tool-call--${status}`,
          isExpanded && hasDetails ? 'ion-tool-call--expanded' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {hasDetails ? (
          <button
            type="button"
            className="ion-tool-call__header"
            aria-expanded={isExpanded}
            aria-controls={isExpanded ? bodyId : undefined}
            onClick={toggle}
          >
            {header}
          </button>
        ) : (
          <div className="ion-tool-call__header">{header}</div>
        )}

        {status === 'failed' && errorMessage && (
          <div className="ion-tool-call__error">{errorMessage}</div>
        )}

        {hasDetails && isExpanded && (
          <div id={bodyId} className="ion-tool-call__body">
            {hasInput && (
              <div className="ion-tool-call__section">
                <span className="ion-tool-call__label">{l.input}</span>
                <pre
                  className="ion-tool-call__payload"
                  tabIndex={0}
                  aria-label={l.inputName(name ?? title)}
                >
                  <code>{formatPayload(input)}</code>
                </pre>
              </div>
            )}
            {hasOutput && (
              <div className="ion-tool-call__section">
                <span className="ion-tool-call__label">{l.output}</span>
                <pre
                  className="ion-tool-call__payload"
                  tabIndex={0}
                  aria-label={l.outputName(name ?? title)}
                >
                  <code>{formatPayload(output)}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

ToolCall.displayName = 'ToolCall';
