import { useEffect, useState, type ReactNode } from 'react';
import {
  Avatar,
  Button,
  Drawer,
  Header,
  Icon,
  Kbd,
  Logo,
  Tooltip,
} from 'ionbase-ui';
import { Bell } from 'ionbase-icons/icons/bell';
import { Search } from 'ionbase-icons/icons/search';

import { href, type Route } from '../lib/router';
import { AppCommands } from './AppCommands';
import { DemoControls } from './DemoControls';
import { NavSidebar } from './NavSidebar';

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

  return (
    <div className="demo-app">
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
