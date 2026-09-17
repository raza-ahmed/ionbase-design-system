/*
 * Canned answers for the Assistant. Each one exercises a state of the
 * AssistantAnswer pattern: fully sourced, partly sourced, and out of scope.
 * Segments interleave text with citation markers so the markers land at the
 * claims they support, not in a pile at the end.
 */

export type Segment = string | { cite: number };

export interface Source {
  index: number;
  source: string;
  href?: string;
  passage: string;
}

export interface CannedAnswer {
  id: string;
  question: string;
  segments: Segment[];
  sources: Source[];
  /** `null` when there is no answer to rate — the pattern's empty state. */
  confidence: { level: 'low' | 'medium' | 'high'; basis: string } | null;
  notice?: { intent: 'warning' | 'information'; title: string; body: string };
}

export const ANSWERS: CannedAnswer[] = [
  {
    id: 'refunds',
    question: 'When can the refund agent act without asking someone?',
    segments: [
      'Only for duplicate charges of $100 or less. The refund policy allows a full refund when the same card is charged twice within 24 hours',
      { cite: 1 },
      ', and the approval rules set $100 as the limit an agent may refund on its own',
      { cite: 2 },
      '. Anything above that — like the $249 refund waiting in Runs — stops for a person, and every refund is written to the audit log whether or not it was approved',
      { cite: 3 },
      '.',
    ],
    sources: [
      {
        index: 1,
        source: 'Refund policy, section 2.1',
        href: 'https://example.com/policies/refunds#duplicates',
        passage:
          'Duplicate charges on the same card within 24 hours are refunded in full.',
      },
      {
        index: 2,
        source: 'Agent approval rules: Refund approver',
        href: 'https://example.com/agents/refund-approver/rules',
        passage:
          'Refunds up to $100.00 may be issued without approval. Above that, a person approves.',
      },
      {
        index: 3,
        source: 'Audit log retention standard',
        href: 'https://example.com/policies/audit',
        passage:
          'Every financial action by an agent is logged with its approver, or with “no approval required”.',
      },
    ],
    confidence: {
      level: 'high',
      basis: 'Three current policy documents agree',
    },
  },
  {
    id: 'missed-target',
    question: 'Which agents missed their success target last week?',
    segments: [
      'Two agents dropped below the 95% target that I can see. Expense auditor ran at 82%, mostly on receipts it could not read',
      { cite: 1 },
      ', and Chargeback responder ran at 76% after the card network changed its evidence format',
      { cite: 2 },
      '. Two of the four monitoring sources did not respond, so other agents may also have missed the target.',
    ],
    sources: [
      {
        index: 1,
        source: 'Run report: Expense auditor, week 37',
        href: 'https://example.com/reports/expense-auditor/w37',
        passage:
          '412 runs · 338 succeeded · 61 failures were unreadable receipt images.',
      },
      {
        index: 2,
        source: 'Run report: Chargeback responder, week 37',
        href: 'https://example.com/reports/chargeback-responder/w37',
        passage:
          '95 runs · 72 succeeded · failures began after the 11 September format change.',
      },
    ],
    confidence: {
      level: 'medium',
      basis: '2 of 4 monitoring sources; 2 did not respond',
    },
    notice: {
      intent: 'warning',
      title: 'Some sources were unavailable',
      body: 'The Platform and People ops run reports did not respond. This answer covers Finance and Support only.',
    },
  },
  {
    id: 'forecast',
    question: 'What will our cloud bill be next quarter?',
    segments: [
      'I can’t answer that from this workspace. I can see what agents spent on model tokens, but not your cloud provider’s bill or any forecast of it. Your finance team’s cost report is the place to look.',
    ],
    sources: [],
    confidence: null,
    notice: {
      intent: 'information',
      title: 'Outside what I can see',
      body: 'I only answer from agent runs, approvals and the policies connected to this workspace.',
    },
  },
];

export const SUGGESTIONS = ANSWERS.map((a) => ({
  id: a.id,
  question: a.question,
}));

/** Typed questions are matched loosely; anything unrecognised is out of scope. */
export function answerFor(question: string): CannedAnswer {
  const q = question.toLowerCase();
  if (/refund/.test(q)) return ANSWERS[0];
  if (/target|miss|fail|success/.test(q)) return ANSWERS[1];
  return { ...ANSWERS[2], question };
}

export const answerLength = (a: CannedAnswer) =>
  a.segments.reduce((n, s) => n + (typeof s === 'string' ? s.length : 0), 0);
