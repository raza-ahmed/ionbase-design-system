#!/usr/bin/env node
/**
 * Code Connect, without the Enterprise plan.
 *
 * Figma's own Code Connect makes Dev Mode emit the real component instead of a
 * generated lookalike. It needs a Dev or Full seat on an Organization or
 * Enterprise plan. A design system that only works for people who can afford
 * that is not a design system, so the mapping lives in this repo instead —
 * and gets something Code Connect does not offer in return.
 *
 * CODE CONNECT CANNOT CHECK ITSELF. It stores a snippet in Figma; nothing tells
 * you when the prop that snippet names is renamed, or a variant is added in
 * Figma and never mapped. This file checks BOTH sides on every build:
 *
 *   figma/components.json        what the Figma component actually is
 *   dist/meta/components.json    what the React component actually is
 *   figma/mapping.json           the claim being made about the two
 *
 * Output: dist/figma-map.json, keyed by node id AND by Figma name, so an agent
 * holding either — from a Figma URL, from get_design_context, from a screenshot
 * caption — can resolve the real component and its real props.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIGMA = join(PKG, 'figma', 'components.json');
const MAP = join(PKG, 'figma', 'mapping.json');
const DOC = join(PKG, 'dist', 'meta', 'components.json');

for (const [label, path] of [
  ['figma/components.json', FIGMA],
  ['figma/mapping.json', MAP],
  ['dist/meta/components.json', DOC],
]) {
  if (!existsSync(path)) {
    console.error(`Missing ${label}.`);
    process.exit(1);
  }
}

const figma = JSON.parse(readFileSync(FIGMA, 'utf8'));
const map = JSON.parse(readFileSync(MAP, 'utf8'));
const code = JSON.parse(readFileSync(DOC, 'utf8'));

const errors = [];
const err = (c, m) => errors.push(`${c}: ${m}`);

const figmaNames = Object.keys(figma.components);
const mapped = map.components ?? {};
const unmapped = map.unmapped ?? {};

/* 1. Every Figma component is either mapped or explicitly unmapped WITH A
 * REASON. Silence is the failure mode: a component nobody mapped and nobody
 * decided not to map looks identical to one that was never exported. */
for (const name of figmaNames) {
  const inMap = name in mapped;
  const inUn = name in unmapped;
  if (!inMap && !inUn)
    err(name, 'in Figma but neither mapped nor listed in "unmapped"');
  if (inMap && inUn) err(name, 'both mapped and listed as unmapped');
  if (inUn && !String(unmapped[name]).trim())
    err(name, 'listed as unmapped with no reason');
}

/* 2. Nothing claims a Figma component that does not exist. */
for (const name of [...Object.keys(mapped), ...Object.keys(unmapped)])
  if (!figmaNames.includes(name))
    err(name, 'named in mapping.json but absent from figma/components.json');

for (const [name, entry] of Object.entries(mapped)) {
  const fig = figma.components[name];
  if (!fig) continue;

  /* 3. The React component it points at must exist. */
  const target = code.components[entry.code];
  if (!target) {
    err(name, `maps to "${entry.code}", which ionbase-ui does not export`);
    continue;
  }

  const claims = entry.props ?? {};

  /* 4. Every Figma property is accounted for — mapped or ignored with a
   * reason. This is the check that catches a NEW Figma property: it appears in
   * the export, nothing names it, and the build stops. */
  for (const propName of Object.keys(fig.props)) {
    const claim = claims[propName];
    if (!claim) {
      err(name, `Figma property "${propName}" is neither mapped nor ignored`);
      continue;
    }
    if (claim.ignore !== undefined) {
      if (!String(claim.ignore).trim())
        err(name, `"${propName}" is ignored with no reason`);
      continue;
    }
    if (!claim.prop) {
      err(name, `"${propName}" has neither "prop" nor "ignore"`);
      continue;
    }

    /* 5. The code prop must be real. */
    const codeProp = target.props?.[claim.prop];
    if (!codeProp) {
      err(
        name,
        `"${propName}" maps to ${entry.code}.${claim.prop}, which is not a prop`,
      );
      continue;
    }

    const def = fig.props[propName];

    /* 6. A full value mapping must be EXHAUSTIVE. An unmapped variant option
     * silently produces undefined, which is Code Connect's own documented
     * pitfall and the one an agent cannot see. */
    if (claim.values) {
      if (def.type !== 'VARIANT') {
        err(
          name,
          `"${propName}" has a value map but is ${def.type}, not VARIANT`,
        );
      } else {
        for (const opt of def.options)
          if (!(opt in claim.values))
            err(name, `"${propName}" does not map the Figma option "${opt}"`);
        for (const opt of Object.keys(claim.values))
          if (!def.options.includes(opt))
            err(
              name,
              `"${propName}" maps "${opt}", which Figma does not offer — [${def.options.join(', ')}]`,
            );
        /* 7. ...and every value it produces must be in the real union. */
        if (codeProp.values) {
          for (const [opt, v] of Object.entries(claim.values))
            if (!codeProp.values.includes(v))
              err(
                name,
                `"${propName}"."${opt}" produces "${v}", not in ${entry.code}.${claim.prop} [${codeProp.values.join(', ')}]`,
              );
        }
      }
    }

    /* 8. A partial mapping is allowed — one Figma axis often splits across
     * several code props — but it must say why, and its keys must be real. */
    if (claim.when) {
      if (!claim.note)
        err(
          name,
          `"${propName}" maps only some options and gives no note saying where the rest went`,
        );
      if (def.type === 'VARIANT') {
        for (const opt of Object.keys(claim.when))
          if (!def.options.includes(opt))
            err(
              name,
              `"${propName}"."${opt}" is not a Figma option — [${def.options.join(', ')}]`,
            );
      }
    }
  }

  /* 9. Nothing maps a Figma property that does not exist. */
  for (const propName of Object.keys(claims))
    if (!(propName in fig.props))
      err(name, `maps "${propName}", which this Figma component does not have`);
}

if (errors.length) {
  for (const e of errors) console.error(`  ERROR ${e}`);
  console.error(`\nFigma map: ${errors.length} errors`);
  process.exit(1);
}

/* ------------------------------------------------------------------ write */

const byName = {};
const byNode = {};
for (const [name, entry] of Object.entries(mapped)) {
  const fig = figma.components[name];
  const target = code.components[entry.code];
  const record = {
    figmaComponent: name,
    figmaNodeId: fig.id,
    figmaPage: fig.page,
    component: entry.code,
    import: target.import,
    docs: `components/${entry.code
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()}/index.html.md`,
    ...(entry.note ? { note: entry.note } : {}),
    ...(entry.example ? { example: entry.example } : {}),
    props: entry.props ?? {},
  };
  byName[name] = record;
  byNode[fig.id] = record;
}

const out = {
  package: 'ionbase-ui',
  version: JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).version,
  figmaFile: figma.file,
  figmaExported: figma.exported,
  usage:
    'Given a Figma node id or component name, look it up here for the React ' +
    'component, its import, and how each Figma property maps onto a real prop. ' +
    'Every mapping is verified against both the Figma export and the ' +
    'TypeScript API on each build.',
  generated: 'by scripts/verify-figma-map.mjs — do not edit',
  byNodeId: byNode,
  byFigmaName: byName,
  unmapped,
};
mkdirSync(join(PKG, 'dist'), { recursive: true });
writeFileSync(
  join(PKG, 'dist', 'figma-map.json'),
  `${JSON.stringify(out, null, 2)}\n`,
);

const propCount = Object.values(mapped).reduce(
  (n, e) => n + Object.keys(e.props ?? {}).length,
  0,
);
console.log(
  `Figma map: ${Object.keys(mapped).length} components mapped, ` +
    `${Object.keys(unmapped).length} explicitly unmapped, ` +
    `${propCount} properties checked against both sides — 0 errors`,
);
