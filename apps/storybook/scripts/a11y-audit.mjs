/**
 * One-shot axe audit over Storybook stories in light and dark themes.
 *
 * Not a CI gate — run manually after a11y work. Expects Storybook already
 * serving on PORT (default 6006).
 *
 *   pnpm --filter @ionbase-ui/storybook storybook
 *   node apps/storybook/scripts/a11y-audit.mjs
 */
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');

function resolveAxe() {
  const candidates = [
    join(
      root,
      'node_modules/.pnpm/axe-core@4.12.1/node_modules/axe-core/axe.min.js',
    ),
  ];
  try {
    const pkg = require.resolve('axe-core/package.json', {
      paths: [
        join(root, 'node_modules/@storybook/addon-a11y'),
        join(root, 'apps/storybook/node_modules'),
        root,
      ],
    });
    candidates.unshift(join(dirname(pkg), 'axe.min.js'));
    candidates.unshift(join(dirname(pkg), 'axe.js'));
  } catch {
    // fall through to the hardcoded pnpm path
  }
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error('axe-core not found — is @storybook/addon-a11y installed?');
}

const axePath = resolveAxe();
const PORT = process.env.STORYBOOK_PORT || '6006';
const BASE = `http://127.0.0.1:${PORT}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const indexRes = await page.goto(`${BASE}/index.json`, {
  waitUntil: 'networkidle',
});
if (!indexRes || !indexRes.ok()) {
  console.error(`Storybook not reachable at ${BASE}. Start it first.`);
  await browser.close();
  process.exit(1);
}
const index = await indexRes.json();
const entries = Object.values(index.entries || {}).filter(
  (e) => e.type === 'story' && !e.id?.includes('--docs'),
);

const themes = ['light', 'dark'];
const findings = [];

for (const theme of themes) {
  for (const entry of entries) {
    const url = `${BASE}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=story&globals=theme:${theme}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.addScriptTag({ path: axePath });
    const result = await page.evaluate(async () => {
      // eslint-disable-next-line no-undef
      return await axe.run(document, {
        // Story iframes are bare fragments — same exclusions as preview.tsx.
        rules: {
          region: { enabled: false },
          'landmark-one-main': { enabled: false },
          'page-has-heading-one': { enabled: false },
        },
      });
    });
    for (const v of result.violations) {
      findings.push({
        theme,
        story: entry.id,
        title: entry.title,
        name: entry.name,
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
      });
    }
  }
}

await browser.close();

const byKey = new Map();
for (const f of findings) {
  const key = `${f.id}::${f.theme}`;
  if (!byKey.has(key)) {
    byKey.set(key, {
      id: f.id,
      theme: f.theme,
      impact: f.impact,
      help: f.help,
      stories: [],
    });
  }
  byKey.get(key).stories.push(f.story);
}

console.log(`\nAxe audit: ${entries.length} stories × ${themes.length} themes`);
console.log(
  `Violations: ${findings.length} node-groups across ${byKey.size} rule×theme pairs\n`,
);

if (byKey.size === 0) {
  console.log('Clean — no violations beyond the disabled region rule.');
  process.exit(0);
}

const sorted = [...byKey.values()].sort(
  (a, b) => a.id.localeCompare(b.id) || a.theme.localeCompare(b.theme),
);

for (const g of sorted) {
  const uniqueStories = [...new Set(g.stories)];
  console.log(`[${g.impact}] ${g.id} (${g.theme}) — ${g.help}`);
  console.log(
    `  ${uniqueStories.length} stor${uniqueStories.length === 1 ? 'y' : 'ies'}: ${uniqueStories.slice(0, 8).join(', ')}${uniqueStories.length > 8 ? `, +${uniqueStories.length - 8} more` : ''}`,
  );
  console.log('');
}

process.exit(findings.length ? 1 : 0);
