#!/usr/bin/env node
/**
 * Set the same version on every publishable @ionbase package.
 *
 *   node scripts/sync-version.mjs 0.1.0
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
const packages = ['tokens', 'styles', 'react', 'icons'];

for (const name of packages) {
  const path = join(root, 'packages', name, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.version = version;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`@ionbase-ui/${name} → ${version}`);
}
