import { mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PKG = join(here, '..');
const SRC = join(PKG, 'src');
const DIST_CSS = join(PKG, 'dist', 'css');

function main() {
  // Ensure dist/css exists
  mkdirSync(DIST_CSS, { recursive: true });

  // Read files in src/
  const files = readdirSync(SRC);
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.css')) {
      const srcPath = join(SRC, file);
      const destPath = join(DIST_CSS, file);
      copyFileSync(srcPath, destPath);
      count++;
    }
  }

  console.log(`Styles: copied ${count} CSS files to dist/css/`);
}

main();
