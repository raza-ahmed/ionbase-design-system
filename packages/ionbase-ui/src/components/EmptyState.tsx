import React, { forwardRef } from 'react';

/**
 * Why there is nothing here. This is the whole reason the component exists as
 * a variant axis rather than a styling choice.
 *
 * `first-run`  nothing exists yet, and the user has never made one.
 * `no-results` things exist; the current filter or query matches none of them.
 * `no-access`  things exist and match; this account may not see them.
 * `error`      we do not know whether anything is here — the fetch failed.
 *
 * Collapsing these is the most common empty-state bug in enterprise software.
 * "No invoices" with a Create button, shown to someone who has 400 invoices
 * and a typo in their filter, tells them their data is gone.
 */
export type EmptyStateReason =
  'first-run' | 'no-results' | 'no-access' | 'error';

/** Vertical weight. `page` is a whole route, `panel` a region, `inline` a cell. */
export type EmptyStateSize = 'inline' | 'panel' | 'page';

/**
 * Heading element for the title. No `h1`: an empty state describes a region,
 * and the page's own title belongs to the page. Same call FullCard makes.
 */
export type EmptyStateHeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface EmptyStateProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'title'
> {
  /**
   * Why there is nothing here. Required, and there is no default: every
   * default would be a guess, and the wrong guess is the bug this component
   * exists to prevent.
   */
  reason: EmptyStateReason;
  /**
   * What is missing, in the user's words. Required — it is the accessible name
   * of the region, and an empty state with no statement is a blank area with
   * padding.
   *
   * Name the thing and the situation: "No invoices match these filters", not
   * "No results".
   */
  title: React.ReactNode;
  /** One or two sentences: what would be here, and what puts it here. */
  description?: React.ReactNode;
  /**
   * The action that resolves this state. For `no-results` that is clearing the
   * filter, NOT creating a record — see `useInstead` in the contract.
   */
  action?: React.ReactNode;
  /** A lower-emphasis escape hatch beside `action` — "Contact an admin". */
  secondaryAction?: React.ReactNode;
  /**
   * Decorative mark above the title. Rendered `aria-hidden`: the title already
   * says what this is, and an icon that repeats it announces twice.
   */
  icon?: React.ReactNode;
  /** Defaults to `panel`. */
  size?: EmptyStateSize;
  /**
   * Heading level for the title. Defaults to `h3`; only the page knows its own
   * outline, so it is a prop rather than a constant.
   */
  headingLevel?: EmptyStateHeadingLevel;
  children?: React.ReactNode;
}

/**
 * EmptyState — the state five of this system's nine patterns require and none
 * of them could render.
 *
 * `DataTable`, `PageShell`, `SettingsPanel`, `AssistantAnswer` and
 * `HumanApproval` all specify an empty state in their recipe. Until this
 * existed each consumer invented one, which is how a design system ends up
 * with four different ways to say "nothing here".
 *
 * REASON IS REQUIRED, AND HAS NO DEFAULT
 *
 * The four reasons are genuinely different situations with different correct
 * actions, and the failure mode is silent: an app that shows "No invoices yet
 * — Create your first invoice" to a user whose filter excluded everything has
 * told them their records are gone. A default would make that the easy path,
 * so there isn't one.
 *
 * `no-results` and `error` deliberately do NOT offer a create action in the
 * contract's guidance. The first needs the filter cleared; the second needs a
 * retry, and offering "Create" over a failed fetch invites a duplicate.
 *
 * NOT A LIVE REGION
 *
 * An empty state replaces content, so it is what the user reads next rather
 * than something announced over what they are reading. `role="status"` here
 * would interrupt on every keystroke of a filter box. If a specific flow needs
 * the announcement, the caller owns that decision — the same reasoning
 * StreamingText applies to `aria-live`.
 *
 * `error` is rendered as `role="alert"` ONLY when the caller opts in via
 * `role`, for the same reason: an error empty state arriving during typing is
 * still a read, not an interruption.
 *
 * No `'use client'`: nothing here holds state. The buttons passed through
 * `action` carry their own boundary.
 */
export const EmptyState = forwardRef<HTMLElement, EmptyStateProps>(
  (
    {
      reason,
      title,
      description,
      action,
      secondaryAction,
      icon,
      size = 'panel',
      headingLevel = 3,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const Heading = `h${headingLevel}` as const;

    return (
      <section
        {...rest}
        ref={ref}
        className={[
          'ion-empty-state',
          `ion-empty-state--${size}`,
          `ion-empty-state--${reason}`,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/*
         * aria-hidden, always. The title states the situation; an icon that
         * carries its own label makes a screen reader say it twice, and a
         * decorative mark is the only thing this slot is for.
         */}
        {icon && (
          <div className="ion-empty-state__icon" aria-hidden="true">
            {icon}
          </div>
        )}

        <Heading className="ion-empty-state__title">{title}</Heading>

        {description && (
          <p className="ion-empty-state__description">{description}</p>
        )}

        {children}

        {/*
         * Primary first in the DOM. Unlike DestructiveConfirm — where the safe
         * option leads because the other one is irreversible — nothing here is
         * destructive, and the action that resolves the state is the one the
         * user came for.
         */}
        {(action || secondaryAction) && (
          <div className="ion-empty-state__actions">
            {action}
            {secondaryAction}
          </div>
        )}
      </section>
    );
  },
);

EmptyState.displayName = 'EmptyState';
