import { EmptyState, Icon, Logo } from 'ionbase-ui';
import { Bot } from 'ionbase-icons/icons/bot';

/**
 * Phase 0 placeholder. Proves the workspace link, the built stylesheet, a
 * per-icon subpath import and the lint rules all work before any screen
 * exists. Replaced by the PageShell in phase 1.
 */
export function App() {
  return (
    <main className="demo-placeholder">
      <Logo size="lg" wordmark="vector" />
      <EmptyState
        reason="first-run"
        size="page"
        icon={<Icon as={Bot} size="xl" />}
        title="Ionbase Ops is being built"
        description="A fictional AI ops console, assembled only from ionbase-ui and ionbase-icons."
      />
    </main>
  );
}
