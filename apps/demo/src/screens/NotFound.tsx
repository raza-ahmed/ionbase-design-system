import { EmptyState, Link, PageHeader } from 'ionbase-ui';

import { href } from '../lib/router';

export function NotFound() {
  return (
    <div className="demo-page">
      <PageHeader titleId="page-title" title="Page not found" />
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
