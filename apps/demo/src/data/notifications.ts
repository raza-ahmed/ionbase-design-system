import type { NotificationItem } from 'ionbase-ui';

import { href } from '../lib/router';
import { read, type CallSettings } from './store';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Timestamps are relative to the load, so the groups are always Today,
 * Yesterday and Earlier however late the demo is shown.
 */
function seed(now: number): NotificationItem[] {
  return [
    {
      id: 'n_approval',
      title: 'Invoice reconciler is waiting for you',
      description: 'It wants to issue a €1,240 refund to Northwind Robotics.',
      timestamp: new Date(now - 12 * MINUTE),
      href: href('runs/run_4823'),
    },
    {
      id: 'n_failed',
      title: 'Nightly CRM sync failed twice',
      description: 'The CRM returned HTTP 502. Its owner has been told.',
      timestamp: new Date(now - 2 * HOUR),
      href: href('runs'),
    },
    {
      id: 'n_mention',
      title: 'Mia mentioned you on Support triage',
      description: '“Can you check the escalation rule before Monday?”',
      timestamp: new Date(now - DAY - HOUR),
      href: href('agents'),
      isRead: true,
    },
    {
      id: 'n_digest',
      title: 'Your weekly digest is ready',
      description: 'Runs, spend and approvals for the week.',
      timestamp: new Date(now - 5 * DAY),
      href: href('overview'),
      isRead: true,
    },
  ];
}

export async function listNotifications(
  settings: CallSettings,
  signal: AbortSignal,
): Promise<NotificationItem[]> {
  await read(
    settings,
    signal,
    'The notifications service did not respond (HTTP 503).',
  );
  return settings.state === 'empty' ? [] : seed(Date.now());
}
