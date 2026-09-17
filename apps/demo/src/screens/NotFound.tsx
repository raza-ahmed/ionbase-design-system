import { EmptyState, Link } from 'ionbase-ui';

import { href } from '../lib/router';

export function NotFound() {
  return (
    <div className="demo-page">
      <h1 id="page-title" className="ion-text-h4">
        Page not found
      </h1>
      <EmptyState
        reason="no-results"
        size="page"
        headingLevel={2}
        title="There is no page at this address"
        description="The link may be out of date."
        action={<Link href={href('overview')}>Go to overview</Link>}
      />
    </div>
  );
}
