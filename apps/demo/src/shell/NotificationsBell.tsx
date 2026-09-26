import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Icon,
  NotificationsPanel,
  Popover,
  Tooltip,
  type NotificationItem,
} from 'ionbase-ui';
import { Bell } from 'ionbase-icons/icons/bell';

import { listNotifications } from '../data/notifications';
import { useDemoSettings } from '../lib/demo-settings';
import { useResource } from '../lib/use-resource';

/**
 * The bell and what it opens. Loaded once by the shell, so the count is right
 * on every page before the panel is ever opened; read state is kept here for
 * the session. The bell's name carries the count — the dot on it is not read
 * — and the Popover's title names the panel.
 */
export function NotificationsBell() {
  const settings = useDemoSettings();
  const resource = useResource(
    (signal) => listNotifications(settings, signal),
    `${settings.state}|${settings.latency}`,
  );
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  // The loaded list, not the resource object — that is new every render, and
  // depending on it would reset every read change to what was loaded.
  const loaded = resource.status === 'ready' ? resource.data : null;
  useEffect(() => {
    if (loaded) setItems(loaded);
  }, [loaded]);

  const unread = items.filter((n) => !n.isRead).length;
  const name = unread
    ? `Notifications, ${unread} unread`
    : 'Notifications, none unread';

  return (
    <Popover
      title="Notifications"
      size="lg"
      isOpen={open}
      onOpenChange={setOpen}
      content={
        resource.status === 'error' ? (
          <Alert
            intent="error"
            title="Notifications didn't load"
            actions={
              <Button size="sm" variant="secondary" onPress={resource.retry}>
                Try again
              </Button>
            }
          >
            {resource.error.message}
          </Alert>
        ) : (
          <NotificationsPanel
            notifications={items}
            isLoading={resource.status === 'loading'}
            onReadChange={(id, isRead) =>
              setItems((all) =>
                all.map((n) => (n.id === id ? { ...n, isRead } : n)),
              )
            }
            onMarkAllRead={() =>
              setItems((all) => all.map((n) => ({ ...n, isRead: true })))
            }
            onOpen={() => setOpen(false)}
          />
        )
      }
    >
      {/* The Tooltip is the Popover's trigger and passes its props through. */}
      <Tooltip label="Notifications">
        <Button
          variant="tertiary"
          size="sm"
          aria-label={name}
          className="demo-bell"
          data-unread={unread > 0 || undefined}
          startIcon={<Icon as={Bell} size="sm" />}
        />
      </Tooltip>
    </Popover>
  );
}
