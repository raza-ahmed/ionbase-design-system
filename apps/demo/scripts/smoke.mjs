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
let groupsChecked = 0;
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
      // A pointer open focuses the menu, not a row, so no ring flashes on a
      // row the user never moved to. Either way focus has to be IN the menu —
      // a menu left behind the popover's edge is unreachable by keyboard.
      const inside = await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="menu"]')),
      );
      if (!inside)
        fail(where, 'row actions opened with focus outside the menu');
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

      // From the keyboard, Enter on the "⋯" opens on the first enabled row.
      await page.keyboard.press('Enter');
      await menu.waitFor({ timeout: 5_000 });
      const row = await page.evaluate(() =>
        document.activeElement?.getAttribute('role'),
      );
      if (row !== 'menuitem') {
        fail(where, `Enter opened row actions with focus on ${row}, not a row`);
      }
      await page.keyboard.press('Escape');
      await menu.waitFor({ state: 'detached', timeout: 5_000 });
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
   * The Agents table's Teams filter, a MultiSelect with its tags hidden: the
   * active-filters row shows them instead. Picking two teams must leave the
   * list open between picks, give each team its own removable filter tag, and
   * keep the chosen teams read with the field. axe runs with the list open,
   * which is where a multiselectable listbox would first go wrong.
   */
  {
    const where = 'multi-select filter (light, desktop)';
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents`);
    try {
      await page.locator('#page-title').waitFor({ timeout: 10_000 });
      const field = page.getByRole('combobox', { name: 'Teams' });
      await field.click();
      await page.keyboard.press('ArrowDown');
      const list = page.getByRole('listbox');
      await list.waitFor({ timeout: 5_000 });
      if ((await list.getAttribute('aria-multiselectable')) !== 'true')
        fail(where, 'the Teams list is not aria-multiselectable');

      /*
       * Scoped to the field and the list, as the menus check is. While a
       * combobox is open React Aria sets `aria-hidden` on everything outside
       * it — Combobox does the same — and a whole-page run then reports the
       * page it hid: no h1, content outside landmarks, and focusable elements
       * under aria-hidden (the header, sidebar, table). That is the
       * platform's pattern, not this control's defect.
       */
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          {
            include: [['.demo-toolbar__teams'], ['.ion-combobox-menu']],
          },
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v} with the list open`);

      const options = list.getByRole('option');
      await options.nth(0).click();
      await options.nth(1).click();
      if (!(await list.isVisible()))
        fail(where, 'the list closed after a pick');
      await page.keyboard.press('Escape');

      const filters = page.getByRole('grid', { name: 'Active filters' });
      await filters.waitFor({ timeout: 5_000 });
      const teamTags = filters.getByRole('row', { name: /^Team: / });
      if ((await teamTags.count()) !== 2)
        fail(
          where,
          `expected 2 team filter tags, got ${await teamTags.count()}`,
        );
      const described = await field.evaluate((el) =>
        (el.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' '),
      );
      if (!/ and /.test(described))
        fail(
          where,
          `the chosen teams are not read with the field: "${described}"`,
        );

      await teamTags.first().getByRole('button').click();
      await page.waitForFunction(
        () =>
          document.querySelectorAll('[aria-label^="Team: "][role="row"]')
            .length === 1,
        null,
        { timeout: 5_000 },
      );
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * The wizard's CheckboxGroup, which no page load above reaches: it is on
   * Guardrails, the third step. A saved draft with the first two steps done
   * opens there. "At least one" has to hold three ways — natively (every box
   * required while none is ticked), in the error the group shows on Next, and
   * on the box a screen reader lands on, which is where the error must be read.
   */
  {
    const where = 'checkbox group (light, desktop)';
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
      localStorage.setItem(
        'ionbase-ops:new-agent-draft',
        JSON.stringify({
          values: { name: 'Smoke test agent', notifyOn: [] },
          completed: 1,
          model: 'atlas-m',
        }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents/new`);
    try {
      const group = page.getByRole('group', { name: 'Notify the team when' });
      await group.waitFor({ timeout: 10_000 });
      const boxes = group.getByRole('checkbox');
      const required = await boxes.evaluateAll((els) =>
        els.map((el) => el.required),
      );
      if (required.length !== 3 || required.some((r) => !r))
        fail(where, `boxes not all required while none is ticked: ${required}`);

      await page.getByRole('button', { name: /^Next:/ }).click();
      const first = boxes.first();
      await page.waitForFunction(
        () =>
          document
            .querySelector('#field-notifyOn input')
            ?.getAttribute('aria-invalid') === 'true',
        null,
        { timeout: 5_000 },
      );
      const described = await first.evaluate((el) =>
        (el.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' '),
      );
      if (!/at least one/.test(described))
        fail(where, `the first box does not carry the error: "${described}"`);

      // The summary's entry lands on the first box, not on the fieldset. It is
      // a Link with no href, which Link renders as a <button> — in-page, not a
      // navigation.
      await page
        .getByRole('button', { name: 'Notify the team when', exact: true })
        .click();
      const focused = await page.evaluate(
        () => document.activeElement?.getAttribute('type') ?? null,
      );
      if (focused !== 'checkbox')
        fail(where, `error summary link focused ${focused}, not a checkbox`);

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations)
        fail(where, `axe ${v} with the group invalid`);

      await page.getByText('A run fails', { exact: true }).click();
      const after = await boxes.evaluateAll((els) =>
        els.map((el) => el.required || el.getAttribute('aria-invalid')),
      );
      if (after.some(Boolean))
        fail(where, `ticking one left the group required or invalid: ${after}`);
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
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
  menusChecked +
  groupsChecked;
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
