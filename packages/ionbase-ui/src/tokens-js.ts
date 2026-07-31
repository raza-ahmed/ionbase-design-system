/**
 * JS token values as `var(--…)` string references.
 *
 * Prefer this subpath over the main barrel so importing a component does not
 * pull ~48KB of token JSON into bundlers that do not tree-shake:
 *
 *   import { semantic, tokens } from 'ionbase-ui/tokens-js';
 *
 * CSS custom properties stay at `ionbase-ui/tokens` / `ionbase-ui/styles`.
 */
export * from './tokens/index.js';
