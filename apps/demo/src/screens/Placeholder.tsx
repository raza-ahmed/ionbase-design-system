import { EmptyState, Link } from 'ionbase-ui';

import { href } from '../lib/router';

/** Routes that exist in the nav but not yet in the build — see the plan's phases. */
export function Placeholder({
  title,
  phase,
}: {
  title: string;
  phase: number;
}) {
  return (
    <div className="demo-page">
      <h1 id="page-title" className="ion-text-h3">
        {title}
      </h1>
      <EmptyState
        reason="first-run"
        size="page"
        headingLevel={2}
        title={`${title} is not built yet`}
        description={`This screen arrives in phase ${phase} of the demo plan.`}
        action={<Link href={href('overview')}>Back to overview</Link>}
      />
    </div>
  );
}

export function NotFound() {
  return (
    <div className="demo-page">
      <h1 id="page-title" className="ion-text-h3">
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
