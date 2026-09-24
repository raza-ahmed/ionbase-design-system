/**
 * Smoke test for the built demo: every route, both themes, in a real Chromium.
 *
 * Fails on any console error, uncaught exception, failed request, axe
 * violation, or sideways scroll at phone width. That last one is not
 * hypothetical — it caught two real bugs while the demo was being built (see
 * the gap list in README.md), neither of which any type check or lint could see.
 *
 *   pnpm --filter @ionbase-ui/demo build
 *   pnpm --filter @ionbase-ui/demo test:smoke
 */
/*
 * Node 22 has fetch and setTimeout; the browser globals belong to the functions
 * handed to page.evaluate and addInitScript, which run inside Chromium.
 */
/* global fetch, setTimeout, window, document, localStorage */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;

const ROUTES = [
  'overview',
  'agents',
  'agents/new',
  // A failing agent, so the chart has all three series and the table has
  // every outcome badge.
  'agents/agt_wx',
  'agents/agt_wx/runs',
  'runs',
  'runs/run_4821',
  'assistant',
  'settings',
  'no-such-page',
];
const THEMES = ['light', 'dark'];

const server = spawn(
  join(here, '../node_modules/.bin/vite'),
  ['preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
  { cwd: join(here, '..'), stdio: 'ignore' },
);

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    `vite preview did not start on ${BASE} — was the demo built?`,
  );
}

const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  for (const theme of THEMES) {
    for (const [viewport, width, height] of [
      ['desktop', 1280, 900],
      ['mobile', 390, 844],
    ]) {
      const context = await browser.newContext({ viewport: { width, height } });
      // Settings the demo bar would otherwise hold: a theme and no fake latency.
      await context.addInitScript(
        (t) =>
          localStorage.setItem(
            'ionbase-ops:demo-settings',
            JSON.stringify({ theme: t, latency: 0 }),
          ),
        theme,
      );

      for (const route of ROUTES) {
        const where = `#/${route} (${theme}, ${viewport})`;
        const page = await context.newPage();
        page.on(
          'console',
          (m) => m.type() === 'error' && fail(where, `console: ${m.text()}`),
        );
        page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
        page.on(
          'response',
          (r) =>
            r.status() >= 400 && fail(where, `HTTP ${r.status()} ${r.url()}`),
        );

        await page.goto(`${BASE}/#/${route}`);
        try {
          await page.locator('#page-title').waitFor({ timeout: 10_000 });
          await page.waitForFunction(
            () => !document.querySelector('[aria-busy="true"]'),
            null,
            {
              timeout: 10_000,
            },
          );
        } catch {
          fail(
            where,
            'page never finished loading (no #page-title, or still aria-busy)',
          );
        }
        // Let lazy chunks, charts and the first run step settle.
        await page.waitForTimeout(600);

        const actualTheme = await page.evaluate(
          () => document.documentElement.dataset.theme,
        );
        if (actualTheme !== theme)
          fail(where, `data-theme is "${actualTheme}"`);

        if (viewport === 'mobile') {
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          );
          if (overflow > 0) fail(where, `scrolls sideways by ${overflow}px`);
        } else {
          await page.addScriptTag({ content: axeSource });
          const violations = await page.evaluate(async () => {
            const result = await window.axe.run(document, {
              resultTypes: ['violations'],
            });
            return result.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
            }));
          });
          for (const v of violations) {
            fail(where, `axe ${v.impact} ${v.id} — ${v.targets.join(', ')}`);
          }
        }
        await page.close();
      }
      await context.close();
    }
  }
} finally {
  await browser?.close();
  server.kill();
}

const checked = ROUTES.length * THEMES.length * 2;
if (failures.length) {
  console.error(
    `Demo smoke: ${failures.length} failures across ${checked} page loads\n`,
  );
  for (const f of failures) console.error(`  ✖ ${f}`);
  process.exit(1);
}
console.log(
  `Demo smoke: ${checked} page loads — no errors, no axe violations, no sideways scroll`,
);
