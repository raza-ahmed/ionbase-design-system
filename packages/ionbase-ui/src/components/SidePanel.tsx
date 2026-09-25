'use client';

import React, {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';
import { useButton } from 'react-aria';
import { useOverlayTriggerState } from 'react-stately';
import { Drawer } from './Drawer.js';

export type SidePanelSize = 'sm' | 'md' | 'lg';

export interface SidePanelProps {
  isOpen?: boolean;
  defaultOpen?: boolean;
  /** `false` when the panel asks to close — its close button, or Escape. */
  onOpenChange?: (isOpen: boolean) => void;
  /** Required: names the region, and is where focus lands on open. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Actions pinned to the bottom edge. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** 22rem, 30rem or 40rem — Drawer's sizes. */
  size?: SidePanelSize;
  /** The title's heading level. Default 2. */
  headingLevel?: 2 | 3 | 4;
  showClose?: boolean;
  closeLabel?: string;
  /**
   * Below this viewport width, in px, there is no room beside the content and
   * the panel opens as a Drawer instead — modal, because it covers what it
   * would have sat beside. Default 768. `false` never switches.
   */
  overlayBelow?: number | false;
  id?: string;
  className?: string;
}

const CloseGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M6 6l12 12M18 6L6 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

function useMediaQuery(query: string | null): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!query || typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (query ? window.matchMedia(query).matches : false),
    // On the server there is no viewport: render inline, which is right for
    // the widths a server-rendered admin page is mostly read at.
    () => false,
  );
}

function InlinePanel({
  state,
  title,
  description,
  footer,
  children,
  size = 'md',
  headingLevel = 2,
  showClose = true,
  closeLabel = 'Close panel',
  id,
  className,
}: SidePanelProps & { state: ReturnType<typeof useOverlayTriggerState> }) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  /** The last thing focused outside the panel — where focus goes back to. */
  const returnTo = useRef<HTMLElement | null>(null);

  /*
   * On open, and only on open: focus the title, so a keyboard or screen
   * reader user is told the panel is there and starts at its top. Swapping
   * what the panel shows — the next row picked in the list — does not move
   * focus, or arrowing down a list with a panel open would be impossible.
   */
  useLayoutEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    headingRef.current?.focus({ preventScroll: true });

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!panelRef.current?.contains(target)) returnTo.current = target;
    };
    document.addEventListener('focusin', onFocusIn);
    const panel = panelRef.current;
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      // Closing with focus inside would drop it on <body>. Send it back to
      // where the user last was outside — the row that opened this view.
      const active = document.activeElement;
      const inside =
        !!panel && (panel.contains(active) || active === document.body);
      if (inside && returnTo.current?.isConnected) returnTo.current.focus();
    };
  }, []);

  const closeRef = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(
    { onPress: () => state.close(), 'aria-label': closeLabel },
    closeRef,
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Only from inside. An open Menu, Select or Toggletip in the panel stops
    // its own Escape, so the first press closes that and not the panel.
    if (e.key !== 'Escape') return;
    e.preventDefault();
    state.close();
  };

  const Heading = `h${headingLevel}` as 'h2';

  return (
    <section
      ref={panelRef}
      id={id}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      className={['ion-side-panel', `ion-side-panel--${size}`, className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="ion-side-panel__header">
        <div className="ion-side-panel__heading">
          <Heading
            ref={headingRef}
            id={titleId}
            tabIndex={-1}
            className="ion-side-panel__title"
          >
            {title}
          </Heading>
          {description && (
            <p className="ion-side-panel__description">{description}</p>
          )}
        </div>
        {showClose && (
          <button
            {...buttonProps}
            ref={closeRef}
            type="button"
            className="ion-side-panel__close"
          >
            <CloseGlyph />
          </button>
        )}
      </div>
      {children && <div className="ion-side-panel__body">{children}</div>}
      {footer && <div className="ion-side-panel__footer">{footer}</div>}
    </section>
  );
}

/**
 * SidePanel — detail that opens beside the content, and leaves it usable.
 *
 * WHY NOT A DRAWER
 *
 * A Drawer is a modal dialog: it traps focus, marks the page inert and tells
 * a screen reader the page behind is gone. A detail pane beside a list is the
 * opposite — the list stays live, the next row can be picked with the pane
 * open, and saying "dialog" about it would be a lie about where the user can
 * go. Same reasoning as ApprovalGate not being a Modal: the page is the
 * context.
 *
 * HOW IT BEHAVES
 *
 *   - A `<section>` region named by its title, rendered in place — not
 *     portalled — so it is part of the page's layout and reading order. Put
 *     it in a SidePanelLayout beside the content.
 *   - Opening focuses the title. Closing with focus inside returns it to the
 *     last thing focused outside the panel. Changing its content does
 *     neither.
 *   - Escape closes it from inside; Escape elsewhere is the page's own.
 *   - No focus trap, no scrim, nothing hidden. Closed, it renders nothing.
 *   - Below `overlayBelow` (768px) there is no "beside": the panel would
 *     cover the list, so it opens as a Drawer — modal, honestly so.
 */
export function SidePanel(props: SidePanelProps) {
  const { isOpen, defaultOpen, onOpenChange, overlayBelow = 768 } = props;
  const state = useOverlayTriggerState({ isOpen, defaultOpen, onOpenChange });
  const narrow = useMediaQuery(
    overlayBelow ? `(width < ${overlayBelow}px)` : null,
  );

  if (!state.isOpen) return null;

  if (narrow) {
    return (
      <Drawer
        isOpen
        isDismissable
        onOpenChange={state.setOpen}
        placement="end"
        size={props.size}
        title={props.title}
        description={props.description}
        footer={props.footer}
        showClose={props.showClose}
        closeLabel={props.closeLabel ?? 'Close panel'}
        className={props.className}
      >
        {props.children}
      </Drawer>
    );
  }

  return <InlinePanel {...props} state={state} />;
}

SidePanel.displayName = 'SidePanel';

export interface SidePanelLayoutProps {
  /** The content first, then the SidePanel — reading order is DOM order. */
  children: React.ReactNode;
  className?: string;
}

/**
 * The row a SidePanel sits in: content, then panel. The content column gets
 * `min-width: 0`, without which a wide Table beside the panel pushes it off
 * screen instead of scrolling inside its own container.
 */
export function SidePanelLayout({ children, className }: SidePanelLayoutProps) {
  return (
    <div
      className={['ion-side-panel-layout', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

SidePanelLayout.displayName = 'SidePanelLayout';
