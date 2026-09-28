'use client';

import React, { useId, useState } from 'react';
import { Button } from './Button.js';
import { Popover } from './Popover.js';
import { Tooltip } from './Tooltip.js';

export interface AppSwitcherApp {
  /** Stable key; `currentApp` names one of these. */
  id: string;
  /** The product's name, as its own header spells it. */
  name: string;
  /** Where the product opens — its home, not a deep link. */
  href: string;
  /** A line under the name: what it is for, when names alone are not enough. */
  description?: string;
  /**
   * The product's mark, at its own size — a 24px icon suits — centred on a
   * 40px tinted square. Without one, its initial on the same square.
   */
  icon?: React.ReactNode;
}

export interface AppSwitcherProps {
  /** The products in the suite, in the order people look for them. */
  apps: AppSwitcherApp[];
  /** The `id` of the product this header belongs to. */
  currentApp?: string;
  /**
   * Names the button — which is an icon only — its tooltip, and the panel.
   * Default "Apps".
   */
  label?: string;
  /** Under the grid: a link to every app, or to manage access. */
  footer?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

/* Nine dots: the mark every suite's switcher uses, so it is recognised
 * before it is read. Inlined: `ionbase-ui` does not depend on
 * `ionbase-icons`. */
const GridIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="5" cy="5" r="2" />
    <circle cx="12" cy="5" r="2" />
    <circle cx="19" cy="5" r="2" />
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
    <circle cx="5" cy="19" r="2" />
    <circle cx="12" cy="19" r="2" />
    <circle cx="19" cy="19" r="2" />
  </svg>
);

/**
 * AppSwitcher — the grid of products in a suite's header.
 *
 * LINKS, NOT A MENU
 *
 * Each product is a place with an address: it opens in this tab, in a new
 * one with a modifier or a middle click, and its address can be copied. A
 * `menu` of `menuitem`s would give up all three for arrow keys. So the panel
 * is a Popover — a dialog, focus kept inside, Escape and an outside click
 * close it and focus goes back to the button — holding a list of links,
 * reached with Tab.
 *
 * WHERE YOU ARE
 *
 * The product you are in is marked `aria-current="true"` — not "page": it is
 * a product, not this page — and drawn with a border as well as a tint, so
 * it is not told by colour alone. It stays a link, to its home.
 *
 * A press on a link closes the panel. Opening a product in the same document
 * — a hash route, a client router — would otherwise leave it open over the
 * page it went to.
 */
export function AppSwitcher({
  apps,
  currentApp,
  label = 'Apps',
  footer,
  isOpen,
  onOpenChange,
  className,
}: AppSwitcherProps) {
  const idBase = useId();
  const [innerOpen, setInnerOpen] = useState(false);
  const open = isOpen ?? innerOpen;
  const setOpen = (next: boolean) => {
    if (isOpen === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Popover
      title={label}
      size="lg"
      showClose={false}
      isOpen={open}
      onOpenChange={setOpen}
      className={['ion-app-switcher', className || '']
        .filter(Boolean)
        .join(' ')}
      content={
        <>
          <ul className="ion-app-switcher__grid">
            {apps.map((app) => {
              const current = app.id === currentApp;
              // Named by the name alone and described by the description:
              // both sit inside the link, whose text would be both at once.
              const nameId = `${idBase}-${app.id}-name`;
              const descId = app.description
                ? `${idBase}-${app.id}-desc`
                : undefined;
              return (
                <li key={app.id}>
                  <a
                    href={app.href}
                    className="ion-app-switcher__app"
                    aria-current={current ? 'true' : undefined}
                    aria-labelledby={nameId}
                    aria-describedby={descId}
                    onClick={() => setOpen(false)}
                  >
                    <span className="ion-app-switcher__icon" aria-hidden="true">
                      {app.icon ?? (
                        <span className="ion-app-switcher__initial">
                          {app.name.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span id={nameId} className="ion-app-switcher__name">
                      {app.name}
                    </span>
                    {app.description && (
                      <span
                        id={descId}
                        className="ion-app-switcher__description"
                      >
                        {app.description}
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
          {footer && <div className="ion-app-switcher__footer">{footer}</div>}
        </>
      }
    >
      {/* The name is the label, so the tooltip only shows it: described by
          it too, a screen reader would hear "Apps, Apps". */}
      <Tooltip label={label} describesTrigger={false}>
        <Button
          variant="tertiary"
          size="sm"
          aria-label={label}
          className="ion-app-switcher__trigger"
          startIcon={<GridIcon />}
        />
      </Tooltip>
    </Popover>
  );
}

AppSwitcher.displayName = 'AppSwitcher';
