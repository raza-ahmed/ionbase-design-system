/**
 * Copy the token pipeline's output into this package.
 *
 * The token pipeline stays where it is — packages/tokens keeps its Figma
 * export, its five gates and its committed src/figma/*.json, and is marked
 * private so it never reaches npm. This script is the one seam between it and
 * the published package: generated CSS and generated TS are copied in, so
 * ionbase-ui ships them with zero runtime dependencies.
 *
 * Everything written here is git-ignored. Regenerate with `pnpm build`.
 *
 * Copying rather than importing is deliberate. A `workspace:*` dependency on a
 * private package would publish as an unresolvable version and break every
 * install; devDependencies are stripped from the tarball, so the pipeline can
 * order the build without ever becoming a consumer-facing dependency.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = join(here, '..');
const TOKENS = join(PKG, '..', 'tokens');

const CSS_SRC = join(TOKENS, 'dist', 'css');
const CSS_DEST = join(PKG, 'src', 'styles', 'tokens');
const TS_SRC = join(TOKENS, 'src', 'generated');
const TS_DEST = join(PKG, 'src', 'tokens');

function main() {
  for (const [src, dest, what] of [
    [CSS_SRC, CSS_DEST, 'token CSS'],
    [TS_SRC, TS_DEST, 'token TS'],
  ]) {
    if (!existsSync(src)) {
      // Fail loudly. A missing source here means the token build did not run,
      // and silently shipping a package with no tokens is the kind of defect
      // that only shows up in a consumer's browser.
      console.error(
        `ionbase-ui: cannot sync ${what} — ${src} does not exist.\n` +
          `Run the token build first: pnpm --filter @ionbase-ui/tokens build`,
      );
      process.exit(1);
    }

    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
    console.log(`ionbase-ui: synced ${what} → ${dest.replace(PKG, '.')}`);
  }
}

main();
