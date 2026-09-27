import { Component, Fragment, type ReactNode } from 'react';
import { Button, Icon, Link } from 'ionbase-ui';
import { RefreshCw } from 'ionbase-icons/icons/refresh-cw';

import { useDemoSettings } from '../lib/demo-settings';
import { isOffline } from '../lib/online';
import { href } from '../lib/router';
import { FullPageError } from './FullPageError';

/**
 * A page that throws while rendering, caught inside the shell: the Header,
 * the navigation and the banners stay, and <main> says what happened. Keyed
 * by the route where it is mounted, so going somewhere else clears it.
 *
 * Reload page resets the boundary rather than the browser: most render
 * errors are a bad moment, not a bad page, and a full reload would throw away
 * everything else the shell holds.
 *
 * NOT EVERY CAUGHT ERROR IS A CRASH. Each screen is its own chunk, and with
 * no connection the chunk cannot download: that is the offline kind, and the
 * fix is the connection, not the code. A browser may remember a failed
 * import, so resetting the boundary would fail again — the page reloads
 * instead, on Try again or by itself when the connection returns.
 */
const couldNotDownload = (error: Error) =>
  isOffline(error) ||
  !navigator.onLine ||
  /dynamically imported module|Importing a module script failed|Loading chunk/i.test(
    error.message,
  );
export class PageErrorBoundary extends Component<
  { pageTitle: string; children: ReactNode },
  { error: Error | null; resets: number }
> {
  state = { error: null as Error | null, resets: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  private reloadWhenOnline = () => window.location.reload();

  componentDidUpdate() {
    const { error } = this.state;
    window.removeEventListener('online', this.reloadWhenOnline);
    if (error && couldNotDownload(error))
      window.addEventListener('online', this.reloadWhenOnline, { once: true });
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.reloadWhenOnline);
  }

  render() {
    const { error, resets } = this.state;
    if (!error) return <Fragment key={resets}>{this.props.children}</Fragment>;
    if (couldNotDownload(error))
      return (
        <FullPageError
          kind="offline"
          pageTitle={this.props.pageTitle}
          onRetry={() => window.location.reload()}
          secondaryAction={<Link href={href('overview')}>Go to overview</Link>}
        />
      );
    return (
      <FullPageError
        kind="failed"
        pageTitle={this.props.pageTitle}
        title="This page stopped working"
        description="Nothing you saved is affected — only this page failed to show. Reloading it usually clears it; if it happens again, quote the reference to support."
        error={error}
        action={
          <Button
            variant="secondary"
            startIcon={<Icon as={RefreshCw} size="sm" />}
            onClick={() => this.setState({ error: null, resets: resets + 1 })}
          >
            Reload page
          </Button>
        }
        secondaryAction={<Link href={href('overview')}>Go to overview</Link>}
      />
    );
  }
}

/**
 * The presenter's "Crash" state: throws while rendering, as a real bug
 * would, so the boundary above is a genuine code path.
 */
export function CrashWhenForced() {
  const { state } = useDemoSettings();
  if (state === 'crash')
    throw new Error('Forced by the demo controls: a render error in this page');
  return null;
}
