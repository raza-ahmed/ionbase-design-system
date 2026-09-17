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
import { PanelLeft } from 'ionbase-icons/icons/panel-left';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Navigating from either mobile surface should close it.
  useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
  }, [route]);

  return (
    <div className="demo-app">
      <Header
        className="demo-header"
        menuLabel="Account menu"
        open={menuOpen}
        onOpenChange={setMenuOpen}
        brand={
          <span className="demo-brand-row">
            {/* GAP: Header's own toggle can only open its own menu. */}
            <span className="demo-nav-toggle">
              <Button
                variant="tertiary"
                size="sm"
                aria-label="Open navigation"
                startIcon={<Icon as={PanelLeft} size="sm" />}
                onPress={() => setNavOpen(true)}
              />
            </span>
            <a href={href('overview')} className="demo-brand">
              <Logo size="sm" wordmark="vector" />
              <span className="demo-brand__product">Ops</span>
            </a>
          </span>
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
