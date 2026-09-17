/**
 * The status vocabulary the agentic tier shares: one union, one name per
 * status, one glyph per status. AgentActivityStep and ToolCall both read from
 * here, so a step and the tool call behind it can never disagree about what
 * "failed" looks like or is called.
 *
 * The glyphs differ in SHAPE, not only in the colour a stylesheet gives them,
 * so status survives greyscale and forced-colours mode (WCAG 1.4.1).
 */
import React from 'react';

export type AgentActivityStatus =
  'pending' | 'active' | 'done' | 'failed' | 'skipped';

export const STATUS_TEXT: Record<AgentActivityStatus, string> = {
  pending: 'Not started',
  active: 'In progress',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Skipped',
};

export const STATUS_GLYPHS: Record<
  AgentActivityStatus,
  () => React.ReactElement
> = {
  pending: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  active: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  done: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="m8.5 12 2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  failed: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="m9 9 6 6M15 9l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  skipped: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.5 12h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
};
