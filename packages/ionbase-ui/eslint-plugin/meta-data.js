/**
 * Rule data, read from the shipped component contracts.
 *
 * Nothing in this plugin hardcodes a component name, a prop, a deprecation or a
 * contrast ratio. All of it comes from dist/meta/components.json, which is
 * generated from the source and the stylesheets and gated by verify-meta.mjs and
 * verify-contrast.mjs. A second hand-maintained copy here would drift, and a
 * drifted lint rule is worse than none — it teaches the wrong thing confidently.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

let doc;
try {
  doc = JSON.parse(
    readFileSync(join(HERE, '..', 'dist', 'meta', 'components.json'), 'utf8'),
  );
} catch {
  // A source checkout before its first build. Rules degrade to no-ops rather
  // than crashing the consumer's lint run.
  doc = { components: {} };
}

export const components = doc.components ?? {};
export const isComponent = (name) => Object.hasOwn(components, name);

/** { Button: [{ prop, replacement, note }] } — only where the source really says @deprecated. */
export const deprecations = Object.fromEntries(
  Object.entries(components)
    .filter(([, c]) => (c.deprecated ?? []).length)
    .map(([n, c]) => [n, c.deprecated]),
);

/** Components whose contract says an accessible name is required. */
export const needsAccessibleName = Object.entries(components)
  .filter(([, c]) =>
    (c.a11y?.requires ?? []).some((r) => /aria-label|accessible name/i.test(r)),
  )
  .map(([n]) => n);

/** Measured contrast defects, with the prop combination that reaches them. */
export const contrastIssues = Object.entries(components).flatMap(([n, c]) =>
  (c.a11y?.knownIssues ?? [])
    .filter((i) => i.appliesTo)
    .map((i) => ({ component: n, ...i })),
);

/** The spacing rungs, for suggesting a token in place of a raw pixel value. */
export const spacingScale = (() => {
  try {
    const css = readFileSync(
      join(HERE, '..', 'dist', 'styles', 'tokens', 'base.css'),
      'utf8',
    );
    const out = {};
    for (const m of css.matchAll(/(--spacing-(\d+))\s*:\s*([\d.]+)px/g)) {
      out[Number(m[3])] = m[1];
    }
    return out;
  } catch {
    return {};
  }
})();
