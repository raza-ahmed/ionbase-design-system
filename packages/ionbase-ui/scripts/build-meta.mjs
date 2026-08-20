#!/usr/bin/env node
/**
 * Generate the machine-readable component contract.
 *
 *   meta/<Name>.json   hand-authored INTENT   (committed, reviewed)
 *        +
 *   src/components/*.tsx via the TS checker    (props, generated)
 *        =
 *   dist/meta/components.json + dist/meta/<Name>.json
 *
 * Why the checker and not react-docgen: these interfaces extend `Omit<>`,
 * `AriaButtonProps<'button'>`, `InputDOMProps` and friends. Only a real type
 * resolution sees through that, and it is also the only way to learn WHERE a
 * prop was declared — which is what lets us keep `onPress` and drop the ~250
 * inherited HTML attributes that would otherwise bury it.
 *
 * Props are NEVER hand-written. A hand-maintained prop table drifts, and a
 * drifted one is worse than none — same argument AGENTS.md makes about
 * CLAUDE.md. The intent files carry judgement; this file carries the API.
 */
import ts from 'typescript';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const META_DIR = join(PKG, 'meta');
const OUT_DIR = join(PKG, 'dist', 'meta');

/* ------------------------------------------------------------------ program */

const configPath = join(PKG, 'tsconfig.json');
const parsed = ts.parseJsonConfigFileContent(
  ts.readConfigFile(configPath, ts.sys.readFile).config,
  ts.sys,
  PKG,
);
const program = ts.createProgram(parsed.fileNames, {
  ...parsed.options,
  noEmit: true,
});
const checker = program.getTypeChecker();

/* ------------------------------------------------------- where is it from? */

/** own = declared in this package · aria = react-aria/react-stately · dom = React's HTML attributes */
function originOf(symbol) {
  const file = symbol.declarations?.[0]?.getSourceFile().fileName ?? '';
  if (file.includes(`${PKG}/src/`)) return 'own';
  if (/@react-types|react-aria|@react-aria|@react-stately/.test(file))
    return 'aria';
  if (/@types\/react|node_modules\/csstype/.test(file)) return 'dom';
  return 'other';
}

/* --------------------------------------------------------------- prop reads */

function literalUnion(type) {
  if (!type.isUnion()) {
    return type.isStringLiteral() ? [type.value] : null;
  }
  const out = [];
  for (const t of type.types) {
    if (t.isStringLiteral()) out.push(t.value);
    else if (t.flags & ts.TypeFlags.Undefined) continue;
    else return null; // not a clean string-literal union
  }
  return out.length ? out : null;
}

function readProps(propsSymbol) {
  const declared = checker.getDeclaredTypeOfSymbol(propsSymbol);
  const props = {};
  const counts = { own: 0, aria: 0, dom: 0, other: 0 };

  for (const p of checker.getPropertiesOfType(declared)) {
    const origin = originOf(p);
    counts[origin] = (counts[origin] ?? 0) + 1;

    // Raw HTML attributes are standard knowledge and would bury the rest.
    if (origin === 'dom') continue;

    const decl = p.declarations?.[0];
    const type = decl
      ? checker.getTypeOfSymbolAtLocation(p, decl)
      : checker.getTypeOfSymbol(p);

    const tags = {};
    for (const t of p.getJsDocTags(checker)) {
      tags[t.name] = ts.displayPartsToString(t.text ?? []).trim();
    }

    const entry = {
      type: checker.typeToString(type, decl, ts.TypeFormatFlags.NoTruncation),
      required: !(p.flags & ts.SymbolFlags.Optional),
      origin,
    };
    const desc = ts
      .displayPartsToString(p.getDocumentationComment(checker))
      .trim();
    if (desc) entry.description = desc;

    const values = literalUnion(type.getNonNullableType?.() ?? type);
    if (values) entry.values = values;
    if (Object.keys(tags).length) entry.tags = tags;

    props[p.getName()] = entry;
  }
  return { props, counts };
}

/* ------------------------------------------------- defaults from the source */

/**
 * Reads `const { variant = 'primary-brand', size = 'md' } = props;` out of the
 * component body. Defaults are the single most useful thing an agent can know
 * about a variant prop and they exist nowhere in the type.
 */
function readDefaults(sourceFile) {
  const defaults = {};
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name &&
      ts.isObjectBindingPattern(node.name)
    ) {
      for (const el of node.name.elements) {
        if (el.initializer && ts.isIdentifier(el.name)) {
          const key = (el.propertyName ?? el.name).getText();
          const init = el.initializer;
          if (ts.isStringLiteral(init)) defaults[key] = init.text;
          else if (init.kind === ts.SyntaxKind.TrueKeyword)
            defaults[key] = true;
          else if (init.kind === ts.SyntaxKind.FalseKeyword)
            defaults[key] = false;
          else if (ts.isNumericLiteral(init)) defaults[key] = Number(init.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return defaults;
}

/* --------------------------------------------------- tokens, from the CSS */

const CSS_DIR = join(PKG, 'src', 'styles');
const CSS_FILES = readdirSync(CSS_DIR).filter((f) => f.endsWith('.css'));
const kebab = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * Which custom properties a component actually consumes, read from its
 * stylesheet. Generated rather than hand-listed for the same reason props are:
 * a hand-kept list is a list that silently goes stale.
 *
 * AvatarGroup, RadioGroup, TableRow and friends share one stylesheet with their
 * parent, so fall back to the longest kebab-prefix that exists on disk.
 */
function tokensFor(name) {
  const want = `${kebab(name)}.css`;
  let file = CSS_FILES.includes(want) ? want : null;
  if (!file) {
    const candidates = CSS_FILES.filter((f) =>
      kebab(name).startsWith(f.replace(/\.css$/, '')),
    ).sort((a, b) => b.length - a.length);
    file = candidates[0] ?? null;
  }
  if (!file) return { stylesheet: null, tokens: [] };
  const css = readFileSync(join(CSS_DIR, file), 'utf8');
  const tokens = [...new Set(css.match(/var\(--[a-z0-9-]+/g) ?? [])]
    .map((m) => m.slice(4))
    .sort();
  return { stylesheet: `src/styles/${file}`, tokens };
}

/* ------------------------------------------- measured contrast, per component */

/**
 * verify-contrast.mjs runs first and writes dist/meta/contrast.json. Folding its
 * failures into each component's `a11y.knownIssues` is the point of doing them
 * in this order: a contrast defect that only exists in a build log teaches
 * nobody, while one in the contract is read by whatever is about to ship it.
 *
 * WCAG-exempt results (disabled controls under SC 1.4.3) are deliberately NOT
 * surfaced — they are correct, and listing them as issues would train a reader
 * to ignore the field.
 */
const CONTRAST = join(PKG, 'dist', 'meta', 'contrast.json');
const contrast = existsSync(CONTRAST)
  ? JSON.parse(readFileSync(CONTRAST, 'utf8'))
  : null;

function knownIssuesFor(stylesheet) {
  if (!contrast || !stylesheet) return [];
  const sheet = stylesheet.replace(/^src\/styles\//, '').replace(/\.css$/, '');
  const exempt = new Set(
    (contrast.accepted ?? [])
      .filter((e) => e.kind === 'wcag-exempt')
      .map((e) => `${e.fg}|${e.bg}|${e.mode}`),
  );
  const reason = new Map(
    (contrast.accepted ?? []).map((e) => [`${e.fg}|${e.bg}|${e.mode}`, e]),
  );

  // A deferred mode is a theme still being designed. Its measurements are real
  // but they are not decisions yet, and shipping them as knownIssues told
  // consumers not to use components that are fine in the themes that ARE final.
  const deferred = new Set(contrast.deferredModes ?? []);

  const out = new Map();
  for (const p of contrast.pairings ?? []) {
    if (p.component !== sheet || p.ratio >= p.min) continue;
    if (deferred.has(p.mode)) continue;
    const k = `${p.fg}|${p.bg}|${p.mode}`;
    if (exempt.has(k)) continue;
    if (out.has(k)) {
      out.get(k).states.add(p.state);
      continue;
    }
    const e = reason.get(k);
    out.set(k, {
      pairing: `${p.fg} on ${p.bg}`,
      mode: p.mode,
      ratio: p.ratio,
      required: p.min,
      sc: p.kind === 'text' ? '1.4.3' : '1.4.11',
      states: new Set([p.state]),
      status: e ? 'known, not yet fixed' : 'unreviewed',
      ...(e?.surfacedBy ? { where: e.surfacedBy } : {}),
      // Structured so the ESLint rule can match a JSX element against it.
      // The prose in `where` is for a human; this is the same fact for a tool.
      ...(e?.appliesTo ? { appliesTo: e.appliesTo } : {}),
    });
  }
  return [...out.values()].map((i) => ({ ...i, states: [...i.states].sort() }));
}

/* ------------------------------------------- discover the exported surface */

const entry = program.getSourceFile(join(PKG, 'src', 'index.ts'));
if (!entry) throw new Error('src/index.ts not in the program');
const moduleSymbol = checker.getSymbolAtLocation(entry);
const exported = checker.getExportsOfModule(moduleSymbol);

const values = new Map(); // Button -> symbol
const types = new Map(); // ButtonProps -> symbol
for (const sym of exported) {
  const resolved =
    sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
  const name = sym.getName();
  if (resolved.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) {
    types.set(name, resolved);
  }
  if (resolved.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable)) {
    values.set(name, resolved);
  }
}

/* ------------------------------------------------------------------- build */

const components = {};
const warnings = [];
const hooks = [];

for (const [name, sym] of [...values].sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  // Hooks are part of the public surface but are not components; `useToast`
  // has no `useToastProps` and never will.
  if (/^use[A-Z]/.test(name)) {
    hooks.push(name);
    continue;
  }

  const propsName = `${name}Props`;
  const propsSym = types.get(propsName);
  // TableHead, TableBody and TabItem take no props of their own. They are still
  // components an agent composing a Table or Tabs has to know exist, so they
  // are listed with an empty API rather than dropped.
  if (!propsSym)
    warnings.push(`${name}: no exported ${propsName} — listed with no props`);

  const decl = sym.declarations?.[0];
  const sourceFile = decl?.getSourceFile();
  const rel = sourceFile ? relative(PKG, sourceFile.fileName) : null;

  // The component's own JSDoc is where the judgement already lives — Alert's
  // "role is chosen by intent, not passed in" is worth more to an agent than
  // any prop table. Capture it; the intent file adds structure on top.
  const description = ts
    .displayPartsToString(sym.getDocumentationComment(checker))
    .trim();

  const { props, counts } = propsSym
    ? readProps(propsSym)
    : { props: {}, counts: { own: 0, aria: 0, dom: 0, other: 0 } };
  const defaults = sourceFile ? readDefaults(sourceFile) : {};
  for (const [k, v] of Object.entries(defaults)) {
    if (props[k]) props[k].default = v;
  }

  const intentPath = join(META_DIR, `${name}.json`);
  const intent = existsSync(intentPath)
    ? JSON.parse(readFileSync(intentPath, 'utf8'))
    : null;
  if (!intent)
    warnings.push(`${name}: no meta/${name}.json — API only, no intent`);

  const sheet = tokensFor(name);
  const knownIssues = knownIssuesFor(sheet.stylesheet);

  components[name] = {
    name,
    source: rel,
    propsType: propsSym ? propsName : null,
    ...(description ? { description } : {}),
    import: `import { ${name} } from 'ionbase-ui';`,
    ...(intent ?? {}),
    ...sheet,
    ...(knownIssues.length
      ? { a11y: { ...(intent?.a11y ?? {}), knownIssues } }
      : {}),
    props, // always last — generated wins, intent may never redefine it
    propCounts: counts,
  };
}

/* ------------------------------------------------------------------- write */

mkdirSync(OUT_DIR, { recursive: true });
const doc = {
  package: 'ionbase-ui',
  version: JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8')).version,
  generated:
    'by scripts/build-meta.mjs — do not edit; intent lives in meta/*.json',
  hooks,
  components,
};
writeFileSync(
  join(OUT_DIR, 'components.json'),
  `${JSON.stringify(doc, null, 2)}\n`,
);
for (const [name, c] of Object.entries(components)) {
  writeFileSync(
    join(OUT_DIR, `${name}.json`),
    `${JSON.stringify(c, null, 2)}\n`,
  );
}

/*
 * A cheap index, so an agent can answer "which component do I need?" without
 * paying for the full contract. components.json is ~180KB; this is a few KB.
 * Same two-tier split Nord and Cloudscape use for llms.txt — pick from the
 * index, then fetch exactly one dist/meta/<Name>.json.
 */
const index = {
  package: 'ionbase-ui',
  version: doc.version,
  usage:
    'Pick a component here, then read dist/meta/<Name>.json for its full contract.',
  hooks,
  components: Object.fromEntries(
    Object.entries(components).map(([name, c]) => [
      name,
      {
        summary: c.summary ?? c.description?.split('\n')[0] ?? null,
        ...(c.status ? { status: c.status } : {}),
        variants: Object.fromEntries(
          Object.entries(c.props)
            .filter(([, p]) => p.values && p.origin === 'own')
            .map(([k, p]) => [k, p.values]),
        ),
        detail: `dist/meta/${name}.json`,
        hasIntent: Boolean(c.summary),
      },
    ]),
  ),
};
writeFileSync(
  join(OUT_DIR, 'index.json'),
  `${JSON.stringify(index, null, 2)}\n`,
);

const withIntent = Object.values(components).filter((c) => c.summary).length;
console.log(
  `Meta: ${Object.keys(components).length} components -> dist/meta/ ` +
    `(${withIntent} with intent, ${Object.keys(components).length - withIntent} API-only)`,
);
for (const w of warnings) console.log(`  note: ${w}`);
