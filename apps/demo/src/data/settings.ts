import { read, write, type CallSettings } from './store';

export interface NotificationSettings {
  approvalEmails: boolean;
  failureAlerts: boolean;
  weeklyDigest: boolean;
}

export interface WorkspaceDefaults {
  defaultModel: string;
  retentionDays: '30' | '90' | '365';
  redactPii: boolean;
  approvalForNewAgents: boolean;
}

export interface WorkspaceSettings {
  workspaceName: string;
  plan: 'Team' | 'Enterprise';
  notifications: NotificationSettings;
  defaults: WorkspaceDefaults;
  deletionScheduledFor: string | null;
}

let server: WorkspaceSettings = {
  workspaceName: 'Northwind Robotics',
  plan: 'Team',
  notifications: {
    approvalEmails: true,
    failureAlerts: true,
    weeklyDigest: false,
  },
  defaults: {
    defaultModel: 'atlas-m',
    retentionDays: '90',
    redactPii: true,
    approvalForNewAgents: true,
  },
  deletionScheduledFor: null,
};

export async function getSettings(
  settings: CallSettings,
  signal: AbortSignal,
): Promise<WorkspaceSettings> {
  await read(settings, signal, 'Settings could not be loaded (HTTP 503).');
  return structuredClone(server);
}

export async function saveNotification(
  key: keyof NotificationSettings,
  value: boolean,
  settings: CallSettings,
): Promise<void> {
  await write(settings, 'The notification service did not respond.');
  // Partial: the page loaded, but one channel's provider is down — so the
  // revert-on-failure path can be demonstrated on a working panel.
  if (settings.state === 'partial' && key === 'weeklyDigest') {
    throw new Error('The email provider rejected the change (HTTP 502).');
  }
  server = {
    ...server,
    notifications: { ...server.notifications, [key]: value },
  };
}

export interface DefaultsSaveResult {
  saved: WorkspaceDefaults;
  /** Fields the server refused, with why. Empty when everything saved. */
  rejected: Partial<Record<keyof WorkspaceDefaults, string>>;
}

export async function saveDefaults(
  next: WorkspaceDefaults,
  settings: CallSettings,
): Promise<DefaultsSaveResult> {
  await write(
    settings,
    'Nothing was saved: the settings service did not respond.',
  );
  const rejected: DefaultsSaveResult['rejected'] = {};
  // Partial: a 365-day retention needs a plan this workspace doesn't have.
  if (
    settings.state === 'partial' &&
    next.retentionDays !== server.defaults.retentionDays
  ) {
    rejected.retentionDays =
      'Retention longer than 90 days needs the Enterprise plan.';
  }
  server = {
    ...server,
    defaults: {
      ...next,
      retentionDays: rejected.retentionDays
        ? server.defaults.retentionDays
        : next.retentionDays,
    },
  };
  return { saved: structuredClone(server.defaults), rejected };
}

/*
 * What the app shell's banners need, readable from any route. A real app
 * would get this from its session or a status endpoint; here the shell
 * subscribes to the same fixture Settings writes, so scheduling a deletion
 * there puts the banner on every page at once.
 */
export interface WorkspaceNotice {
  workspaceName: string;
  deletionScheduledFor: string | null;
}
let notice: WorkspaceNotice = {
  workspaceName: server.workspaceName,
  deletionScheduledFor: server.deletionScheduledFor,
};
const noticeListeners = new Set<() => void>();
export function subscribeWorkspaceNotice(listener: () => void) {
  noticeListeners.add(listener);
  return () => void noticeListeners.delete(listener);
}
export const workspaceNotice = () => notice;

export async function scheduleDeletion(
  scheduled: boolean,
  settings: CallSettings,
): Promise<string | null> {
  await write(
    settings,
    'The workspace service did not respond. Nothing changed.',
  );
  server = {
    ...server,
    deletionScheduledFor: scheduled
      ? new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
      : null,
  };
  notice = {
    workspaceName: server.workspaceName,
    deletionScheduledFor: server.deletionScheduledFor,
  };
  for (const listener of noticeListeners) listener();
  return server.deletionScheduledFor;
}
