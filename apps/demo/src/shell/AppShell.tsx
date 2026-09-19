import { useEffect, useState, type ReactNode } from 'react';
import {
  Avatar,
  Button,
  Drawer,
  Header,
  Icon,
  Logo,
  Tooltip,
} from 'ionbase-ui';
import { Bell } from 'ionbase-icons/icons/bell';

import { href, type Route } from '../lib/router';
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

      <DemoControls />
    </div>
  );
}
