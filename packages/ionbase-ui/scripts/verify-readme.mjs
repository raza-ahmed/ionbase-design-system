#!/usr/bin/env node
/**
 * Gate for the package README's code.
 *
 * The README is the first thing an agent or a person reads, and its quick
 * start showed `<Button intent="primary">` from 0.1 to 0.137. The prop is
 * `variant`, and `primary` is not one of its values. The Phase 5 eval (5 Oct
 * 2026) measured what that cost: 75 of the 77 README-pack generations that
 * failed to compile had copied it, and the 14 Sep run had already reported
 * it. A wrong example in the README is a wrong example in every app.
 *
 * The README's blocks cannot be type-checked as they stand: one is a Next.js
 * layout and one is bare JSX. So this checks what matters. For every IonBase
 * component used in a ```tsx block, each prop must exist in that component's
 * contract, and a quoted value must be one of the prop's listed values. Props
 * every element takes (key, ref, style, className, children, aria-*, data-*)
 * pass.
 *
 * Imports are checked too, in every ts, tsx and js block. Each specifier from
 * `ionbase-ui` must resolve through the package's `exports` to a file the
 * build wrote, and each named import must be something that module exports.
 * The README said `import { tokens } from 'ionbase-ui'` until 0.138.1, after
 * the tokens had moved to `ionbase-ui/tokens-js`: the first line a reader
 * copied failed.
 *
 * Runs against dist/meta/components.json, so build-meta.mjs must run first.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = join(PKG, 'dist', 'meta', 'components.json');

if (!existsSync(DOC)) {
  console.error(
    'No dist/meta/components.json — run scripts/build-meta.mjs first.',
  );
  process.exit(1);
}

const { components } = JSON.parse(readFileSync(DOC, 'utf8'));
const readme = readFileSync(join(PKG, 'README.md'), 'utf8');

const UNIVERSAL = new Set(['key', 'ref', 'style', 'className', 'children']);
const universal = (prop) => UNIVERSAL.has(prop) || /^(aria|data)-/.test(prop);

const blocks = [...readme.matchAll(/```tsx\n([\s\S]*?)```/g)].map((m) => m[1]);

const errors = [];
let checked = 0;
for (const code of blocks) {
  // An opening tag: `<Name` up to the `>` that closes it. Braced values are
  // skipped whole, so `as={Plus}` or `onPress={() => go()}` cannot end it.
  for (const tag of code.matchAll(/<([A-Z]\w*)((?:\{[^}]*\}|[^>])*)>/g)) {
    const [, name, attrs] = tag;
    const contract = components[name];
    if (!contract) continue;
    checked++;
    for (const attr of attrs.matchAll(
      /([A-Za-z][\w-]*)(?:=(?:"([^"]*)"|'([^']*)'|\{(?:[^}]*)\}))?/g,
    )) {
      const [, prop, dq, sq] = attr;
      if (universal(prop)) continue;
      const spec = contract.props?.[prop];
      if (!spec) {
        errors.push(`<${name} ${prop}=…>: ${name} has no \`${prop}\` prop`);
        continue;
      }
      const value = dq ?? sq;
      if (value !== undefined && spec.values && !spec.values.includes(value))
        errors.push(
          `<${name} ${prop}="${value}">: not one of ${spec.values.map((v) => `"${v}"`).join(', ')}`,
        );
    }
  }
}

/* -------------------------------------------------------------- imports */

const { exports: EXPORTS } = JSON.parse(
  readFileSync(join(PKG, 'package.json'), 'utf8'),
);

/** `ionbase-ui/meta/Button.json` → the file its export points at, or null. */
function resolveExport(specifier) {
  const sub = `.${specifier.slice('ionbase-ui'.length)}`;
  for (const [key, value] of Object.entries(EXPORTS)) {
    const target = typeof value === 'string' ? value : value.default;
    if (key === sub) return target;
    if (key.endsWith('/*') && sub.startsWith(key.slice(0, -1)))
      return target.replace('*', sub.slice(key.length - 1));
  }
  return null;
}

const scripts = [
  ...readme.matchAll(/```(?:ts|tsx|js|jsx)\n([\s\S]*?)```/g),
].map((m) => m[1]);
let imports = 0;
for (const code of scripts)
  for (const m of code.matchAll(
    /^import\s+(type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*(?:from\s*)?'(ionbase-ui(?:\/[^']*)?)'/gm,
  )) {
    const [, typeOnly, defaultName, named, specifier] = m;
    imports++;
    const target = resolveExport(specifier);
    if (!target) {
      errors.push(`import from '${specifier}': no such export in package.json`);
      continue;
    }
    const file = join(PKG, target);
    if (!existsSync(file)) {
      errors.push(
        `import from '${specifier}': resolves to ${target}, which the build did not write`,
      );
      continue;
    }
    if (typeOnly || !file.endsWith('.js')) continue;
    const mod = await import(pathToFileURL(file).href);
    const names = (named ?? '')
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n && !n.startsWith('type '))
      .map((n) => n.split(/\s+as\s+/)[0]);
    if (defaultName) names.push('default');
    for (const n of names)
      if (!(n in mod))
        errors.push(
          `import { ${n} } from '${specifier}': '${specifier}' does not export ${n}`,
        );
  }

if (errors.length) {
  console.error(`README: ${errors.length} error(s) in its code\n`);
  for (const e of errors) console.error(`  ✖ ${e}`);
  process.exit(1);
}
console.log(
  `README: ${checked} IonBase elements in ${blocks.length} code blocks, every prop and value in its contract; ${imports} imports, every one resolving — 0 errors`,
);
