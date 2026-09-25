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
let loadingChecked = 0;
let paletteChecked = 0;
let menusChecked = 0;
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

  /*
   * The command palette, opened the two ways a person opens it: the shortcut
   * on a desktop, the header button on a phone, which has no ⌘K. It lives in a
   * portal that no page load above ever renders, so it is checked here — axe
   * over the open dialog, no sideways scroll, and a command that really runs.
   */
  for (const theme of THEMES) {
    for (const [viewport, width, height] of [
      ['desktop', 1280, 900],
      ['mobile', 390, 844],
    ]) {
      const where = `command palette (${theme}, ${viewport})`;
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript(
        (t) =>
          localStorage.setItem(
            'ionbase-ops:demo-settings',
            JSON.stringify({ theme: t, latency: 0 }),
          ),
        theme,
      );
      const page = await context.newPage();
      page.on(
        'console',
        (m) => m.type() === 'error' && fail(where, `console: ${m.text()}`),
      );
      page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
      await page.goto(`${BASE}/#/overview`);
      await page.locator('#page-title').waitFor({ timeout: 10_000 });

      if (viewport === 'mobile') {
        await page.getByRole('button', { name: /^Search/ }).click();
      } else {
        await page.keyboard.press('ControlOrMeta+k');
      }
      const dialog = page.getByRole('dialog', { name: 'Search and commands' });
      try {
        await dialog.waitFor({ timeout: 5_000 });
      } catch {
        fail(where, 'did not open');
        await context.close();
        continue;
      }

      if (viewport === 'mobile') {
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (overflow > 0) fail(where, `scrolls sideways by ${overflow}px`);
      } else {
        await page.addScriptTag({ content: axeSource });
        const violations = await page.evaluate(async () => {
          const result = await window.axe.run(
            document.querySelector('[role="dialog"]'),
            { resultTypes: ['violations'] },
          );
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

      await page.keyboard.type('go to runs');
      await page.keyboard.press('Enter');
      try {
        await page.waitForFunction(
          () => document.location.hash === '#/runs',
          null,
          {
            timeout: 5_000,
          },
        );
        await dialog.waitFor({ state: 'detached', timeout: 5_000 });
      } catch {
        fail(where, '"Go to Runs" did not close the palette and navigate');
      }
      paletteChecked++;
      await context.close();
    }
  }

  /*
   * The two menus, both of which live in a popover no page load above opens.
   * A row's actions: opening lands on the first enabled row, the arrow keys
   * move, Escape closes and gives focus back to the "⋯" that opened it. The
   * workspace switcher: the current workspace is announced as checked, and
   * choosing another closes the menu and switches.
   */
  for (const theme of THEMES) {
    const where = `menus (${theme}, desktop)`;
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript(
      (t) =>
        localStorage.setItem(
          'ionbase-ops:demo-settings',
          JSON.stringify({ theme: t, latency: 0 }),
        ),
      theme,
    );
    const page = await context.newPage();
    page.on(
      'console',
      (m) => m.type() === 'error' && fail(where, `console: ${m.text()}`),
    );
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents`);
    await page.locator('#page-title').waitFor({ timeout: 10_000 });

    const trigger = page.getByRole('button', { name: /^Actions for / }).first();
    const name = await trigger.getAttribute('aria-label');
    await trigger.click();
    const menu = page.getByRole('menu', { name });
    try {
      await menu.waitFor({ timeout: 5_000 });
      const focused = await page.evaluate(() =>
        document.activeElement?.getAttribute('role'),
      );
      if (focused !== 'menuitem') {
        fail(where, `row actions opened with focus on ${focused}, not a row`);
      }
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          document.querySelector('[role="menu"]'),
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v} in row actions`);

      await page.keyboard.press('Escape');
      await menu.waitFor({ state: 'detached', timeout: 5_000 });
      // Focus comes back a frame after the popover unmounts, not in the same
      // tick — so wait for it. Unlike hover, restored focus is a level that
      // stays, which is what makes waiting the right tool here.
      try {
        await page.waitForFunction(
          (n) => document.activeElement?.getAttribute('aria-label') === n,
          name,
          { timeout: 2_000 },
        );
      } catch {
        const back = await page.evaluate(() =>
          document.activeElement?.getAttribute('aria-label'),
        );
        fail(where, `Escape left focus on "${back}"`);
      }
    } catch {
      fail(where, 'row actions menu did not open and close');
    }

    await page.getByRole('button', { name: 'Northwind', exact: true }).click();
    const switcher = page.getByRole('menu', { name: 'Workspaces' });
    try {
      await switcher.waitFor({ timeout: 5_000 });
      const checked = await switcher
        .getByRole('menuitemradio', { name: 'Northwind', exact: true })
        .getAttribute('aria-checked');
      if (checked !== 'true') fail(where, 'current workspace is not checked');
      await switcher
        .getByRole('menuitemradio', { name: 'Northwind sandbox' })
        .click();
      await switcher.waitFor({ state: 'detached', timeout: 5_000 });
      await page
        .getByRole('button', { name: 'Northwind sandbox' })
        .waitFor({ timeout: 5_000 });
    } catch {
      fail(where, 'choosing a workspace did not close the menu and switch');
    }
    menusChecked++;
    await context.close();
  }

  /*
   * The loading states, at phone width. With no latency a skeleton is gone
   * before anything can measure it, and a skeleton is laid out differently
   * from the content it stands in for — the Agents skeleton once pushed the
   * page 527px sideways while the loaded table fit. A long latency holds each
   * screen in its loading state long enough to check.
   */
  const slow = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await slow.addInitScript(() =>
    localStorage.setItem(
      'ionbase-ops:demo-settings',
      JSON.stringify({ theme: 'light', latency: 20_000 }),
    ),
  );
  for (const route of ROUTES) {
    const where = `#/${route} (loading, mobile)`;
    const page = await slow.newPage();
    await page.goto(`${BASE}/#/${route}`);
    await page.locator('#page-title').waitFor({ timeout: 10_000 });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (overflow > 0) fail(where, `scrolls sideways by ${overflow}px`);
    loadingChecked++;
    await page.close();
  }
  await slow.close();
} finally {
  await browser?.close();
  server.kill();
}

const checked =
  ROUTES.length * THEMES.length * 2 +
  loadingChecked +
  paletteChecked +
  menusChecked;
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
