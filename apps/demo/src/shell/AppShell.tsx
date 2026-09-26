import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  Avatar,
  Banner,
  Button,
  Drawer,
  Header,
  Icon,
  Kbd,
  Link,
  Logo,
} from 'ionbase-ui';
import { Search } from 'ionbase-icons/icons/search';

import { subscribeWorkspaceNotice, workspaceNotice } from '../data/settings';
import { formatDay } from '../lib/dates';
import { href, type Route } from '../lib/router';
import { AppCommands } from './AppCommands';
import { DemoControls } from './DemoControls';
import { NavSidebar } from './NavSidebar';
import { NotificationsBell } from './NotificationsBell';

/**
 * The PageShell pattern, sidebar form: Header keeps the brand and account
 * actions, the Sidebar beside <main> is the primary navigation, and below the
 * tablet breakpoint the same Sidebar opens in a Drawer. The shell always
 * renders — a slow or failed page keeps its navigation. ToastProvider is
 * mounted once, above this, in App.
 */
export function AppShell({
  route,
  children,
}: {
  route: Route | null;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);

  // Navigating from the mobile drawer should close it.
  useEffect(() => setNavOpen(false), [route]);

  const notice = useSyncExternalStore(
    subscribeWorkspaceNotice,
    workspaceNotice,
  );

  return (
    <div className="demo-app">
      {/*
       * The PageShell's banners: above the Header, outside <main>, mounted
       * once by the shell so they persist across routes and are announced
       * once. The most severe first. A scheduled deletion must stay until it
       * is cancelled, so it has no dismissKey; the maintenance notice, once
       * dismissed, stays dismissed in this browser.
       */}
      <div className="demo-banners">
        {notice.deletionScheduledFor && (
          <Banner
            intent="warning"
            title={`${notice.workspaceName} will be deleted on ${formatDay(notice.deletionScheduledFor)}`}
            actions={<Link href={href('settings')}>Review in Settings</Link>}
          >
            Agents are paused until then.
          </Banner>
        )}
        <Banner
          intent="information"
          title="Maintenance on Sunday 4 October"
          dismissKey="maintenance-2026-10-04"
        >
          From 02:00 to 03:00 UTC. Runs started then are queued, not lost.
        </Banner>
      </div>

      {/*
       * menuType="dialog": the Header's own toggle opens the navigation Drawer,
       * and the account actions stay in the bar at every width.
       */}
      <Header
        className="demo-header"
        menuType="dialog"
        menuLabel="Open navigation"
        open={navOpen}
        onOpenChange={setNavOpen}
        brand={
          <a href={href('overview')} className="demo-brand">
            <Logo size="sm" wordmark="vector" />
            <span className="demo-brand__product">Ops</span>
          </a>
        }
        end={
          <>
            {/*
              The palette's visible door. ⌘K is invisible to anyone who has
              not been told it exists, so the button says so — and on a
              phone, which has no ⌘K, it is the only way in. Named "Search"
              outright: on a phone the word is hidden and only the icon shows.
            */}
            <Button
              aria-label="Search"
              variant="secondary"
              size="sm"
              className="demo-search"
              startIcon={<Icon as={Search} size="sm" />}
              endIcon={<Kbd shortcut="mod+k" />}
              onPress={() => setCommandsOpen(true)}
            >
              <span className="demo-search__label">Search</span>
            </Button>
            <NotificationsBell />
            <Avatar size="sm" initials="AR" alt="Ada Reyes" />
          </>
        }
      />

      <div className="demo-sidebar">
        <NavSidebar route={route} />
      </div>

      <Drawer
        isOpen={navOpen}
        onOpenChange={setNavOpen}
        title="Navigation"
        placement="start"
        isDismissable
        size="sm"
        className="demo-nav-drawer"
      >
        <NavSidebar route={route} />
      </Drawer>

      <main className="demo-main" aria-labelledby="page-title">
        {children}
      </main>

      <AppCommands isOpen={commandsOpen} onOpenChange={setCommandsOpen} />

      <DemoControls />
    </div>
  );
}
