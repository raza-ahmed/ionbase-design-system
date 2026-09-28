import { useEffect, useState, type ReactNode } from 'react';
import {
  Button,
  CopyButton,
  EmptyState,
  Icon,
  PageHeader,
  type EmptyStateReason,
} from 'ionbase-ui';
import { RefreshCw } from 'ionbase-icons/icons/refresh-cw';

/**
 * The FullPageError pattern, as this product draws it: inside the shell, in
 * <main>, a PageHeader naming what could not be shown and a page-size
 * EmptyState saying which of four things happened. Each kind has a different
 * fix, so each says a different thing.
 */
export type PageErrorKind = 'not-found' | 'no-access' | 'failed' | 'offline';

const REASON: Record<PageErrorKind, EmptyStateReason> = {
  'not-found': 'no-results',
  'no-access': 'no-access',
  failed: 'error',
  offline: 'error',
};

/** What a person can quote to support, and what the log is searched by. */
const newReference = () =>
  `err_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

export function FullPageError({
  kind,
  pageTitle,
  breadcrumb,
  title,
  description,
  action,
  onRetry,
  secondaryAction,
  error,
}: {
  kind: PageErrorKind;
  /** The page's own name — the h1, as on the page that is not showing. */
  pageTitle: string;
  breadcrumb?: ReactNode;
  /** What happened. Defaults for `offline` only; the rest are the page's to say. */
  title?: string;
  description?: ReactNode;
  /** Replaces Try again. */
  action?: ReactNode;
  onRetry?: () => void;
  /** Somewhere that works. */
  secondaryAction: ReactNode;
  /** A failure's cause, logged with the reference. */
  error?: Error;
}) {
  // One reference per failure shown: a retry that fails again gets a new one.
  const [reference] = useState(newReference);
  const failed = kind === 'failed';

  useEffect(() => {
    if (failed) console.error(`[${reference}]`, error ?? 'page failed');
  }, [failed, reference, error]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${pageTitle} · Ionbase Ops`;
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);

  const retry = onRetry && (
    <Button
      variant="secondary"
      startIcon={<Icon as={RefreshCw} size="sm" />}
      onClick={onRetry}
    >
      Try again
    </Button>
  );

  return (
    <div className="demo-page" data-page-error={kind}>
      <PageHeader
        titleId="page-title"
        title={pageTitle}
        breadcrumb={breadcrumb}
      />
      <EmptyState
        reason={REASON[kind]}
        size="page"
        headingLevel={2}
        title={
          title ??
          (kind === 'offline' ? 'You’re offline' : 'Something went wrong')
        }
        description={
          description ??
          (kind === 'offline'
            ? 'This page needs a connection to load. It will load by itself when you’re back online.'
            : undefined)
        }
        action={action ?? retry}
        secondaryAction={secondaryAction}
      >
        {failed && (
          <p className="demo-error-reference ion-text-body-sm demo-muted">
            Reference <code>{reference}</code>
            <CopyButton
              value={reference}
              size="sm"
              variant="tertiary"
              label="Copy reference"
            />
          </p>
        )}
      </EmptyState>
    </div>
  );
}
