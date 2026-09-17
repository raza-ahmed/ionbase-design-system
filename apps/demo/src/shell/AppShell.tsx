import { useEffect, useState, type ReactNode } from 'react';
import {
  Avatar,
  Button,
  Header,
  Icon,
  Logo,
  NavItem,
  Tooltip,
} from 'ionbase-ui';
import { Bell } from 'ionbase-icons/icons/bell';
import { Bot } from 'ionbase-icons/icons/bot';
import { LayoutDashboard } from 'ionbase-icons/icons/layout-dashboard';
import { ListChecks } from 'ionbase-icons/icons/list-checks';
import { MessageSquare } from 'ionbase-icons/icons/message-square';
import { Settings } from 'ionbase-icons/icons/settings';

import { href, type Route } from '../lib/router';
import { DemoControls } from './DemoControls';

const NAV: { route: Route; label: string; icon: typeof Bot }[] = [
  { route: 'overview', label: 'Overview', icon: LayoutDashboard },
  { route: 'agents', label: 'Agents', icon: Bot },
  { route: 'runs', label: 'Runs', icon: ListChecks },
  { route: 'assistant', label: 'Assistant', icon: MessageSquare },
  { route: 'settings', label: 'Settings', icon: Settings },
];

/**
 * The PageShell pattern: Header with brand / navigation / account, one named
 * <main>, and the shell always rendered — a slow or failed page keeps its
 * navigation. ToastProvider is mounted once, above this, in App.
 */
export function AppShell({
  route,
  children,
}: {
  route: Route | null;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating from the mobile menu should close it.
  useEffect(() => setMenuOpen(false), [route]);

  return (
    <div className="demo-app">
      <Header
        menuLabel="Main menu"
        open={menuOpen}
        onOpenChange={setMenuOpen}
        brand={
          <a href={href('overview')} className="demo-brand">
            <Logo size="sm" wordmark="vector" />
            <span className="demo-brand__product">Ops</span>
          </a>
        }
        center={
          <nav aria-label="Primary" className="demo-nav">
            {NAV.map(({ route: r, label, icon }) => (
              <NavItem
                key={r}
                href={href(r)}
                icon={<Icon as={icon} size="sm" />}
                aria-current={r === route ? 'page' : undefined}
              >
                {label}
              </NavItem>
            ))}
          </nav>
        }
        end={
          <>
            <Tooltip label="Notifications">
              <Button
                variant="tertiary"
                size="sm"
                aria-label="Notifications"
                startIcon={<Icon as={Bell} size="sm" />}
              />
            </Tooltip>
            <Avatar size="sm" initials="AR" alt="Ada Reyes" />
          </>
        }
      />

      <main className="demo-main" aria-labelledby="page-title">
        {children}
      </main>

      <DemoControls />
    </div>
  );
}
