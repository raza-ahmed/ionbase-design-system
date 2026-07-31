#!/usr/bin/env node
/**
 * Set the release version on the published package.
 *
 *   node scripts/sync-version.mjs 0.2.0
 *
 * This used to fan one version out across four packages — tokens, styles,
 * react, icons — which is the clearest evidence the split was not earning its
 * keep: nothing ever shipped at an independent version, so four manifests
 * bought coordination overhead and no release flexibility. There is one
 * publishable package now, and packages/tokens is private.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error('Usage: node scripts/sync-version.mjs <semver>');
  console.error('Example: node scripts/sync-version.mjs 0.1.0');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'packages', 'ionbase-ui', 'package.json');

const pkg = JSON.parse(readFileSync(path, 'utf8'));
const previous = pkg.version;
pkg.version = version;
writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`ionbase-ui  ${previous} → ${version}`);
