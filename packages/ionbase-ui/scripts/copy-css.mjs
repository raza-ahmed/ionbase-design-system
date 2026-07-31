/**
 * Copy src/styles/ into dist/styles/, preserving the tokens/ subdirectory that
 * sync-tokens.mjs put there.
 *
 * tsc handles the TypeScript; CSS is not something it knows about, so the
 * stylesheets are copied verbatim. They are authored as plain CSS with
 * relative @import URLs, which means dist/styles/index.css resolves without a
 * bundler — the old cross-package `@import url('@ionbase-ui/tokens/css')` only
 * worked because a bundler was resolving the bare specifier for us.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = join(here, '..');
const SRC = join(PKG, 'src', 'styles');
const DEST = join(PKG, 'dist', 'styles');

/**
 * Assert tsc actually emitted the package entry.
 *
 * This is not paranoia. `composite: true` makes TypeScript trust
 * tsconfig.tsbuildinfo over the filesystem, so deleting dist/ without deleting
 * the buildinfo makes tsc exit 0 having written nothing — not even
 * `tsc --build` notices. The predecessor of this package shipped exactly that
 * way: a manifest whose `main` pointed at a dist/index.js that was never
 * emitted, which no build, lint, typecheck or format check could see.
 *
 * The build now runs `tsc --build --force`, so this should never fire. It
 * exists because the failure is silent, and a silent failure here means a
 * published package that throws ERR_MODULE_NOT_FOUND on import.
 */
function assertEntryEmitted() {
  const missing = ['index.js', 'index.d.ts']
    .map((f) => join(PKG, 'dist', f))
    .filter((f) => !existsSync(f));

  if (missing.length > 0) {
    console.error(
      `ionbase-ui: tsc produced no package entry — missing:\n` +
        missing.map((f) => `  ${f}`).join('\n') +
        `\n\nDelete packages/ionbase-ui/tsconfig.tsbuildinfo and rebuild.`,
    );
    process.exit(1);
  }
}

function main() {
  if (!existsSync(SRC)) {
    console.error(`ionbase-ui: no stylesheets at ${SRC}`);
    process.exit(1);
  }

  assertEntryEmitted();

  rmSync(DEST, { recursive: true, force: true });
  mkdirSync(DEST, { recursive: true });
  cpSync(SRC, DEST, { recursive: true });

  console.log('ionbase-ui: copied stylesheets → dist/styles/');
}

main();
