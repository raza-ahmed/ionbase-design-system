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
 * Runs against dist/meta/components.json, so build-meta.mjs must run first.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

if (errors.length) {
  console.error(`README: ${errors.length} error(s) in its code\n`);
  for (const e of errors) console.error(`  ✖ ${e}`);
  process.exit(1);
}
console.log(
  `README: ${checked} IonBase elements in ${blocks.length} code blocks, every prop and value in its contract — 0 errors`,
);
