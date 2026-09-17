import { read, type CallSettings } from './store';

/*
 * Run scripts. The pretend backend has no model: a run is a script played back
 * on timers by useRunEngine, so every state the AgentRun and HumanApproval
 * patterns name can be reached on demand. Step text is written in the user's
 * language, never as tool calls — the pattern's own rule.
 */

export type Risk = 'low' | 'medium' | 'high';

export interface WorkStep {
  kind: 'work';
  active: string;
  done: string;
  detail: string;
  /** Detail when this step is the one that fails, in the "fails" scenario. */
  failure?: string;
  ms: number;
}

export interface ApprovalStep {
  kind: 'approval';
  active: string;
  done: string;
  rejected: string;
  title: (amount?: string) => string;
  risk: Risk;
  lines: (amount?: string) => string[];
  approveLabel: string;
  rejectLabel: string;
  /** Present when the proposal can be amended; ApprovalGate shows Edit only then. */
  editable?: { label: string; initial: string };
}

export interface OutputStep {
  kind: 'output';
  active: string;
  done: string;
  output: string;
  outputIfRejected: string;
}

export type RunStep = WorkStep | ApprovalStep | OutputStep;

export interface RunScript {
  id: string;
  task: string;
  agent: string;
  requestedBy: string;
  model: string;
  steps: RunStep[];
}

export const SCRIPTS: RunScript[] = [
  {
    id: 'run_4821',
    task: 'Refund a duplicate charge',
    agent: 'Refund approver',
    requestedBy: 'Support inbox',
    model: 'Atlas M',
    steps: [
      {
        kind: 'work',
        active: 'Reading ticket #88213 from Maya Chen',
        done: 'Read ticket #88213 from Maya Chen',
        detail: '“I was charged twice for March. Can you fix this?”',
        ms: 1100,
      },
      {
        kind: 'work',
        active: 'Checking her billing history',
        done: 'Checked her billing history',
        detail: 'Two charges of $249.00 on 3 March, four seconds apart',
        ms: 1400,
      },
      {
        kind: 'work',
        active: 'Looking up the duplicate-charge policy',
        done: 'Found the duplicate-charge policy',
        detail: 'Refund in full. Refunds over $100 need a person to approve.',
        ms: 1000,
      },
      {
        kind: 'approval',
        active: 'Waiting for approval to send the refund',
        done: 'Refund approved',
        rejected: 'Refund not sent',
        title: (amount = '249.00') => `Refund $${amount} to Maya Chen`,
        risk: 'medium',
        lines: (amount = '249.00') => [
          `Amount: $${amount}, back to her Visa ending 4412`,
          'Reason: duplicate charge on 3 March',
          'Stopped here because refunds over $100 need a person.',
        ],
        approveLabel: 'Approve refund',
        rejectLabel: 'Reject',
        editable: { label: 'Refund amount (USD)', initial: '249.00' },
      },
      {
        kind: 'work',
        active: 'Sending the refund',
        done: 'Sent the refund',
        detail: 'Arrives in 5–10 business days · reference RF-20931',
        failure: 'The payment provider timed out. No money moved.',
        ms: 1600,
      },
      {
        kind: 'output',
        active: 'Writing to Maya',
        done: 'Wrote to Maya',
        output:
          'Hi Maya, you were right — we charged you twice on 3 March. I have refunded the second charge in full. It will reach your Visa ending 4412 in 5 to 10 business days, reference RF-20931. Sorry for the trouble, and thank you for telling us.',
        outputIfRejected:
          'Hi Maya, thanks for flagging the second charge on 3 March. A colleague is reviewing it and will reply within one business day. You do not need to do anything else.',
      },
    ],
  },
  {
    id: 'run_4822',
    task: 'Remove access for inactive accounts',
    agent: 'Access reviewer',
    requestedBy: 'Quarterly access review',
    model: 'Atlas L',
    steps: [
      {
        kind: 'work',
        active: 'Listing accounts with no sign-in for 90 days',
        done: 'Listed accounts with no sign-in for 90 days',
        detail: '14 accounts across Finance, Growth and Platform',
        ms: 1300,
      },
      {
        kind: 'work',
        active: 'Checking for open tickets and owned agents',
        done: 'Checked for open tickets and owned agents',
        detail: '2 accounts have open tickets and were left out',
        ms: 1500,
      },
      {
        kind: 'approval',
        active: 'Waiting for approval to remove access',
        done: 'Removal approved',
        rejected: 'Access left unchanged',
        title: () => 'Remove access for 12 inactive accounts',
        risk: 'high',
        lines: () => [
          'Signs them out everywhere and deletes their 7 API keys',
          'Their data is kept for 30 days, then deleted',
          'Stopped here because changing access always needs a person.',
        ],
        approveLabel: 'Remove access',
        rejectLabel: 'Keep access',
      },
      {
        kind: 'work',
        active: 'Removing access',
        done: 'Removed access',
        detail: '12 accounts signed out · 7 API keys deleted',
        failure:
          'The identity provider refused the request. No access was changed.',
        ms: 1800,
      },
      {
        kind: 'output',
        active: 'Writing the access-review summary',
        done: 'Wrote the access-review summary',
        output:
          'Removed access for 12 accounts with no sign-in since June. Two accounts with open tickets were left alone and are listed for the owners to check. All 7 API keys belonging to the removed accounts were deleted. Data for these accounts is kept until 17 October.',
        outputIfRejected:
          'Access review paused: removal of 12 inactive accounts was not approved, so nothing changed. The list is attached for the next review.',
      },
    ],
  },
  {
    id: 'run_4823',
    task: 'Send the renewal quote to Acme',
    agent: 'Renewal forecaster',
    requestedBy: 'Kwame Mensah',
    model: 'Atlas M',
    steps: [
      {
        kind: 'work',
        active: 'Pulling Acme’s usage for the year',
        done: 'Pulled Acme’s usage for the year',
        detail: 'Seats up 18%, spend flat',
        ms: 1200,
      },
      {
        kind: 'work',
        active: 'Drafting the renewal quote',
        done: 'Drafted the renewal quote',
        detail: 'Quote Q-2291 · $48,000 a year with a 12% multi-year discount',
        ms: 1400,
      },
      {
        kind: 'approval',
        active: 'Waiting for approval to email Acme',
        done: 'Email approved',
        rejected: 'Quote not sent',
        title: () => 'Email quote Q-2291 to jordan@acme.example',
        risk: 'low',
        lines: () => [
          'Attachment: Q-2291.pdf, $48,000 a year',
          'Stopped here because it goes to someone outside the company.',
        ],
        approveLabel: 'Send email',
        rejectLabel: 'Don’t send',
      },
      {
        kind: 'work',
        active: 'Sending the email',
        done: 'Sent the email',
        detail: 'Delivered to jordan@acme.example',
        failure: 'The mail server rejected the attachment. Nothing was sent.',
        ms: 1100,
      },
      {
        kind: 'output',
        active: 'Logging the quote in the CRM',
        done: 'Logged the quote in the CRM',
        output:
          'Quote Q-2291 sent to Jordan at Acme: $48,000 a year for three years, 12% below list. Follow-up task created for Kwame on 24 September.',
        outputIfRejected:
          'Quote Q-2291 was drafted but not sent. It is saved in the CRM as a draft for Kwame to review.',
      },
    ],
  },
];

export type RunOutcome =
  'waiting' | 'completed' | 'failed' | 'stopped' | 'rejected';

export interface RunSummary {
  id: string;
  task: string;
  agent: string;
  outcome: RunOutcome;
  startedMinutesAgo: number;
  durationSec: number | null;
  reviewers: { name: string; initials: string }[];
}

const REVIEWERS = [
  { name: 'Ada Reyes', initials: 'AR' },
  { name: 'Kwame Mensah', initials: 'KM' },
  { name: 'Lin Zhou', initials: 'LZ' },
  { name: 'Priya Natarajan', initials: 'PN' },
];

const HISTORY: RunSummary[] = [
  ['run_4823', 'waiting', 4, null, 1],
  ['run_4822', 'waiting', 11, null, 2],
  ['run_4821', 'waiting', 26, null, 1],
  ['run_4821', 'completed', 58, 212, 1],
  ['run_4823', 'completed', 95, 64, 3],
  ['run_4822', 'rejected', 140, 301, 4],
  ['run_4821', 'failed', 190, 48, 1],
  ['run_4823', 'stopped', 260, 22, 0],
  ['run_4821', 'completed', 330, 187, 2],
].map(([script, outcome, ago, duration, reviewers], i) => {
  const s = SCRIPTS.find((x) => x.id === script)!;
  return {
    id: i < 3 ? (script as string) : `${script}-h${i}`,
    task: s.task,
    agent: s.agent,
    outcome: outcome as RunOutcome,
    startedMinutesAgo: ago as number,
    durationSec: duration as number | null,
    reviewers: REVIEWERS.slice(0, reviewers as number),
  };
});

export function scriptFor(runId: string): RunScript | undefined {
  return SCRIPTS.find((s) => runId === s.id || runId.startsWith(`${s.id}-`));
}

export function summaryFor(runId: string): RunSummary | undefined {
  return HISTORY.find((r) => r.id === runId);
}

export async function listRuns(
  settings: CallSettings,
  signal: AbortSignal,
): Promise<RunSummary[]> {
  await read(settings, signal, 'The runs service did not respond (HTTP 503).');
  return settings.state === 'empty' ? [] : HISTORY;
}
