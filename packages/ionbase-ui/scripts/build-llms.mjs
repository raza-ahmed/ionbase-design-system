#!/usr/bin/env node
/**
 * Phase 3a — make IonBase readable by an agent that has never seen this repo.
 *
 * Two audiences, two artefacts, one generator:
 *
 *   llms.txt (package root)   committed, ships in the tarball. An agent working
 *                             offline with ionbase-ui in node_modules finds the
 *                             contract with no network call. This is the common
 *                             case and the one hosted docs miss entirely.
 *
 *   --site <dir>              llms.txt + components/<slug>/index.html.{md,json}
 *                             written into the Storybook static build at deploy
 *                             time, so they land at the Pages root.
 *
 * The markdown is a RENDERING of dist/meta, never a second source. Nothing here
 * is authored: change meta/<Name>.json and the page changes. That is the whole
 * reason this is a generator and not a docs folder — a hand-kept mirror drifts,
 * and a drifted mirror is worse than none.
 *
 * Shape copied from AWS Cloudscape (`index.html.md` / `index.html.json` beside
 * every docs URL, indexed by /llms.txt) rather than invented. It is the most
 * complete public implementation and agents are increasingly trained on it.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const META = join(PKG, 'dist', 'meta');
const DEFAULT_BASE = 'https://raza-ahmed.github.io/ionbase-design-system';

/* ------------------------------------------------------------------- args */

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};
const siteDir = flag('site');
const baseUrl = (flag('base-url') ?? DEFAULT_BASE).replace(/\/$/, '');

if (!existsSync(join(META, 'index.json'))) {
  console.error('No dist/meta — run scripts/build-meta.mjs first.');
  process.exit(1);
}

const index = JSON.parse(readFileSync(join(META, 'index.json'), 'utf8'));
const names = Object.keys(index.components);
const read = (n) => JSON.parse(readFileSync(join(META, `${n}.json`), 'utf8'));

/* Patterns are a separate tier with a separate index, and are optional: an
 * older dist/ predating phase 4a still renders. */
const PATTERNS = join(META, 'patterns');
const patternIndex = existsSync(join(PATTERNS, 'index.json'))
  ? JSON.parse(readFileSync(join(PATTERNS, 'index.json'), 'utf8'))
  : { patterns: {} };
const patternNames = Object.keys(patternIndex.patterns);
const readPattern = (n) =>
  JSON.parse(readFileSync(join(PATTERNS, `${n}.json`), 'utf8'));

/* Button -> button, AvatarGroup -> avatar-group, LogoMark -> logo-mark. */
const slug = (n) =>
  n
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();

/*
 * Storybook's own manifest, when we are writing into a built site. It is the
 * only place the docs story id lives, and guessing it from the title would
 * break silently the first time a story is renamed.
 */
const storyUrls = (() => {
  if (!siteDir) return {};
  const manifest = join(siteDir, 'index.json');
  if (!existsSync(manifest)) {
    console.warn('  note: no Storybook index.json — pages omit story links');
    return {};
  }
  const out = {};
  const entries = JSON.parse(readFileSync(manifest, 'utf8')).entries ?? {};
  for (const e of Object.values(entries)) {
    if (e.type !== 'docs') continue;
    const title = String(e.title ?? '')
      .split('/')
      .pop();
    if (title) out[title] = `${baseUrl}/?path=/docs/${e.id}`;
  }
  return out;
})();

/* -------------------------------------------------------------- markdown */

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
const list = (items) => items.map((i) => `- ${i}`).join('\n');

const table = (headers, rows) =>
  [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`),
  ].join('\n');

function renderComponent(name) {
  const c = read(name);
  const out = [];
  const p = (s = '') => out.push(s);

  p(`# ${name}`);
  p();
  if (c.summary) {
    p(`> ${c.summary}`);
    p();
  }

  const facts = [`**Import:** \`${c.import}\``];
  if (c.status) facts.push(`**Status:** ${c.status}`);
  if (c.since) facts.push(`**Since:** ${c.since}`);
  /* A re-exported component's source is a pnpm store path, which tells a
   * reader nothing and changes on every dependency bump. Name the package. */
  const dep = [
    ...(c.source ?? '').matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)\//g),
  ]
    .map((m) => m[1])
    .filter((n) => n !== '.pnpm')
    .pop();
  facts.push(
    dep
      ? `**Source:** re-exported from \`${dep}\``
      : `**Source:** \`${c.source}\``,
  );
  p(facts.join(' · '));
  p();
  const links = [`[Machine-readable contract](./index.html.json)`];
  if (storyUrls[name]) links.push(`[Live examples](${storyUrls[name]})`);
  p(links.join(' · '));
  p();

  if (c.useWhen?.length) {
    p('## Use it when');
    p();
    p(list(c.useWhen));
    p();
  }

  if (c.useInstead?.length) {
    p('## Use something else when');
    p();
    p(
      table(
        ['when', 'use', 'why'],
        c.useInstead.map((u) => [u.when ?? '', `\`${u.use}\``, u.why ?? '']),
      ),
    );
    p();
  }

  if (c.composition) {
    p('## Composition');
    p();
    if (c.composition.order) p(`\`${c.composition.order.join(' > ')}\``);
    if (c.composition.note) {
      p();
      p(c.composition.note);
    }
    if (c.composition.example) {
      p();
      p('```tsx');
      p(c.composition.example);
      p('```');
    }
    p();
  }

  if (c.variants && Object.keys(c.variants).length) {
    p('## Variants');
    p();
    for (const [prop, cases] of Object.entries(c.variants)) {
      const def = c.props?.[prop]?.default;
      p(`### \`${prop}\``);
      p();
      p(
        table(
          ['value', 'when to use'],
          Object.entries(cases).map(([value, guide]) => [
            `\`${value}\`${value === def ? ' *(default)*' : ''}`,
            [guide.use, guide.caveat && `**Caveat:** ${guide.caveat}`]
              .filter(Boolean)
              .join(' — '),
          ]),
        ),
      );
      p();
    }
  }

  const own = Object.entries(c.props ?? {}).filter(
    ([, v]) => v.origin === 'own',
  );
  if (own.length) {
    p('## Props');
    p();
    p(
      table(
        ['prop', 'type', 'default', 'description'],
        own.map(([n, v]) => [
          `\`${n}\`${v.required ? ' *(required)*' : ''}`,
          `\`${v.values ? v.values.map((x) => `'${x}'`).join(' | ') : v.type}\``,
          v.default === undefined ? '' : `\`${JSON.stringify(v.default)}\``,
          [
            v.description ?? '',
            v.tags?.deprecated && `**Deprecated.** ${v.tags.deprecated}`,
          ]
            .filter(Boolean)
            .join(' '),
        ]),
      ),
    );
    p();
    const { aria = 0, dom = 0 } = c.propCounts ?? {};
    if (aria || dom) {
      /* The inherited props are real and callable, so an agent must be told
       * they exist — but listing 300 DOM attributes here would bury the six
       * that carry the design. The JSON twin has the full table. */
      const inherited = [
        aria && `${aria} ARIA props`,
        dom && `${dom} standard DOM attributes`,
      ]
        .filter(Boolean)
        .join(' and ');
      p(
        `It also accepts ${inherited}, listed in full in the JSON contract but ` +
          `omitted here — the ${own.length} above are the props this component ` +
          `actually defines.`,
      );
      p();
    }
  }

  if (c.slots && Object.keys(c.slots).length) {
    p('## Slots');
    p();
    p(
      table(
        ['slot', 'accepts', 'note'],
        Object.entries(c.slots).map(([n, s]) => [
          `\`${n}\``,
          s.accepts ?? '',
          s.note ?? '',
        ]),
      ),
    );
    p();
  }

  if (c.a11y) {
    p('## Accessibility');
    p();
    if (c.a11y.role) {
      p(`**Role:** ${c.a11y.role}`);
      p();
    }
    if (c.a11y.guarantees?.length) {
      p('**The component guarantees:**');
      p();
      p(list(c.a11y.guarantees));
      p();
    }
    if (c.a11y.requires?.length) {
      p('**It requires of you:**');
      p();
      p(list(c.a11y.requires));
      p();
    }
    if (c.a11y.notes?.length) {
      p('**Notes:**');
      p();
      p(list(c.a11y.notes));
      p();
    }
    if (c.a11y.knownIssues?.length) {
      p('**Known issues, measured:**');
      p();
      p(
        list(
          c.a11y.knownIssues.map(
            (i) =>
              `${i.summary ?? i.note ?? JSON.stringify(i)}${i.appliesTo ? ` (\`${JSON.stringify(i.appliesTo)}\`)` : ''}`,
          ),
        ),
      );
      p();
    }
  }

  if (c.antiPatterns?.length) {
    p('## Anti-patterns');
    p();
    p(
      table(
        ["don't", 'do instead', 'why'],
        c.antiPatterns.map((a) => [
          a.dont ?? '',
          a.do ? `\`${a.do}\`` : '',
          a.why ?? '',
        ]),
      ),
    );
    p();
  }

  if (c.deprecated?.length) {
    p('## Deprecated props');
    p();
    p(
      table(
        ['prop', 'use instead', 'note'],
        c.deprecated.map((d) => [
          `\`${d.prop}\``,
          d.replacement ? `\`${d.replacement}\`` : '',
          d.note ?? '',
        ]),
      ),
    );
    p();
  }

  if (c.sizes?.ladder) {
    p('## Size ladder');
    p();
    if (c.sizes.note) {
      p(c.sizes.note);
      p();
    }
    p(
      table(
        ['rung', 'px'],
        Object.entries(c.sizes.ladder).map(([k, v]) => [`\`${k}\``, String(v)]),
      ),
    );
    p();
  }

  if (c.missingStates?.note) {
    p('## States this component does not provide');
    p();
    p(c.missingStates.note);
    p();
  }

  if (c.tokens?.length) {
    p('## Design tokens it consumes');
    p();
    p(`From \`${c.stylesheet}\`:`);
    p();
    p(c.tokens.map((t) => `\`${t}\``).join(', '));
    p();
  }

  if (c.description) {
    p('## Why it is built this way');
    p();
    p(c.description);
    p();
  }

  p('---');
  p();
  p(
    `Generated from \`${index.package}@${index.version}\` — do not edit. ` +
      `Judgement lives in \`meta/${name}.json\`; the API is read from the TypeScript checker.`,
  );
  p();

  return out.join('\n');
}

function renderPattern(name) {
  const c = readPattern(name);
  const out = [];
  const p = (s = '') => out.push(s);

  p(`# ${name} pattern`);
  p();
  p(`> ${c.summary}`);
  p();
  p(
    'A pattern is a documented composition of components, not a component. ' +
      'Nothing here ships as code — build it from the pieces below.',
  );
  p();
  p(
    `**Composes:** ${c.composes
      .map((n) => `[${n}](../../components/${slug(n)}/index.html.md)`)
      .join(', ')}`,
  );
  p();
  p(`[Machine-readable version](./index.html.json)`);
  p();

  if (c.useWhen?.length) {
    p('## Use it when');
    p();
    p(list(c.useWhen));
    p();
  }

  if (c.structure?.length) {
    p('## Structure');
    p();
    p(list(c.structure));
    p();
  }

  if (c.states) {
    p('## States');
    p();
    p(
      'These are the reason this tier exists. They belong to no single ' +
        'component, no prop type mentions them, and no type check misses ' +
        'them — which is why they are the part that gets left out.',
    );
    p();
    for (const [key, st] of Object.entries(c.states)) {
      p(`### ${key}`);
      p();
      p(st.must);
      p();
      p(`**Why:** ${st.why}`);
      if (st.a11y) {
        p();
        p(`**Accessibility:** ${st.a11y}`);
      }
      p();
    }
  }

  if (c.propsUsed && Object.keys(c.propsUsed).length) {
    p('## Props this pattern relies on');
    p();
    p(
      table(
        ['component', 'props'],
        Object.entries(c.propsUsed).map(([comp, props]) => [
          `[${comp}](../../components/${slug(comp)}/index.html.md)`,
          props.map((x) => `\`${x}\``).join(', '),
        ]),
      ),
    );
    p();
    p('Every name above is checked against the real API at build time.');
    p();
  }

  if (c.a11y?.requires?.length) {
    p('## Accessibility');
    p();
    p('**It requires of you:**');
    p();
    p(list(c.a11y.requires));
    p();
    if (c.a11y.notes?.length) {
      p('**Notes:**');
      p();
      p(list(c.a11y.notes));
      p();
    }
  }

  if (c.antiPatterns?.length) {
    p('## Anti-patterns');
    p();
    p(
      table(
        ["don't", 'do instead', 'why'],
        c.antiPatterns.map((a) => [a.dont ?? '', a.do ?? '', a.why ?? '']),
      ),
    );
    p();
  }

  p('---');
  p();
  p(
    `Generated from \`${index.package}@${index.version}\` — do not edit. ` +
      `The recipe lives in \`patterns/${name}.json\`, and every component, ` +
      `prop and variant value it names is verified against the real API.`,
  );
  p();

  return out.join('\n');
}

/* -------------------------------------------------------------- llms.txt */

const PITCH =
  'IonBase is a React design system for enterprise SaaS, built to be consumed ' +
  'by an agent rather than read by a developer. Every component ships a ' +
  'machine-readable contract carrying the judgement a type signature cannot: ' +
  'when to use it, what to use instead, the anti-patterns, and what it ' +
  'guarantees for accessibility versus what it requires of you.';

function hostedIndex() {
  const out = [];
  const p = (s = '') => out.push(s);

  p(`# IonBase Design System`);
  p();
  p(`> ${PITCH}`);
  p();
  p(
    `\`npm install ${index.package}\` — version ${index.version}. ` +
      `${names.length} components, all with a full contract.`,
  );
  p();
  p(
    'Read the index first, then exactly one component. Do not load ' +
      '`components.json`: it is every contract in one file, for tooling that ' +
      'wants a single fetch, and it will bury the one component you need.',
  );
  p();

  p('## Start here');
  p();
  p(
    `- [Component index](${baseUrl}/meta/index.json): every component, its ` +
      `summary and its variant axes. Pick from this.`,
  );
  p(`- [Storybook](${baseUrl}/): live examples and rendered stories.`);
  p();

  p('## Components');
  p();
  for (const n of names) {
    const c = index.components[n];
    p(
      `- [${n}](${baseUrl}/components/${slug(n)}/index.html.md): ` +
        `${c.summary ?? ''}`,
    );
  }
  p();

  if (patternNames.length) {
    p('## Patterns');
    p();
    p(
      'Compositions, not components — and the only place the empty, loading ' +
        'and error states are written down. Read the pattern before building ' +
        'a screen out of the components it names.',
    );
    p();
    for (const n of patternNames) {
      p(
        `- [${n}](${baseUrl}/patterns/${slug(n)}/index.html.md): ` +
          `${patternIndex.patterns[n].summary}`,
      );
    }
    p();
  }

  if (index.hooks?.length) {
    p('## Hooks');
    p();
    for (const h of index.hooks) p(`- \`${h}\``);
    p();
  }

  p('## Coming from a Figma design?');
  p();
  p(
    `- [Figma map](${baseUrl}/figma-map.json): every Figma component and node ` +
      `id in the IonBase library, mapped to the React component and its real ` +
      `props. Look the node id up here instead of inferring the component ` +
      `from a screenshot.`,
  );
  p();

  p('## Optional');
  p();
  p(
    `- [All contracts in one file](${baseUrl}/meta/components.json): tooling ` +
      `only — see the warning above.`,
  );
  p(
    `- Every component page has a \`.json\` twin at ` +
      `\`components/<name>/index.html.json\` with the full prop table, ` +
      `including inherited ARIA and DOM attributes.`,
  );
  p();

  return out.join('\n');
}

/*
 * The tarball copy is deliberately different, not a duplicate. An agent that
 * finds this file has the package on disk, so it needs local paths, not URLs —
 * and it needs them short, because this is read alongside whatever else is in
 * node_modules rather than fetched on purpose.
 */
function tarballIndex() {
  const out = [];
  const p = (s = '') => out.push(s);

  p(`# ${index.package}`);
  p();
  p(`> ${PITCH}`);
  p();
  p(`Version ${index.version}. ${names.length} components.`);
  p();
  p('## Read these, in this order');
  p();
  p(
    '1. `dist/meta/index.json` — every component with its summary and variant ' +
      'axes. Pick one from here.',
  );
  p(
    '2. `dist/meta/<Name>.json` — the full contract for that one component: ' +
      'props with their origins and defaults, variant guidance, slots, ' +
      'accessibility guarantees and requirements, anti-patterns, tokens.',
  );
  p();
  p(
    'Both are importable: `ionbase-ui/meta/index` and ' +
      '`ionbase-ui/meta/<Name>.json`. Do NOT load `ionbase-ui/meta` ' +
      '(`components.json`) — it is all 35 contracts in one file, for tooling ' +
      'that wants a single fetch, and it will bury the component you need.',
  );
  p();
  p('## Components');
  p();
  p(names.map((n) => `\`${n}\``).join(', '));
  p();
  if (patternNames.length) {
    p('## Patterns');
    p();
    p(
      'Compositions of the components above, in `dist/meta/patterns/`. Read ' +
        '`dist/meta/patterns/index.json`, then one recipe. They are the only ' +
        'place the empty, loading and error states are specified — no ' +
        'component owns those, which is why they are the part that gets ' +
        'left out.',
    );
    p();
    p(patternNames.map((n) => `\`${n}\``).join(', '));
    p();
  }

  p('## Coming from a Figma design?');
  p();
  p(
    '`dist/figma-map.json` maps every Figma component and node id in the ' +
      'IonBase library to the React component and the real props — what Code ' +
      'Connect does, without needing an Organization plan. Look up the node ' +
      'id or the component name rather than guessing from a screenshot.',
  );
  p();

  p('## Rules that ship with this package');
  p();
  p(
    '- `ionbase-ui/eslint-plugin` — five rules driven from the contracts: ' +
      'deprecated props, missing accessible names, raw style values, measured ' +
      'contrast failures, competing primary actions.',
  );
  p(
    '- `ionbase-ui/stylelint-config` — bans raw colour and spacing values in ' +
      'favour of tokens.',
  );
  p();
  p('Turn both on. They encode the same judgement as the contracts, enforced.');
  p();
  p(`## Hosted`);
  p();
  p(`${baseUrl}/llms.txt — the same index with per-component markdown pages.`);
  p();

  return out.join('\n');
}

/* ----------------------------------------------------------------- write */

const write = (path, body) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
};

write(join(PKG, 'llms.txt'), tarballIndex());
console.log(
  `llms.txt -> ${index.package}/llms.txt (${names.length} components)`,
);

if (siteDir) {
  const root = resolve(siteDir);
  if (!existsSync(root)) {
    console.error(`--site ${root} does not exist — build the site first.`);
    process.exit(1);
  }
  /* Stale pages for a deleted component are worse than none: an agent has no
   * way to tell a live page from an orphan. */
  rmSync(join(root, 'components'), { recursive: true, force: true });

  write(join(root, 'llms.txt'), hostedIndex());

  /* The index the hosted llms.txt tells an agent to read first has to exist at
   * that URL. Storybook does not publish dist/meta, so copy the two files the
   * index links to. Per-component contracts are already published as each
   * page's index.html.json twin. */
  for (const f of ['index.json', 'components.json'])
    write(join(root, 'meta', f), readFileSync(join(META, f), 'utf8'));
  if (patternNames.length)
    write(
      join(root, 'meta', 'patterns', 'index.json'),
      readFileSync(join(PATTERNS, 'index.json'), 'utf8'),
    );
  const figmaMap = join(PKG, 'dist', 'figma-map.json');
  if (existsSync(figmaMap))
    write(join(root, 'figma-map.json'), readFileSync(figmaMap, 'utf8'));

  for (const n of names) {
    const dir = join(root, 'components', slug(n));
    write(join(dir, 'index.html.md'), renderComponent(n));
    write(
      join(dir, 'index.html.json'),
      readFileSync(join(META, `${n}.json`), 'utf8'),
    );
  }
  rmSync(join(root, 'patterns'), { recursive: true, force: true });
  for (const n of patternNames) {
    const dir = join(root, 'patterns', slug(n));
    write(join(dir, 'index.html.md'), renderPattern(n));
    write(
      join(dir, 'index.html.json'),
      readFileSync(join(PATTERNS, `${n}.json`), 'utf8'),
    );
  }

  /*
   * Every link in llms.txt must resolve to a file that was just written.
   *
   * This is the one failure this generator can have that nobody would notice:
   * a 404 in a file no human opens, discovered by an agent that then has no
   * way to tell a broken link from a component that does not exist. Storybook
   * `?path=` links are excluded — those resolve inside the SPA, not on disk.
   */
  const linked = [
    ...hostedIndex().matchAll(new RegExp(`\\(${baseUrl}([^)]*)\\)`, 'g')),
  ]
    .map((m) => m[1])
    .filter((href) => href && !href.startsWith('/?'));

  /* Pattern pages link sideways into the component pages by relative path.
   * Same failure, same check: resolve them from the page that holds them. */
  const relative = [];
  for (const n of patternNames) {
    const dir = join(root, 'patterns', slug(n));
    for (const m of renderPattern(n).matchAll(/\]\((\.[^)]+)\)/g))
      relative.push([join(dir, m[1]), `patterns/${slug(n)} -> ${m[1]}`]);
  }

  const broken = [
    ...linked.filter(
      (href) => !existsSync(join(root, decodeURIComponent(href))),
    ),
    ...relative.filter(([abs]) => !existsSync(abs)).map(([, label]) => label),
  ];
  if (broken.length) {
    console.error(
      `llms.txt links to ${broken.length} path(s) that were not written:`,
    );
    for (const b of broken) console.error(`  ${b}`);
    process.exit(1);
  }

  console.log(
    `site     -> ${root}/llms.txt + components/*/index.html.{md,json} ` +
      `+ patterns/*/ (${names.length} components, ${patternNames.length} patterns, ` +
      `${linked.length + relative.length} links checked, base ${baseUrl})`,
  );
}
