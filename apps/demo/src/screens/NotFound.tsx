import { Link } from 'ionbase-ui';

import { href } from '../lib/router';
import { FullPageError } from '../shell/FullPageError';

/** An unknown address: said so, never redirected — the FullPageError pattern's 404. */
export function NotFound() {
  return (
    <FullPageError
      kind="not-found"
      pageTitle="Page not found"
      title="There is no page at this address"
      description="The link may be out of date."
      action={<Link href={href('overview')}>Go to overview</Link>}
      secondaryAction={null}
    />
  );
}
