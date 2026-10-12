#!/usr/bin/env node
/**
 * Empty dist/ before a build writes into it.
 *
 * Every step of the build adds to dist/ and none of them clears it, so
 * whatever an earlier build wrote stays there and is packed: the compiled
 * file of a component since deleted, a contract no component has any more.
 * 0.138.0 shipped one, `dist/meta/pageItems.json`, a contract from an older
 * build-meta that described a helper as a component. Nothing pointed at it,
 * and no gate looked, because every gate checks what the build writes, not
 * what it leaves behind. A tarball should hold exactly what this build made,
 * so the build starts from nothing.
 */
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

rmSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'), {
  recursive: true,
  force: true,
});
