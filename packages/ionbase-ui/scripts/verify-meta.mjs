#!/usr/bin/env node
/**
 * Gate for the component contract.
 *
 * The intent files in `meta/` are hand-authored, which means they can be wrong
 * in exactly the way documentation is always wrong: the code moves and the prose
 * does not. Every check here exists to make one of those failures loud.
 *
 * Runs against dist/meta/components.json, so build-meta.mjs must run first.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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

const doc = JSON.parse(readFileSync(DOC, 'utf8'));
const components = doc.components;
const names = new Set(Object.keys(components));

const errors = [];
const warnings = [];
const err = (c, m) => errors.push(`${c}: ${m}`);
const warn = (c, m) => warnings.push(`${c}: ${m}`);

/* Custom properties the package actually defines, for the token cross-check. */
const TOKEN_DIR = join(PKG, 'src', 'styles', 'tokens');
const defined = new Set();
for (const f of readdirSync(TOKEN_DIR).filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(join(TOKEN_DIR, f), 'utf8');
  for (const m of css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)) defined.add(m[1]);
}

/* Fields the generator owns. An intent file that sets one would be silently
 * overwritten, which is worse than being rejected. */
const GENERATED = [
  'props',
  'propCounts',
  'tokens',
  'stylesheet',
  'source',
  'import',
  'name',
  'propsType',
];

/* ------------------------------------------------------------------ checks */

for (const f of readdirSync(join(PKG, 'meta')).filter((f) =>
  f.endsWith('.json'),
)) {
  const name = f.replace(/\.json$/, '');
  if (!names.has(name)) {
    errors.push(`meta/${f}: no exported component named ${name}`);
    continue;
  }
  const intent = JSON.parse(readFileSync(join(PKG, 'meta', f), 'utf8'));
  for (const k of GENERATED) {
    if (k in intent)
      err(
        name,
        `meta/${f} sets "${k}", which the generator owns and would overwrite`,
      );
  }
}

for (const [name, c] of Object.entries(components)) {
  const hasIntent = Boolean(c.summary);
  if (!hasIntent) {
    /* An error, not a warning, since 0.19.0: every exported component has an
     * intent file, so a missing one is a new component that shipped without
     * the judgement an agent needs. The generated API alone tells an agent
     * what it MAY pass, never what it SHOULD. */
    err(name, `no meta/${name}.json — every exported component needs one`);
    continue;
  }

  // variants must name real props, and their values must be real values
  for (const [prop, cases] of Object.entries(c.variants ?? {})) {
    const p = c.props[prop];
    if (!p) {
      err(name, `variants."${prop}" is not a prop`);
      continue;
    }
    if (!p.values) {
      err(
        name,
        `variants."${prop}" is not a string-literal union (type ${p.type})`,
      );
      continue;
    }
    const documented = new Set(Object.keys(cases));
    for (const v of documented) {
      if (!p.values.includes(v))
        err(
          name,
          `variants."${prop}" documents "${v}", not in the union [${p.values.join(', ')}]`,
        );
    }
    for (const v of p.values) {
      if (!documented.has(v))
        err(name, `variants."${prop}" does not document "${v}"`);
    }
  }

  // slots must be real props
  for (const slot of Object.keys(c.slots ?? {})) {
    if (!c.props[slot]) err(name, `slots."${slot}" is not a prop`);
  }

  // deprecated entries must exist AND actually carry @deprecated in the source
  for (const d of c.deprecated ?? []) {
    const p = c.props[d.prop];
    if (!p) {
      err(name, `deprecated names "${d.prop}", which is not a prop`);
      continue;
    }
    if (!p.tags?.deprecated) {
      err(
        name,
        `deprecated names "${d.prop}" but the source has no @deprecated tag on it`,
      );
    }
    if (d.replacement && !c.props[d.replacement]) {
      err(
        name,
        `deprecated."${d.prop}" points at replacement "${d.replacement}", which is not a prop`,
      );
    }
  }
  // ...and the reverse: a prop marked @deprecated in the source must be declared here
  for (const [pname, p] of Object.entries(c.props)) {
    if (p.tags?.deprecated && p.origin === 'own') {
      if (!(c.deprecated ?? []).some((d) => d.prop === pname)) {
        err(
          name,
          `prop "${pname}" is @deprecated in the source but absent from meta "deprecated"`,
        );
      }
    }
  }

  // useInstead should point at something real
  for (const u of c.useInstead ?? []) {
    if (!u.use) continue;
    const targets = u.use.split(/\s+or\s+|,\s*/).map((t) => t.trim());
    const known = targets.some((t) => names.has(t));
    if (!known && !/not yet|CSS |a combobox/i.test(u.use)) {
      warn(
        name,
        `useInstead points at "${u.use}", which is not an exported component — intentional?`,
      );
    }
  }

  // every custom property the stylesheet consumes must be defined somewhere
  for (const t of c.tokens ?? []) {
    if (!defined.has(t) && !t.startsWith('--ion-')) {
      err(name, `stylesheet uses ${t}, which no token layer defines`);
    }
  }
}

/* ------------------------------------------------------------------ report */

const withIntent = Object.values(components).filter((c) => c.summary).length;
for (const w of warnings) console.log(`  warn  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

console.log(
  `\nMeta: ${Object.keys(components).length} components, ${withIntent} with intent — ` +
    `${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
