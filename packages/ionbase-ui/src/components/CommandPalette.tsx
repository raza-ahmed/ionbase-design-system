'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Overlay,
  useDialog,
  useFilter,
  useModalOverlay,
  mergeProps,
} from 'react-aria';
import { useOverlayTriggerState } from 'react-stately';
import type { OverlayTriggerState } from 'react-stately';
import { Kbd, useIsMac } from './Kbd.js';
import { matchesShortcut, parseShortcut } from './shortcut.js';

export interface CommandPaletteItem {
  /** Passed to `onAction`. Unique within the palette. */
  id: string;
  /** What the row says — a verb first: "Create agent", "Go to Runs". */
  label: string;
  /** A second line. Searchable. */
  description?: string;
  /**
   * The heading this command is listed under. Sections appear in the order
   * their first command does; commands without one come first, unheaded.
   */
  section?: string;
  /** Leading icon. Decorative — the label names the command. */
  icon?: React.ReactNode;
  /**
   * The command's own shortcut, shown as a hint: `mod+shift+n`. Shown, NOT
   * bound — the palette does not listen for it. Bind it where the command
   * lives, or the hint promises a key that does nothing.
   */
  shortcut?: string;
  /** Other words that should find it: "delete" for "Remove agent". */
  keywords?: readonly string[];
  /** Listed but not runnable, and skipped by the arrow keys. */
  isDisabled?: boolean;
}

export interface CommandPaletteProps {
  /** Every command. Filtering happens here, against what is typed. */
  commands: readonly CommandPaletteItem[];
  /**
   * Runs the chosen command. Called AFTER the palette has closed and handed
   * focus back, so an action that moves focus — to a search field, into a
   * form — keeps it.
   */
  onAction: (id: string) => void;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * The shortcut that opens it from anywhere on the page, and closes it again.
   * Defaults to `mod+k` — ⌘K on a Mac, Ctrl+K elsewhere. `null` turns it off,
   * for a page that opens the palette some other way.
   */
  openShortcut?: string | null;
  /** Names the dialog and the search field. */
  label?: string;
  placeholder?: string;
  /** Shown in place of the list when nothing matches. */
  emptyLabel?: React.ReactNode;
  className?: string;
}

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

interface Section {
  title: string | undefined;
  commands: CommandPaletteItem[];
}

/** Groups in first-appearance order; unsectioned commands lead, unheaded. */
function toSections(commands: readonly CommandPaletteItem[]): Section[] {
  const bySection = new Map<string | undefined, CommandPaletteItem[]>([
    [undefined, []],
  ]);
  for (const c of commands) {
    const list = bySection.get(c.section);
    if (list) list.push(c);
    else bySection.set(c.section, [c]);
  }
  return [...bySection]
    .filter(([, list]) => list.length > 0)
    .map(([title, list]) => ({ title, commands: list }));
}

/* ------------------------------------------------------------------ panel */

interface PanelProps {
  state: OverlayTriggerState;
  commands: readonly CommandPaletteItem[];
  onRun: (id: string) => void;
  label: string;
  placeholder: string;
  emptyLabel: React.ReactNode;
  className?: string;
}

/**
 * The dialog, mounted only while open — AGENTS.md's overlay rule: `useDialog`
 * resolves its focus and name in effects that run when the CALLER mounts.
 * Mounting fresh on every open also empties the query and resets the active
 * row, which is what a palette should do.
 */
function CommandPalettePanel({
  state,
  commands,
  onRun,
  label,
  placeholder,
  emptyLabel,
  className,
}: PanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;

  const { modalProps, underlayProps } = useModalOverlay(
    { isDismissable: true },
    state,
    panelRef,
  );
  const { dialogProps } = useDialog({ 'aria-label': label }, panelRef);

  const [query, setQuery] = useState('');
  const { contains } = useFilter({ sensitivity: 'base' });

  const sections = useMemo(() => {
    const q = query.trim();
    const matched = q
      ? commands.filter((c) =>
          contains(
            [c.label, c.description, c.section, ...(c.keywords ?? [])]
              .filter(Boolean)
              .join(' '),
            q,
          ),
        )
      : commands;
    return toSections(matched);
  }, [commands, contains, query]);

  /* The rows the arrow keys move through, in display order. */
  const rows = useMemo(() => sections.flatMap((s) => s.commands), [sections]);
  const runnable = useMemo(() => rows.filter((c) => !c.isDisabled), [rows]);

  const [activeId, setActiveId] = useState<string | null>(null);
  /*
   * The active row follows the query: a new query highlights its first
   * runnable result, so Enter after typing runs the best match. Derived rather
   * than set in an effect, so the highlight and the list never disagree for a
   * frame.
   */
  const active = runnable.find((c) => c.id === activeId) ?? runnable[0] ?? null;
  const optionId = (c: CommandPaletteItem) => `${baseId}-${rows.indexOf(c)}`;

  // Keep the keyboard's row in view as it moves past the list's edge.
  useEffect(() => {
    if (!active) return;
    document
      .getElementById(optionId(active))
      ?.scrollIntoView?.({ block: 'nearest' });
    // optionId is a pure function of rows, which `active` already follows.
  }, [active]);

  const move = (by: 1 | -1) => {
    if (!runnable.length) return;
    const at = active ? runnable.indexOf(active) : -1;
    const next = (at + by + runnable.length) % runnable.length;
    setActiveId(runnable[next].id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'Enter':
        e.preventDefault();
        if (active) onRun(active.id);
        break;
    }
  };

  const count = runnable.length;

  return (
    <div {...underlayProps} className="ion-command-palette__scrim">
      <div
        {...mergeProps(modalProps, dialogProps)}
        ref={panelRef}
        className={['ion-command-palette', className || '']
          .filter(Boolean)
          .join(' ')}
      >
        <div className="ion-command-palette__search">
          <span className="ion-command-palette__search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          {/*
            A combobox whose list is always open: real focus stays in the
            field and the arrow keys move `aria-activedescendant` through the
            rows, the same model as Combobox — typing and choosing at once.
          */}
          <input
            ref={inputRef}
            className="ion-command-palette__input"
            type="text"
            role="combobox"
            aria-label={label}
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active ? optionId(active) : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            // A palette exists to be typed into; focus starts in the field.
            autoFocus
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveId(null);
            }}
            onKeyDown={onKeyDown}
          />
        </div>

        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="ion-command-palette__list"
        >
          {sections.map((section, s) => {
            const headingId = `${baseId}-section-${s}`;
            const options = section.commands.map((c) => {
              const isActive = c === active;
              return (
                <div
                  key={c.id}
                  id={optionId(c)}
                  role="option"
                  aria-selected={isActive}
                  aria-disabled={c.isDisabled || undefined}
                  className="ion-command-palette__option"
                  data-focused={isActive || undefined}
                  data-disabled={c.isDisabled || undefined}
                  /*
                   * pointermove, not pointerenter: a list scrolled by the
                   * keyboard slides rows under a resting pointer, and enter
                   * would hand the highlight to whatever landed there.
                   */
                  onPointerMove={() => {
                    if (!c.isDisabled && !isActive) setActiveId(c.id);
                  }}
                  // Keep focus in the field; a click must not blur it first.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!c.isDisabled) onRun(c.id);
                  }}
                >
                  {c.icon && (
                    <span
                      className="ion-command-palette__icon"
                      aria-hidden="true"
                    >
                      {c.icon}
                    </span>
                  )}
                  <span className="ion-command-palette__text">
                    <span className="ion-command-palette__label">
                      {c.label}
                    </span>
                    {c.description && (
                      <span className="ion-command-palette__description">
                        {c.description}
                      </span>
                    )}
                  </span>
                  {c.shortcut && (
                    <Kbd
                      shortcut={c.shortcut}
                      className="ion-command-palette__shortcut"
                    />
                  )}
                </div>
              );
            });
            return section.title ? (
              <div
                key={section.title}
                role="group"
                aria-labelledby={headingId}
                className="ion-command-palette__section"
              >
                <div
                  id={headingId}
                  role="presentation"
                  className="ion-command-palette__heading"
                >
                  {section.title}
                </div>
                {options}
              </div>
            ) : (
              <React.Fragment key="">{options}</React.Fragment>
            );
          })}
        </div>

        {/*
          Beside the listbox, not in it — the same reason as Combobox: as an
          option it would be counted, focusable and runnable.
        */}
        {rows.length === 0 && (
          <div className="ion-command-palette__empty">{emptyLabel}</div>
        )}

        {/*
          Result counts are announced, because nothing else is: with focus in
          the field, a list that shrinks from forty rows to two is silent.
        */}
        <div className="ion-visually-hidden" role="status" aria-live="polite">
          {query ? `${count} ${count === 1 ? 'command' : 'commands'}` : ''}
        </div>

        <div className="ion-command-palette__footer" aria-hidden="true">
          <span className="ion-command-palette__hint">
            <Kbd shortcut="up" />
            <Kbd shortcut="down" />
            to move
          </span>
          <span className="ion-command-palette__hint">
            <Kbd shortcut="enter" />
            to run
          </span>
          <span className="ion-command-palette__hint">
            <Kbd shortcut="esc" />
            to close
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- palette */

/**
 * CommandPalette — every action in the product, one search away.
 *
 * ⌘K (Ctrl+K elsewhere) opens it from anywhere; typing filters; Enter runs.
 * Mount it once, near the root, and hand it every command the product has.
 *
 * WHY NOT A MODAL WITH A COMBOBOX IN IT
 *
 * A Combobox's list is a popover that opens and closes on its own rules, and
 * it SELECTS a value that stays selected. A palette's list is always open and
 * each row is RUN, once, and the palette goes away. The ARIA shape is the same
 * — a combobox driving a listbox through `aria-activedescendant` — so this
 * uses it, without the parts of Combobox that exist for choosing a value.
 *
 * NOT A NAVIGATION MENU
 *
 * Everything in the palette must also be reachable without it. It is a faster
 * route for people who know what they want, and a shortcut nobody told you
 * about is not a route at all.
 */
export function CommandPalette({
  commands,
  onAction,
  isOpen,
  defaultOpen,
  onOpenChange,
  openShortcut = 'mod+k',
  label = 'Command palette',
  placeholder = 'Type a command or search…',
  emptyLabel = 'No matching commands',
  className,
}: CommandPaletteProps) {
  const state = useOverlayTriggerState({ isOpen, defaultOpen, onOpenChange });
  const isMac = useIsMac();

  // Parsed during render so a malformed shortcut throws where it is written.
  const parsed = useMemo(
    () => (openShortcut ? parseShortcut(openShortcut) : null),
    [openShortcut],
  );

  /*
   * The listener lives on the document, not on the panel, because it has to
   * work while the palette is closed — and while it is open, the same key
   * closes it. Kept in a ref so re-renders do not re-subscribe.
   */
  const toggle = useRef(state.toggle);
  toggle.current = state.toggle;
  useEffect(() => {
    if (!parsed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || !matchesShortcut(e, parsed, isMac)) return;
      e.preventDefault();
      toggle.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [parsed, isMac]);

  /*
   * The command runs once the palette is gone, not from inside it. While the
   * dialog is mounted its focus scope pulls any focus that leaves it straight
   * back, so an action that focuses a field would lose that focus to the
   * palette's own search box. After unmount, React Aria only restores focus to
   * the trigger if nothing else has claimed it.
   */
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (state.isOpen || pending.current === null) return;
    const id = pending.current;
    pending.current = null;
    onAction(id);
  });

  return state.isOpen ? (
    <Overlay>
      <CommandPalettePanel
        state={state}
        commands={commands}
        onRun={(id) => {
          pending.current = id;
          state.close();
        }}
        label={label}
        placeholder={placeholder}
        emptyLabel={emptyLabel}
        className={className}
      />
    </Overlay>
  ) : null;
}

CommandPalette.displayName = 'CommandPalette';
