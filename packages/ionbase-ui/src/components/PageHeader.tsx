import React, { forwardRef, useId } from 'react';

/**
 * Which heading the title renders as. `1` is the default because a page
 * header is the page's title. `2` is for a header inside a pane that is not
 * the page — the detail half of a list-detail layout, under the list's `h1`.
 */
export type PageHeaderHeadingLevel = 1 | 2;

export interface PageHeaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  /** The page's title. Rendered as the `h1`. */
  title: React.ReactNode;
  /**
   * The title's id. Pass it when something else points at the heading —
   * `<main aria-labelledby>` is the usual one. Generated when omitted.
   */
  titleId?: string;
  /** Heading element for the title. Defaults to `1`. */
  headingLevel?: PageHeaderHeadingLevel;
  /** One or two sentences under the title: what this page is for. */
  description?: React.ReactNode;
  /** A Breadcrumb, above the title. */
  breadcrumb?: React.ReactNode;
  /**
   * Beside the title: a Badge or two for the record's state — "Paused",
   * "Draft". State, not actions.
   */
  status?: React.ReactNode;
  /**
   * At the end of the title row: the page's actions, most important last.
   * One primary Button at most; several more go in a MenuTrigger.
   */
  actions?: React.ReactNode;
  /**
   * A row beneath, that belongs to the header rather than the page's
   * content: the page's Tabs, or the filters its table answers to.
   */
  children?: React.ReactNode;
}

/**
 * PageHeader — the top of a page: where you are, what it is, and what you can
 * do to it.
 *
 * Promoted from the demo app, where five screens hand-wrote it in three
 * different shapes (`.demo-page__header`, `.demo-run-header`, and a bare
 * `<div>`), each with its own gap and its own idea of where the actions
 * aligned. Every enterprise system ships one — Carbon's PageHeader,
 * Lightning's page headers — because every page has one.
 *
 * NOT A LANDMARK
 *
 * It renders a `<div>`, not a `<header>`. A `<header>` that is a child of
 * `<body>` is the page's banner, and the app shell's Header already is that.
 * The page's landmark is `<main>`, named by this title: pass `titleId` and
 * point `<main aria-labelledby>` at it.
 *
 * No `'use client'`: `useId` resolves on the server, and nothing here is
 * interactive. Interactive parts arrive through the slots.
 */
export const PageHeader = forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    {
      title,
      titleId,
      headingLevel = 1,
      description,
      breadcrumb,
      status,
      actions,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const Heading = `h${headingLevel}` as const;

    return (
      <div
        {...rest}
        ref={ref}
        className={['ion-page-header', className].filter(Boolean).join(' ')}
      >
        {breadcrumb && (
          <div className="ion-page-header__breadcrumb">{breadcrumb}</div>
        )}
        <div className="ion-page-header__main">
          <div className="ion-page-header__heading">
            <div className="ion-page-header__title-row">
              <Heading
                id={titleId ?? generatedId}
                className="ion-page-header__title"
              >
                {title}
              </Heading>
              {status && (
                <div className="ion-page-header__status">{status}</div>
              )}
            </div>
            {description && (
              <p className="ion-page-header__description">{description}</p>
            )}
          </div>
          {actions && <div className="ion-page-header__actions">{actions}</div>}
        </div>
        {children && <div className="ion-page-header__below">{children}</div>}
      </div>
    );
  },
);

PageHeader.displayName = 'PageHeader';
