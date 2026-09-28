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
import { Buffer } from 'node:buffer';
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
/*
 * SMOKE_ONLY="expandable rows" runs only the checks whose name contains it:
 * a mutation run tests one check, not every page load — 2 instead of ~97,
 * seconds instead of minutes. CI and a plain run set nothing and run it all.
 */
const only = process.env.SMOKE_ONLY?.trim() || null;
const skip = (where) => only !== null && !where.includes(only);
// The route loads are counted up front; every other check counts itself as
// it runs, so only a skipped route load comes off the total.
let skippedRoutes = 0;
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
        if (skip(where)) {
          skippedRoutes++;
          continue;
        }
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
      if (skip(where)) continue;
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
    if (skip(where)) continue;
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
  check: {
    const where = 'multi-select filter (light, desktop)';
    if (skip(where)) break check;
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
   * The bulk-action Toolbar, which appears only once a row is selected. With
   * real key presses: → moves between its actions, and one Tab leaves the whole
   * toolbar rather than walking each button.
   */
  check: {
    const where = 'batch selection (light, desktop)';
    if (skip(where)) break check;
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
      // The native box is hidden with pointer-events: none; click its label.
      await page.locator('tbody .ion-checkbox').first().click();
      const bar = page.getByRole('toolbar', {
        name: /^Actions for 1 selected/,
      });
      await bar.waitFor({ timeout: 5_000 });
      const buttons = bar.getByRole('button');
      const count = await buttons.count();
      await buttons.first().focus();
      await page.keyboard.press('ArrowRight');
      const second = await buttons
        .nth(1)
        .evaluate((el) => el === document.activeElement);
      if (!second) fail(where, '→ did not move to the next action');
      await page.keyboard.press('Tab');
      const left = await bar.evaluate(
        (el) => !el.contains(document.activeElement),
      );
      if (count > 1 && !left)
        fail(where, `Tab stayed inside a toolbar of ${count} actions`);

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          document.querySelector('[role="toolbar"]'),
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v} in the toolbar`);

      // The batch bar: the count is announced, the header takes the page, a
      // separate press takes every match, and the next page is ticked too.
      const status = page.locator('.ion-table-batch [role="status"]');
      if ((await status.textContent())?.trim() !== '1 selected')
        fail(
          where,
          `count reads "${await status.textContent()}", not "1 selected"`,
        );
      await page.locator('thead .ion-checkbox').click();
      const selectAll = page.getByRole('button', {
        name: /^Select all \d+ agents$/,
      });
      await selectAll.waitFor({ timeout: 5_000 });
      await selectAll.click();
      await page.waitForFunction(
        () =>
          /^All \d+ agents selected$/.test(
            document.querySelector('.ion-table-batch [role="status"]')
              ?.textContent ?? '',
          ),
        null,
        { timeout: 5_000 },
      );
      await page.getByRole('button', { name: /page 2/i }).click();
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll('tbody input[type="checkbox"]')].every(
            (b) => b.checked,
          ),
        null,
        { timeout: 5_000 },
      );
      await page.getByRole('button', { name: 'Clear selection' }).click();
      try {
        await page.waitForFunction(
          () =>
            document.activeElement ===
            document.querySelector(
              '#agents-table thead input[type="checkbox"]',
            ),
          null,
          { timeout: 2_000 },
        );
      } catch {
        fail(
          where,
          'Clear selection did not return focus to the header checkbox',
        );
      }
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * The Settings Toggletip, at both widths. Its bubble is rendered inline, not
   * portalled, so an ancestor with overflow: hidden would clip it — checked
   * by hit-testing the bubble's centre, not by its box. Then the keyboard:
   * the next Tab is its link, and Escape returns focus to the ⓘ.
   */
  for (const [viewport, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `toggletip (light, ${viewport})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/settings`);
    try {
      const tip = page.getByRole('button', { name: 'About log retention' });
      await tip.waitFor({ timeout: 10_000 });
      await tip.scrollIntoViewIfNeeded();
      await tip.focus();
      await page.keyboard.press('Enter');
      const bubble = page.locator(
        '.ion-toggletip__bubble:not(.ion-toggletip__bubble--closed)',
      );
      await bubble.waitFor({ timeout: 5_000 });
      const visible = await bubble.evaluate((el) => {
        // Near every corner — 10px in, past the 8px radius — so a clip down
        // one side shows up, where the centre alone survived one.
        const r = el.getBoundingClientRect();
        const points = [
          [r.left + 10, r.top + 10],
          [r.right - 10, r.top + 10],
          [r.left + 10, r.bottom - 10],
          [r.right - 10, r.bottom - 10],
        ];
        return points.every(([x, y]) =>
          el.contains(document.elementFromPoint(x, y)),
        );
      });
      if (!visible) fail(where, 'the bubble is clipped, covered or off screen');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          document.querySelector('.ion-toggletip'),
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v} with it open`);

      await page.keyboard.press('Tab');
      const onLink = await page.evaluate(
        () =>
          document.activeElement?.closest('.ion-toggletip__bubble') !== null,
      );
      if (!onLink) fail(where, 'Tab did not reach the link inside the bubble');
      await page.keyboard.press('Escape');
      const back = await tip.evaluate((el) => el === document.activeElement);
      if (!back) fail(where, 'Escape did not return focus to the ⓘ');
      if ((await tip.getAttribute('aria-expanded')) !== 'false')
        fail(where, 'Escape did not close it');
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * The Runs history's Duration range Slider, at both widths — dragged with a
   * real mouse, not dispatched events, because the drag is the thing a hand
   * does and a synthetic event can pass where a pointer would not. The table
   * must filter once the drag ends, the thumbs must stay on the page at
   * 390px, and the keyboard must move a thumb and refilter too.
   */
  for (const [viewport, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `slider (light, ${viewport})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/runs`);
    try {
      const longest = page.getByRole('slider', { name: 'Longest Duration' });
      const shortest = page.getByRole('slider', { name: 'Shortest Duration' });
      await longest.waitFor({ state: 'attached', timeout: 10_000 });
      const history = page.locator('[aria-labelledby="history-title"] table');
      const durations = () =>
        history
          .locator('tbody tr td:nth-child(4)')
          .allTextContents()
          .then((cells) => cells.map((c) => parseInt(c, 10)));
      await history.locator('tbody tr').first().waitFor({ timeout: 10_000 });
      const before = await durations();

      const thumbs = page.locator('.demo-history-duration .ion-slider__thumb');
      await thumbs.first().scrollIntoViewIfNeeded();
      const boxes = await thumbs.evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().toJSON()),
      );
      for (const b of boxes) {
        if (Math.round(b.width) < 24 || Math.round(b.height) < 24)
          fail(where, `a thumb is ${b.width}x${b.height}, under 24px`);
        if (b.left < 0 || b.right > width)
          fail(where, 'a thumb is off the side of the page');
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      if (overflow) fail(where, 'the page scrolls sideways');

      // Drag the high thumb to about a third of the track: ~120s.
      const track = await page
        .locator('.demo-history-duration .ion-slider__track')
        .boundingBox();
      const hi = boxes[1];
      await page.mouse.move(hi.x + hi.width / 2, hi.y + hi.height / 2);
      await page.mouse.down();
      for (const f of [0.8, 0.6, 0.45, 1 / 3]) {
        await page.mouse.move(track.x + track.width * f, hi.y + hi.height / 2);
      }
      await page.mouse.up();
      const max = Number(await longest.inputValue());
      if (max >= 360 || max < 60)
        fail(where, `the drag left the high thumb at ${max}s`);
      const afterDrag = await durations();
      if (afterDrag.length === before.length)
        fail(where, 'the drag did not filter the table');
      if (afterDrag.some((d) => d > max))
        fail(where, `a run over ${max}s is still listed after the drag`);

      // The keyboard, on the other thumb.
      await shortest.focus();
      await page.keyboard.press('PageUp');
      const min = Number(await shortest.inputValue());
      if (min <= 0) fail(where, 'Page Up did not move the low thumb');
      if ((await durations()).some((d) => d < min))
        fail(where, `a run under ${min}s is still listed after Page Up`);

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          document.querySelector('.demo-history-duration'),
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * The agent's Knowledge sources TreeView, at both widths, with the keyboard
   * only: Tab lands on one row, ↓ moves, → opens a closed folder and its
   * children appear, Space selects a file, and the save that appears works.
   * A locked folder is announced as disabled, with its reason.
   */
  for (const [viewport, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `tree view (light, ${viewport})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents/agt_wx`);
    try {
      const tree = page.getByRole('treegrid', { name: 'Knowledge sources' });
      await tree.waitFor({ timeout: 10_000 });
      await tree.scrollIntoViewIfNeeded();
      const row = (name) => tree.getByRole('row', { name, exact: true });
      const active = () =>
        page.evaluate(() => document.activeElement?.textContent ?? '');

      await row('Policies').focus();
      const product = tree.getByRole('row', { name: /^Product docs/ });
      await page.keyboard.press('End');
      if (!(await active()).startsWith('FAQ.md'))
        fail(where, 'End did not reach the last row');
      await product.focus();
      if ((await product.getAttribute('aria-expanded')) !== 'false')
        fail(where, 'Product docs did not start closed');
      await page.keyboard.press('ArrowRight');
      await row('API reference.md').waitFor({ timeout: 2_000 });
      await page.keyboard.press('ArrowDown');
      if (!(await active()).startsWith('API reference.md'))
        fail(where, '↓ from an opened folder did not reach its first child');
      await page.keyboard.press('Space');
      if (
        (await row('API reference.md').getAttribute('aria-selected')) !== 'true'
      )
        fail(where, 'Space did not select the file');

      const finance = tree.getByRole('row', { name: /^Finance/ });
      if ((await finance.getAttribute('aria-disabled')) !== 'true')
        fail(where, 'the locked folder is not disabled');
      const reason = await finance.evaluate((el) =>
        (el.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' '),
      );
      if (!reason.includes('Restricted'))
        fail(where, 'the locked folder does not describe why');

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      if (overflow) fail(where, 'the page scrolls sideways');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          document.querySelector('.demo-knowledge-tree'),
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);

      await page.getByRole('button', { name: 'Save sources' }).click();
      await page
        .getByText('4 knowledge sources saved')
        .waitFor({ timeout: 5_000 });
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * The Runs history's SidePanel. At 1280px it opens beside the table: a
   * region, not a dialog, its title focused; picking the next run swaps it
   * without moving focus; it sticks below the sticky header; Escape inside
   * closes it and returns focus to the run last picked. At 390px there is no
   * room beside the table, so the same press opens a Drawer — a dialog.
   */
  for (const [viewport, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `side panel (light, ${viewport})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/runs`);
    try {
      const details = page.getByRole('button', { name: /^Details: / });
      await details.first().waitFor({ timeout: 10_000 });
      const [first, second] = [details.nth(0), details.nth(1)];
      const firstTask = (await first.getAttribute('aria-label')).slice(9);
      const secondTask = (await second.getAttribute('aria-label')).slice(9);
      await first.scrollIntoViewIfNeeded();
      await first.click();

      if (viewport === 'mobile') {
        const dialog = page.getByRole('dialog', { name: firstTask });
        await dialog.waitFor({ timeout: 5_000 });
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'detached', timeout: 5_000 });
        // Restored just after the drawer unmounts; poll, don't sample.
        await page
          .waitForFunction(
            (el) => el === document.activeElement,
            await first.elementHandle(),
            { timeout: 2_000 },
          )
          .catch(() =>
            fail(where, 'closing the drawer did not return focus to the row'),
          );
      } else {
        const region = page.getByRole('region', { name: firstTask });
        await region.waitFor({ timeout: 5_000 });
        if ((await page.getByRole('dialog').count()) > 0)
          fail(where, 'the panel opened as a dialog beside the table');
        const titleFocused = await page.evaluate(() =>
          document.activeElement?.classList.contains('ion-side-panel__title'),
        );
        if (!titleFocused) fail(where, 'opening did not focus the title');

        await second.click();
        await page.getByRole('region', { name: secondTask }).waitFor();
        if (!(await second.evaluate((el) => el === document.activeElement)))
          fail(where, 'picking the next run pulled focus into the panel');
        if ((await second.getAttribute('aria-expanded')) !== 'true')
          fail(where, 'the picked run is not marked expanded');

        // It sticks below the sticky header: its `top` is the header's height
        // plus a gap. Checked as the resolved style, not by scrolling — the
        // table is barely taller than the panel, so a scroll test could not
        // tell a missing offset from the end of the sticky range.
        const [top, headerHeight] = await page.evaluate(() => [
          parseFloat(
            window.getComputedStyle(document.querySelector('.ion-side-panel'))
              .top,
          ),
          document.querySelector('.demo-header').getBoundingClientRect().height,
        ]);
        if (Math.abs(top - (headerHeight + 16)) > 0.5)
          fail(
            where,
            `the panel sticks at ${top}px, not below the ${headerHeight}px header`,
          );

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        if (overflow) fail(where, 'the page scrolls sideways');

        await page.addScriptTag({ content: axeSource });
        const violations = await page.evaluate(async () => {
          const result = await window.axe.run(
            document.querySelector('.ion-side-panel'),
            { resultTypes: ['violations'] },
          );
          return result.violations.map((v) => `${v.impact} ${v.id}`);
        });
        for (const v of violations) fail(where, `axe ${v}`);

        await page.getByRole('button', { name: 'Close panel' }).focus();
        await page.keyboard.press('Escape');
        await page.locator('.ion-side-panel').waitFor({ state: 'detached' });
        if (!(await second.evaluate((el) => el === document.activeElement)))
          fail(where, 'Escape did not return focus to the run last picked');
      }
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * DescriptionList, where its guarantees show. A brand-new agent (the
   * presenter's Empty state — it is never restored from storage, so it is
   * set through the Demo controls) has no last run: the dash is hidden and "Not set" is read. The
   * facts grid sits side by side on desktop. And the run's Details drawer is
   * 22rem, under the list's 24rem, so its horizontal list stacks by itself —
   * its own width decides, not the viewport's.
   */
  for (const [viewport, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `description list (light, ${viewport})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents/agt_wx`);
    try {
      await page.getByRole('button', { name: /^Demo/ }).click();
      await page.getByLabel('Screen state').selectOption('empty');
      await page.keyboard.press('Escape');
      const lastRun = page.locator('dt', { hasText: 'Last run' });
      await lastRun.waitFor({ timeout: 10_000 });
      const value = await lastRun.evaluate((dt) => {
        const dd = dt.nextElementSibling;
        return {
          tag: dd?.tagName,
          read: dd?.querySelector('.ion-visually-hidden')?.textContent,
          dashHidden:
            dd?.querySelector('[aria-hidden="true"]')?.textContent === '—',
        };
      });
      if (value.tag !== 'DD') fail(where, 'the value is not a <dd>');
      if (value.read !== 'Not set' || !value.dashHidden)
        fail(where, 'an empty last run is not read as "Not set"');

      if (viewport === 'desktop') {
        const [owner, team] = await page.evaluate(() =>
          ['Owner', 'Team'].map(
            (t) =>
              [...document.querySelectorAll('dt')]
                .find((d) => d.textContent === t)
                .getBoundingClientRect().top,
          ),
        );
        if (Math.round(owner) !== Math.round(team))
          fail(where, 'the facts grid did not put Owner and Team side by side');
      }

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          document.querySelector('.ion-description-list'),
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);

      await page.goto(`${BASE}/#/runs/run_4821`);
      await page.getByRole('button', { name: 'Details', exact: true }).click();
      const drawer = page.getByRole('dialog', { name: 'Run details' });
      await drawer.waitFor({ timeout: 5_000 });
      const stacked = await drawer.evaluate((el) => {
        const dt = [...el.querySelectorAll('dt')].find(
          (d) => d.textContent === 'Agent',
        );
        return (
          dt.nextElementSibling.getBoundingClientRect().top >=
          dt.getBoundingClientRect().bottom - 0.5
        );
      });
      if (!stacked)
        fail(where, 'the 22rem drawer did not stack its horizontal list');
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * The Runs queue, a List: one tab stop whose rows are named by what each
   * run asks, with the risk at the row's end. ↓ moves between rows and Enter
   * follows the row's link to the run; a click does too. On a phone the row
   * wraps rather than pushing its badge off screen.
   */
  for (const [viewport, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `list (light, ${viewport})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/runs`);
    try {
      const queue = page.getByRole('grid', { name: 'Waiting for you' });
      await queue.waitFor({ timeout: 10_000 });
      const rows = queue.getByRole('row');
      if ((await rows.count()) !== 3)
        fail(where, `the queue has ${await rows.count()} rows, not 3`);
      const first = queue.getByRole('row', {
        name: /^Refund \$249\.00 to Maya Chen/,
      });
      if ((await first.count()) !== 1)
        fail(where, 'a row is not named by the action its run asks for');

      const fits = await queue.evaluate((grid) =>
        [...grid.querySelectorAll('.ion-list__row')].every((r) => {
          const badge = r.querySelector('.ion-list__meta');
          return (
            !badge ||
            badge.getBoundingClientRect().right <=
              r.getBoundingClientRect().right + 0.5
          );
        }),
      );
      if (!fits) fail(where, "a risk badge runs past its row's end");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      if (overflow) fail(where, 'the page scrolls sideways');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          document.querySelector('.ion-list'),
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);

      await rows.nth(0).focus();
      await page.keyboard.press('ArrowDown');
      const second = rows.nth(1);
      if (!(await second.evaluate((el) => el === document.activeElement)))
        fail(where, '↓ did not move to the next row');
      const secondId = await second.evaluate((el) => el.id.replace(/^.*-/, ''));
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => /^#\/runs\/run_\d+$/.test(document.location.hash),
        undefined,
        { timeout: 5_000 },
      );
      const opened = await page.evaluate(() => document.location.hash);
      if (!/^run_\d+$/.test(secondId) || !opened.endsWith(secondId))
        fail(where, `Enter opened ${opened}, not the focused row ${secondId}`);

      await page.goto(`${BASE}/#/runs`);
      await queue.getByRole('row').first().click();
      await page.waitForFunction(
        () => /^#\/runs\/run_\d+$/.test(document.location.hash),
        undefined,
        { timeout: 5_000 },
      );
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * ButtonGroup, where each of its behaviours shows. On a 320px phone the run
   * header has no room for Stop, Copy run ID and Details: Copy run ID moves
   * into More actions (Stop is not a Button, Details is last), and choosing it
   * there really copies. At desktop width nothing is hidden. The wizard's
   * actions stack on a phone, one per line, full width, Next last.
   */
  check: {
    const where = 'button group (light)';
    if (skip(where)) break check;
    const context = await browser.newContext({
      viewport: { width: 320, height: 720 },
      permissions: ['clipboard-read', 'clipboard-write'],
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
    try {
      await page.goto(`${BASE}/#/runs/run_4821`);
      const header = page.locator('.ion-page-header');
      const more = header.getByRole('button', { name: 'More actions' });
      await more.waitFor({ timeout: 10_000 });
      if (await header.getByRole('button', { name: 'Copy run ID' }).count())
        fail(where, 'Copy run ID is still in the row at 320px');
      for (const name of ['Stop run', 'Details'])
        if (!(await header.getByRole('button', { name }).isVisible()))
          fail(where, `${name} left the row; it must never collapse`);
      const inside = await header.evaluate((h) => {
        const r = h.getBoundingClientRect();
        return [...h.querySelectorAll('.ion-button-group button')]
          .filter((b) => b.checkVisibility({ visibilityProperty: true }))
          .every((b) => b.getBoundingClientRect().right <= r.right + 0.5);
      });
      if (!inside) fail(where, 'an action runs past the header on a phone');
      await more.click();
      await page.getByRole('menuitem', { name: 'Copy run ID' }).click();
      await page
        .getByText('Run ID copied')
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'the menu item did not press Copy run ID'));
      const copied = await page.evaluate(() =>
        window.navigator.clipboard.readText(),
      );
      if (copied !== 'run_4821')
        fail(where, `the clipboard holds "${copied}", not the run ID`);

      await page.goto(`${BASE}/#/agents/new`);
      const next = page.getByRole('button', { name: /^Next/ });
      await next.waitFor({ timeout: 10_000 });
      const stack = await page.evaluate(() => {
        const g = document.querySelector('form .ion-button-group');
        const bs = [...g.querySelectorAll('button')];
        const w = g.getBoundingClientRect().width;
        return {
          full: bs.every(
            (b) => Math.abs(b.getBoundingClientRect().width - w) < 1,
          ),
          last: bs.at(-1).textContent,
          down: bs.every(
            (b, i) =>
              i === 0 ||
              b.getBoundingClientRect().top >=
                bs[i - 1].getBoundingClientRect().bottom - 0.5,
          ),
        };
      });
      if (!stack.full || !stack.down)
        fail(where, "the wizard's actions do not stack full width on a phone");
      if (!stack.last.startsWith('Next'))
        fail(where, `the last stacked action is "${stack.last}", not Next`);

      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`${BASE}/#/runs/run_4821`);
      await header
        .getByRole('button', { name: 'Copy run ID' })
        .waitFor({ timeout: 10_000 });
      if (await more.isVisible())
        fail(where, 'More actions shows at desktop width, with room to spare');
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * SplitButton, on the wizard's Review step: a saved draft with the first
   * three steps done opens there. "Create agent" is the main half and makes
   * the agent paused; the menu half, "More options, Create agent", offers
   * "Create and start" — chosen, the new agent is running. On a phone the
   * pair stacks with the rest of the actions, full width, main half growing.
   */
  for (const [viewport, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `split button (light, ${viewport})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    const name = `Smoke split ${viewport}`;
    await context.addInitScript((agentName) => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
      if (!window.sessionStorage.getItem('smoke-draft-set')) {
        window.sessionStorage.setItem('smoke-draft-set', '1');
        localStorage.setItem(
          'ionbase-ops:new-agent-draft',
          JSON.stringify({
            values: {
              name: agentName,
              purpose: 'Checks that the split button creates a running agent.',
              team: 'platform',
            },
            completed: 2,
            model: 'atlas-m',
          }),
        );
      }
    }, name);
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    try {
      await page.goto(`${BASE}/#/agents/new`);
      const group = page.getByRole('group', { name: 'Create agent' });
      await group.waitFor({ timeout: 10_000 });
      const menu = group.getByRole('button', {
        name: 'More options Create agent',
      });
      if ((await menu.getAttribute('aria-haspopup')) !== 'true')
        fail(where, 'the menu half does not announce a menu');

      if (viewport === 'mobile') {
        const full = await group.evaluate((g) => {
          const row = g.closest('.ion-button-group').getBoundingClientRect();
          return Math.abs(g.getBoundingClientRect().width - row.width) < 1;
        });
        if (!full) fail(where, 'the split button does not take the full width');
      }

      await menu.click();
      await page.getByRole('menuitem', { name: 'Create and start' }).click();
      await page.waitForFunction(
        () => document.location.hash === '#/agents',
        undefined,
        { timeout: 5_000 },
      );
      await page
        .getByText('It is running and will take its first trigger.')
        .waitFor({ timeout: 5_000 })
        .catch(() =>
          fail(where, 'the toast does not say the agent is running'),
        );
      // The table is sorted, so find the new agent by name.
      await page.getByRole('searchbox', { name: 'Search agents' }).fill(name);
      // The table re-queries as the search changes; wait for it to settle.
      await page
        .getByRole('row', { name: new RegExp(name) })
        .filter({ hasText: 'Running' })
        .waitFor({ timeout: 5_000 })
        .catch(() =>
          fail(where, '"Create and start" made an agent that is not running'),
        );
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * ContextMenu on the Agents table. A right-click on a running agent's row
   * opens the row's own menu, named for the agent, with focus on its first
   * item; choosing Pause pauses it. Shift+F10 from the row's link opens it
   * too, and Escape gives focus back to the link. The row's ⋯ button still
   * opens the same items — the context menu is a shortcut, not the only way.
   */
  check: {
    const where = 'context menu (light, desktop)';
    if (skip(where)) break check;
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
    try {
      await page.goto(`${BASE}/#/agents`);
      const row = page
        .locator('tbody tr')
        .filter({ hasText: 'Running' })
        .first();
      await row.waitFor({ timeout: 10_000 });
      const link = row.getByRole('link').first();
      const name = (await link.innerText()).trim();
      // Found by name from here on: once paused it no longer says Running.
      const thisRow = page.locator('tbody tr', { hasText: name });

      await row.getByRole('cell').nth(3).click({ button: 'right' });
      const menu = page.getByRole('menu', { name: `Actions for ${name}` });
      await menu
        .waitFor({ timeout: 5_000 })
        .catch(() =>
          fail(where, 'a right-click on a row opened no named menu'),
        );
      const focusedItem = await page.evaluate(() =>
        document.activeElement?.getAttribute('role'),
      );
      if (focusedItem !== 'menuitem')
        fail(where, 'focus is not on the menu when it opens');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          document.querySelector('.ion-menu-popover'),
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
      await page.keyboard.press('Escape');
      await menu.waitFor({ state: 'detached' });

      await link.focus();
      await page.keyboard.press('Shift+F10');
      await menu
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'Shift+F10 on a row did not open its menu'));
      await page.keyboard.press('Escape');
      await menu.waitFor({ state: 'detached' });
      await page.waitForTimeout(100);
      if (!(await link.evaluate((el) => el === document.activeElement)))
        fail(where, 'Escape did not give focus back to the row');

      const items = async () =>
        page
          .getByRole('menuitem')
          .evaluateAll((els) => els.map((e) => e.textContent.trim()));
      await row.getByRole('cell').nth(3).click({ button: 'right' });
      await menu.waitFor();
      const fromContext = await items();
      await page.getByRole('menuitem', { name: 'Pause' }).click();
      await page
        .locator('tbody tr', { hasText: name })
        .filter({ hasText: 'Paused' })
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'Pause from the context menu did not pause'));

      await thisRow
        .getByRole('button', { name: `Actions for ${name}` })
        .click();
      await page.getByRole('menu').waitFor();
      const fromButton = await items();
      if (fromButton.length !== fromContext.length)
        fail(
          where,
          `the ⋯ menu has ${fromButton.length} items, the context menu ${fromContext.length}`,
        );
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * CopyButton, on the Run ID in the Runs history's side panel. With the
   * clipboard granted it copies the ID, confirms on the button without it
   * changing width, says so in its status region, and returns after two
   * seconds. With the clipboard refused and no fallback it says "Couldn't
   * copy" and the ID goes into a toast, where it can be selected by hand.
   */
  for (const refused of [false, true]) {
    const where = `copy button (light, ${refused ? 'refused' : 'granted'})`;
    if (skip(where)) continue;
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      permissions: refused ? [] : ['clipboard-read', 'clipboard-write'],
    });
    await context.addInitScript((refused) => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
      if (refused) {
        Object.defineProperty(window.navigator, 'clipboard', {
          value: { writeText: () => Promise.reject(new Error('denied')) },
        });
        document.execCommand = () => false;
      }
    }, refused);
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/runs`);
    try {
      const details = page.getByRole('button', { name: /^Details: / });
      await details.first().waitFor({ timeout: 10_000 });
      await details.first().click();
      const panel = page.locator('.ion-side-panel');
      const copy = panel.getByRole('button', { name: 'Copy run ID' });
      await copy.waitFor({ timeout: 5_000 });
      const id = (
        await panel.locator('.demo-copy-value code').textContent()
      ).trim();
      const width = (await copy.boundingBox()).width;
      await copy.click();

      if (refused) {
        await panel
          .getByRole('button', { name: "Couldn't copy" })
          .waitFor({ timeout: 5_000 })
          .catch(() => fail(where, 'a refused copy did not say it failed'));
        const toast = page.locator('.ion-toast__content', {
          hasText: "Couldn't copy the run ID",
        });
        await toast
          .waitFor({ timeout: 5_000 })
          .catch(() => fail(where, 'no toast offered the ID by hand'));
        if (!(await toast.textContent())?.includes(id))
          fail(where, 'the toast does not hold the run ID');
      } else {
        const copied = panel.getByRole('button', { name: 'Run ID copied' });
        await copied
          .waitFor({ timeout: 5_000 })
          .catch(() => fail(where, 'the button did not confirm the copy'));
        const text = await page.evaluate(() =>
          window.navigator.clipboard.readText(),
        );
        if (text !== id)
          fail(where, `the clipboard holds "${text}", not the run ID ${id}`);
        const said = await panel
          .locator('.ion-copy-button__status')
          .textContent();
        if (said !== 'Run ID copied')
          fail(where, `the status region says "${said}", not "Run ID copied"`);
        const after = (await copied.boundingBox()).width;
        if (Math.abs(after - width) > 0.5)
          fail(where, `the button changed width, ${width} to ${after}`);

        await page.addScriptTag({ content: axeSource });
        const violations = await page.evaluate(async () => {
          const result = await window.axe.run(
            document.querySelector('.ion-side-panel'),
            { resultTypes: ['violations'] },
          );
          return result.violations.map((v) => `${v.impact} ${v.id}`);
        });
        for (const v of violations) fail(where, `axe ${v}, copied`);

        await copy
          .waitFor({ timeout: 4_000 })
          .catch(() => fail(where, 'the confirmation never returned to Copy'));
      }
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * CodeSnippet, in Settings' API access, at phone width — where the start
   * command is longer than the screen. The command stays one line and
   * scrolls inside its region, not the page; the arrow keys scroll it once
   * it has focus. Each copy button copies its snippet exactly, the request's
   * newlines included. The inline command sits in the key's description.
   */
  check: {
    const where = 'code snippet (light, mobile)';
    if (skip(where)) break check;
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/settings`);
    try {
      const api = page.getByRole('button', { name: 'API access' });
      await api.waitFor({ timeout: 10_000 });
      await api.click();
      const command = page.getByRole('region', { name: 'Start run command' });
      await command.waitFor({ timeout: 5_000 });

      const described = await page
        .getByLabel('Workspace API key')
        .evaluate((el) =>
          (el.getAttribute('aria-describedby') ?? '')
            .split(' ')
            .map((id) => document.getElementById(id)?.innerHTML ?? '')
            .join(' '),
        );
      if (
        !/<code[^>]*ion-code-snippet--inline[^>]*>iops keys rotate</.test(
          described,
        )
      )
        fail(where, "the key's description has no inline iops keys rotate");

      const box = await command.evaluate((el) => ({
        wraps: el.getBoundingClientRect().height > 33,
        scrolls: el.scrollWidth > el.clientWidth,
      }));
      if (box.wraps) fail(where, 'the start command wraps');
      if (!box.scrolls)
        fail(
          where,
          'the start command fits at 390px; the check proves nothing',
        );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      if (overflow) fail(where, 'the page scrolls sideways');

      await command.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page
        .waitForFunction(
          () =>
            document.activeElement?.getAttribute('aria-label') ===
              'Start run command' && document.activeElement.scrollLeft > 0,
          null,
          { timeout: 3_000 },
        )
        .catch(() => fail(where, 'the arrow keys do not scroll the command'));

      for (const [name, region] of [
        ['Copy start run command', 'Start run command'],
        ['Copy API request', 'API request'],
      ]) {
        const shown = await page
          .getByRole('region', { name: region })
          .evaluate((el) => el.textContent);
        await page.getByRole('button', { name }).click();
        await page
          .getByRole('button', { name: 'Copied' })
          .first()
          .waitFor({ timeout: 5_000 })
          .catch(() => fail(where, `${name} did not confirm`));
        const text = await page.evaluate(() =>
          window.navigator.clipboard.readText(),
        );
        if (text !== shown)
          fail(
            where,
            `${name} copied "${text.slice(0, 40)}…", not what it shows`,
          );
      }
      const request = await page.evaluate(() =>
        window.navigator.clipboard.readText(),
      );
      if (request.split('\n').length < 5)
        fail(where, 'the API request lost its newlines');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * PasswordInput, in the Delete workspace dialog: the password is asked
   * again. Delete stays disabled until the name and a password are both in.
   * From the keyboard the Show password toggle is the next tab stop; Space
   * shows the password, keeps focus on the toggle, sets aria-pressed and
   * says "Password shown", and the name stays "Show password". axe runs on
   * the dialog with the password shown. Then the deletion is scheduled.
   */
  check: {
    const where = 'password input (light, desktop)';
    if (skip(where)) break check;
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
    await page.goto(`${BASE}/#/settings`);
    try {
      const open = page.getByRole('button', { name: 'Delete workspace…' });
      await open.waitFor({ timeout: 10_000 });
      await open.click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ timeout: 5_000 });
      const nameField = dialog.getByLabel(/^Type “.*” to confirm$/);
      const name =
        (await nameField.getAttribute('aria-label')) ??
        (await dialog
          .locator('label', { hasText: 'to confirm' })
          .textContent());
      const workspace = /“(.*)”/.exec(name)[1];
      await nameField.fill(workspace);
      const confirm = dialog.getByRole('button', { name: 'Delete workspace' });
      if (await confirm.isEnabled())
        fail(where, 'Delete is enabled before the password is entered');

      const password = dialog.getByLabel('Your password');
      if ((await password.getAttribute('type')) !== 'password')
        fail(where, 'the password is shown before anyone asked');
      await password.fill('correct-horse-9');
      await page.keyboard.press('Tab');
      const toggle = dialog.getByRole('button', { name: 'Show password' });
      if (!(await toggle.evaluate((el) => el === document.activeElement)))
        fail(where, 'Show password is not the tab stop after the field');
      await page.keyboard.press('Space');
      if ((await password.getAttribute('type')) !== 'text')
        fail(where, 'Space on the toggle did not show the password');
      if ((await toggle.getAttribute('aria-pressed')) !== 'true')
        fail(where, 'the toggle is not marked pressed');
      if (!(await toggle.evaluate((el) => el === document.activeElement)))
        fail(where, 'showing the password moved focus off the toggle');
      const said = await dialog
        .locator('.ion-password-input__status')
        .textContent();
      if (said !== 'Password shown')
        fail(where, `the status says "${said}", not "Password shown"`);
      if ((await password.getAttribute('spellcheck')) !== 'false')
        fail(where, 'the shown password is spellchecked');

      // Delete has just enabled, and its colours transition: axe measuring
      // mid-way reports a contrast the button never settles on.
      await page.waitForFunction(() =>
        document.getAnimations().every((a) => a.playState !== 'running'),
      );
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(
          document.querySelector('[role="dialog"]'),
          { resultTypes: ['violations'] },
        );
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}, password shown`);

      if (!(await confirm.isEnabled()))
        fail(where, 'Delete stays disabled with the name and a password in');
      await confirm.click();
      await page
        .getByText(`${workspace} will be deleted on`)
        .first()
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'the deletion was not scheduled'));
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * StatusIndicator, in every table that lists a status: Agents, Runs
   * history and Overview's recent runs. No cell is a Badge with a dot any
   * more. Every status has a word and a hidden shape, and different intents
   * have different shapes — checked with forced colours on, where colour is
   * gone and the shape is all that is left.
   */
  for (const route of ['agents', 'runs', 'overview']) {
    const where = `status indicator (#/${route}, forced colours)`;
    if (skip(where)) continue;
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      forcedColors: 'active',
    });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/${route}`);
    try {
      await page
        .locator('table .ion-status')
        .first()
        .waitFor({ timeout: 10_000 });
      const found = await page.evaluate(() => {
        const cells = [...document.querySelectorAll('table .ion-status')];
        const shapes = {};
        const bad = [];
        for (const s of cells) {
          const svg = s.querySelector('svg');
          const word = s.querySelector('.ion-status__label')?.textContent;
          if (!word) bad.push('a status with no word');
          if (svg?.getAttribute('aria-hidden') !== 'true')
            bad.push(`"${word}" has a shape that is read out`);
          if (!svg || svg.getBoundingClientRect().width === 0)
            bad.push(`"${word}" has no visible shape`);
          (shapes[s.dataset.intent] ??= new Set()).add(svg?.innerHTML);
        }
        return {
          dots: document.querySelectorAll('table .ion-badge__dot').length,
          bad,
          intents: Object.keys(shapes).length,
          perIntent: Object.values(shapes).map((x) => x.size),
          distinct: new Set(Object.values(shapes).flatMap((x) => [...x])).size,
        };
      });
      if (found.dots) fail(where, `${found.dots} Badge dots left in a table`);
      for (const b of found.bad) fail(where, b);
      if (found.perIntent.some((n) => n !== 1))
        fail(where, 'one intent is drawn with more than one shape');
      if (found.distinct !== found.intents)
        fail(where, 'two intents share a shape');
      if (found.intents < 2)
        fail(where, 'fewer than two intents; the check proves nothing');
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Banner, in the app shell. The maintenance notice is above the Header on
   * every page; dismissed from the keyboard, focus moves forward into the
   * page, and it stays gone on the next route and after a reload. Scheduling
   * the workspace's deletion puts a warning banner on every page, with no
   * dismiss button, until the deletion is cancelled.
   */
  check: {
    const where = 'banner (light, desktop)';
    if (skip(where)) break check;
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
      const maintenance = page.locator('.ion-banner', {
        hasText: 'Maintenance on Sunday',
      });
      await maintenance.waitFor({ timeout: 10_000 });
      const above = await page.evaluate(() => {
        const b = document.querySelector('.ion-banner');
        const header = document.querySelector('.demo-header');
        return {
          before: !!(
            b.compareDocumentPosition(header) &
            window.Node.DOCUMENT_POSITION_FOLLOWING
          ),
          outsideMain: !b.closest('main'),
          fullWidth:
            Math.abs(b.getBoundingClientRect().width - window.innerWidth) < 1,
        };
      });
      if (!above.before) fail(where, 'the banner is not above the Header');
      if (!above.outsideMain) fail(where, 'the banner is inside <main>');
      if (!above.fullWidth) fail(where, 'the banner is not the full width');

      await maintenance.getByRole('button', { name: 'Dismiss' }).focus();
      await page.keyboard.press('Enter');
      await maintenance.waitFor({ state: 'detached', timeout: 5_000 });
      const focused = await page.evaluate(() => ({
        body: document.activeElement === document.body,
        inHeader: !!document.activeElement?.closest('.demo-header'),
      }));
      if (focused.body || !focused.inHeader)
        fail(where, 'dismissing did not move focus forward, into the Header');

      await page.goto(`${BASE}/#/runs`);
      await page.locator('#page-title').waitFor({ timeout: 10_000 });
      if (await maintenance.count())
        fail(where, 'the dismissed banner came back on the next route');
      await page.reload();
      await page.locator('#page-title').waitFor({ timeout: 10_000 });
      if (await maintenance.count())
        fail(where, 'the dismissed banner came back after a reload');

      // Schedule the deletion from Settings; the warning follows every page.
      await page.goto(`${BASE}/#/settings`);
      await page.getByRole('button', { name: 'Delete workspace…' }).click();
      const dialog = page.getByRole('dialog');
      const label = await dialog
        .locator('label', { hasText: 'to confirm' })
        .textContent();
      await dialog
        .getByLabel(/^Type “.*” to confirm$/)
        .fill(/“(.*)”/.exec(label)[1]);
      await dialog.getByLabel('Your password').fill('correct-horse-9');
      await dialog.getByRole('button', { name: 'Delete workspace' }).click();
      const deletion = page.locator('.ion-banner', {
        hasText: 'will be deleted on',
      });
      await deletion.waitFor({ timeout: 5_000 });
      await page.goto(`${BASE}/#/overview`);
      await page.locator('#page-title').waitFor({ timeout: 10_000 });
      if (!(await deletion.count()))
        fail(where, 'the deletion banner is not on the next page');
      if ((await deletion.getAttribute('role')) !== 'alert')
        fail(where, 'the deletion warning is not role="alert"');
      if (await deletion.getByRole('button', { name: 'Dismiss' }).count())
        fail(where, 'the deletion warning can be dismissed');

      await page.waitForFunction(() =>
        document.getAnimations().every((a) => a.playState !== 'running'),
      );
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
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
  check: {
    const where = 'checkbox group (light, desktop)';
    if (skip(where)) break check;
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
   * InlineLoading, on each Notifications switch, in the Partial failure state
   * — where the weekly digest's save fails. From the keyboard, Space on Failure
   * alerts keeps focus on the switch (it is not disabled mid-save), and the
   * row's one status region goes Saving… → Saved → empty, the same element
   * throughout. The switch does not move while the words come and go — to
   * its left on a desktop, to its right once the row stacks on a phone. The
   * digest says Not saved, stays saying it, and its switch goes back.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `inline loading (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/settings`);
    try {
      // Never restored from storage, so set through the Demo controls.
      await page.getByRole('button', { name: /^Demo/ }).click();
      await page.getByLabel('Screen state').selectOption('partial');
      await page.keyboard.press('Escape');
      const alerts = page.getByRole('switch', { name: 'Failure alerts' });
      await alerts.waitFor({ timeout: 10_000 });
      const row = (name) =>
        page.locator('.ion-setting-row', {
          has: page.getByRole('switch', { name }),
        });
      const region = row('Failure alerts').getByRole('status');
      if ((await region.count()) !== 1)
        fail(where, 'the row has no single status region before a save');
      await region.evaluate((el) => {
        window.__region = el;
      });
      const x = () =>
        alerts.evaluate((el) =>
          Math.round(el.closest('.ion-toggle').getBoundingClientRect().left),
        );
      const before = await x();
      const was = await alerts.isChecked();

      await alerts.focus();
      await page.keyboard.press('Space');
      await page
        .waitForFunction(
          () => window.__region.textContent === 'Saving…',
          null,
          { timeout: 2_000 },
        )
        .catch(() => fail(where, 'the row never said Saving…'));
      const during = await x();
      if (during !== before)
        fail(where, `the switch moved ${during - before}px while saving`);
      const focus = await page.evaluate(() => ({
        role: document.activeElement?.getAttribute('role'),
        disabled: document.activeElement?.disabled,
      }));
      if (focus.role !== 'switch' || focus.disabled)
        fail(where, `focus left the switch mid-save (${focus.role})`);
      await page
        .waitForFunction(
          () =>
            window.__region.isConnected &&
            window.__region.textContent === 'Saved',
          null,
          { timeout: 5_000 },
        )
        .catch(() => fail(where, 'the same region never said Saved'));
      if ((await x()) !== before) fail(where, 'the switch moved once saved');
      if ((await alerts.isChecked()) === was)
        fail(where, 'the switch did not change');
      if (
        !(await page.evaluate(
          () => document.activeElement?.getAttribute('role') === 'switch',
        ))
      )
        fail(where, 'focus left the switch once saved');
      await page
        .waitForFunction(
          () =>
            window.__region.isConnected && window.__region.textContent === '',
          null,
          { timeout: 5_000 },
        )
        .catch(() => fail(where, 'Saved never went away'));

      const digest = page.getByRole('switch', { name: 'Weekly digest' });
      const digestWas = await digest.isChecked();
      await digest.focus();
      await page.keyboard.press('Space');
      const digestRegion = row('Weekly digest').getByRole('status');
      await digestRegion
        .filter({ hasText: 'Not saved' })
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'the failed save never said Not saved'));
      await page.waitForTimeout(2_000);
      if ((await digestRegion.textContent()) !== 'Not saved')
        fail(where, 'Not saved went away by itself');
      if ((await digest.isChecked()) !== digestWas)
        fail(where, 'the failed switch was not put back');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        // Finite ones only: a spinner's never finishes.
        await Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getTiming().iterations !== Infinity)
            .map((a) => a.finished),
        );
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * NotificationsPanel, under the header's bell. The bell's name carries the
   * count ("Notifications, 2 unread") and its dot shows while anything is
   * unread; it opens a Popover named Notifications with Today, Yesterday
   * and Earlier. From the keyboard, a row's Mark as read keeps focus, becomes
   * Mark as unread and is announced, and the bell's count follows. Mark all
   * as read hands focus to the first notification before it goes. axe runs
   * with the panel open, which fits the phone's width. Escape returns focus
   * to the bell; opening a notification navigates and closes the panel. The
   * presenter's Empty state shows "You're all caught up".
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `notifications panel (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/overview`);
    try {
      const bell = page.getByRole('button', { name: /^Notifications, / });
      await page
        .getByRole('button', { name: 'Notifications, 2 unread' })
        .waitFor({ timeout: 10_000 });
      const dot = () =>
        bell.evaluate(
          (el) => window.getComputedStyle(el, '::after').content !== 'none',
        );
      if (!(await dot())) fail(where, 'the bell shows no unread dot');

      await bell.click();
      const panel = page.getByRole('dialog', { name: 'Notifications' });
      await panel.waitFor({ timeout: 5_000 });
      const headings = await panel
        .getByRole('heading', { level: 3 })
        .allTextContents();
      if (headings.join('|') !== 'Today|Yesterday|Earlier')
        fail(where, `the groups are ${headings.join(', ')}`);
      if (!(await panel.getByText('2 unread').isVisible()))
        fail(where, 'the bar does not count the unread');

      const toggle = panel
        .getByRole('button', { name: 'Mark as read' })
        .first();
      await toggle.focus();
      await page.keyboard.press('Enter');
      const after = await page.evaluate(() => ({
        name: document.activeElement?.getAttribute('aria-label'),
        said: document.querySelector('.ion-notifications > [role="status"]')
          ?.textContent,
      }));
      if (after.name !== 'Mark as unread')
        fail(where, `focus after Mark as read is on "${after.name}"`);
      if (after.said !== 'Marked as read')
        fail(where, 'Mark as read was not announced');
      if (
        (await page
          .getByRole('button', { name: 'Notifications, 1 unread' })
          .count()) !== 1
      )
        fail(where, "the bell's count did not follow");

      const box = await panel.boundingBox();
      if (box.x < 0 || box.x + box.width > width)
        fail(where, 'the panel runs off the screen');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getTiming().iterations !== Infinity)
            .map((a) => a.finished),
        );
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);

      await panel.getByRole('button', { name: 'Mark all as read' }).focus();
      await page.keyboard.press('Enter');
      const first = await page.evaluate(
        () => document.activeElement?.textContent,
      );
      if (first !== 'Invoice reconciler is waiting for you')
        fail(where, `focus after Mark all as read is on "${first}"`);
      if (
        (await page
          .getByRole('button', { name: 'Notifications, none unread' })
          .count()) !== 1
      )
        fail(where, 'the bell still counts unread');
      if (await dot()) fail(where, 'the dot stayed after Mark all as read');

      await page.keyboard.press('Escape');
      await panel.waitFor({ state: 'detached', timeout: 5_000 });
      // Focus is restored just after the panel unmounts; poll, don't sample.
      await page
        .waitForFunction(
          () =>
            document.activeElement
              ?.getAttribute('aria-label')
              ?.startsWith('Notifications'),
          null,
          { timeout: 2_000 },
        )
        .catch(() => fail(where, 'Escape did not return focus to the bell'));

      await bell.click();
      await panel
        .getByRole('link', { name: 'Nightly CRM sync failed twice' })
        .click();
      await panel.waitFor({ state: 'detached', timeout: 5_000 });
      if (!page.url().endsWith('#/runs'))
        fail(where, `opening a notification went to ${page.url()}`);

      await page.getByRole('button', { name: /^Demo/ }).click();
      await page.getByLabel('Screen state').selectOption('empty');
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: 'Notifications, none unread' })
        .click();
      await panel
        .getByRole('heading', { name: 'You’re all caught up' })
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'the empty panel is not all caught up'));
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * InlineEdit, as the agent's purpose under its name. The description is a
   * div, not a <p> holding an editor. From the keyboard: Edit purpose opens
   * the field focused with its text selected; Enter saves, focus returns to
   * Edit and "Purpose saved" is announced; the saved purpose is there after
   * leaving the tab and coming back. Escape cancels. An empty purpose is
   * refused as the field's error with focus kept. In the Partial failure
   * state the save is refused and what was typed is kept. axe runs while
   * editing; nothing scrolls sideways on a phone.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `inline edit (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents/agt_wx`);
    try {
      const edit = page.getByRole('button', { name: 'Edit purpose' });
      await edit.waitFor({ timeout: 10_000 });
      const described = await page.evaluate(() => {
        const d = document.querySelector('.ion-page-header__description');
        return {
          tag: d?.tagName,
          text: d?.querySelector('.ion-inline-edit__value')?.textContent,
        };
      });
      if (described.tag !== 'DIV')
        fail(where, `the description is a <${described.tag}>`);
      const original = described.text;
      const focused = () =>
        page.evaluate(() => ({
          name:
            document.activeElement?.getAttribute('aria-label') ??
            document.activeElement?.textContent,
          selected:
            document.activeElement instanceof window.HTMLInputElement &&
            document.activeElement.selectionStart === 0 &&
            document.activeElement.selectionEnd ===
              document.activeElement.value.length,
        }));
      const field = page.getByRole('textbox', { name: 'Purpose' });
      // Each return to view mode names itself, so a timeout says which.
      const backToView = (when) =>
        edit.waitFor({ timeout: 5_000 }).catch(() => {
          throw new Error(`Edit purpose did not come back ${when}`);
        });

      await edit.focus();
      await page.keyboard.press('Enter');
      await field.waitFor({ timeout: 5_000 });
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Purpose',
        null,
        { timeout: 5_000 },
      );
      if (!(await focused()).selected)
        fail(where, 'the field opened without its text selected');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getTiming().iterations !== Infinity)
            .map((a) => a.finished),
        );
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways while editing');

      const next = 'Reconciles invoices against purchase orders.';
      await page.keyboard.type(next);
      await page.keyboard.press('Enter');
      await page
        .waitForFunction(
          () =>
            document.activeElement?.getAttribute('aria-label') ===
            'Edit purpose',
          null,
          { timeout: 5_000 },
        )
        .catch(() => fail(where, 'focus did not return to Edit purpose'));
      const saved = await page.evaluate(() => ({
        text: document.querySelector('.ion-inline-edit__value')?.textContent,
        said: document.querySelector('.ion-inline-edit > [role="status"]')
          ?.textContent,
      }));
      if (saved.text !== next) fail(where, `the purpose is "${saved.text}"`);
      if (saved.said !== 'Purpose saved') fail(where, 'the save was not said');

      // The agent's own tabs, not the sidebar's Overview. They are one page:
      // switching keeps it mounted, so the heading is the same element.
      await page.evaluate(() => {
        window.__agentHeading = document.querySelector('main h1');
      });
      const tabs = page.getByRole('navigation', { name: /sections$/ });
      await tabs.getByRole('link', { name: 'Runs', exact: true }).click();
      await tabs.getByRole('link', { name: 'Overview', exact: true }).click();
      await backToView('after coming back to Overview');
      if (
        !(await page.evaluate(
          () => window.__agentHeading === document.querySelector('main h1'),
        ))
      )
        fail(where, 'switching tabs mounted the agent page again');
      if (
        (await page.locator('.ion-inline-edit__value').textContent()) !== next
      )
        fail(where, 'the saved purpose was lost on coming back');

      await edit.focus();
      await page.keyboard.press('Enter');
      await field.waitFor({ timeout: 5_000 });
      // Focus moves in a frame after the field appears; typing before it
      // lands sends the Escape below to nothing, and the edit stays open.
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Purpose',
        null,
        { timeout: 5_000 },
      );
      await page.keyboard.type('Something else');
      await page.keyboard.press('Escape');
      await backToView('after Escape threw the edit away');
      if (
        (await page.locator('.ion-inline-edit__value').textContent()) !== next
      )
        fail(where, 'Escape did not throw the edit away');

      await edit.focus();
      await page.keyboard.press('Enter');
      await field.waitFor({ timeout: 5_000 });
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Purpose',
        null,
        { timeout: 5_000 },
      );
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Enter');
      const refused = await field.evaluate((el) => ({
        invalid: el.getAttribute('aria-invalid'),
        why: (el.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim(),
        focused: el === document.activeElement,
      }));
      if (
        refused.invalid !== 'true' ||
        refused.why !== 'Say what the agent is for.'
      )
        fail(where, `an empty purpose was not refused (${refused.why})`);
      if (!refused.focused) fail(where, 'focus left the refused field');
      await page.keyboard.press('Escape');
      await backToView('after Escape left the refused field');

      await page.getByRole('button', { name: /^Demo/ }).click();
      await page.getByLabel('Screen state').selectOption('partial');
      await page.keyboard.press('Escape');
      await edit.waitFor({ timeout: 10_000 });
      await edit.click();
      await field.waitFor({ timeout: 5_000 });
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Purpose',
        null,
        { timeout: 5_000 },
      );
      await page.keyboard.type('Kept after a refusal');
      await page.keyboard.press('Enter');
      await page
        .getByText('The agents service refused the change (HTTP 409).')
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'the refused save said nothing'));
      if ((await field.inputValue()) !== 'Kept after a refusal')
        fail(where, 'the refused save lost what was typed');
      if (original === next) fail(where, 'the check proves nothing');
    } catch (e) {
      // The locator is on the lines after the first; keep it, so a timeout
      // says what it was waiting for.
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * SelectableTile, as the wizard's "What starts a run?" — Trigger, the
   * second step, which a draft with Basics done opens on. Three radios named
   * by their titles and described by their sentences. A press on a tile's
   * far corner chooses it (and the Schedule fields go when it is not the
   * schedule); the arrow keys move between them. One column on a phone,
   * nothing sideways; axe.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `selectable tile (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
      localStorage.setItem(
        'ionbase-ops:new-agent-draft',
        JSON.stringify({
          values: { name: 'Smoke test agent', trigger: 'schedule' },
          completed: 0,
          model: 'atlas-m',
        }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents/new`);
    try {
      const group = page.getByRole('group', { name: 'What starts a run?' });
      await group.waitFor({ timeout: 10_000 });
      const radios = group.getByRole('radio');
      if ((await radios.count()) !== 3)
        fail(where, `${await radios.count()} radios, not 3`);
      const manual = group.getByRole('radio', {
        name: 'Only when someone starts it',
      });
      const described = await manual.evaluate((el) =>
        (el.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' '),
      );
      if (!described.includes('It never runs on its own.'))
        fail(where, 'the tile is not described by its sentence');

      // The tile itself — `ion-tile` as a whole class, not the label's
      // `ion-tile__control`, whose corner would prove nothing.
      const tile = manual.locator(
        "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' ion-tile ')][1]",
      );
      // Mid-screen first: coordinates off the viewport, or under the
      // floating Demo button, would press something else.
      await tile.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const box = await tile.boundingBox();
      await page.mouse.click(box.x + box.width - 8, box.y + box.height - 8);
      if (!(await manual.isChecked()))
        fail(where, "a press on the tile's corner did not choose it");
      await page
        .getByRole('group', { name: 'Schedule' })
        .waitFor({ state: 'detached', timeout: 5_000 })
        .catch(() =>
          fail(where, 'the Schedule fields stayed for a manual trigger'),
        );

      await manual.focus();
      await page.keyboard.press('ArrowUp');
      const webhook = group.getByRole('radio', {
        name: 'When a webhook is called',
      });
      await page
        .waitForFunction(
          () =>
            document.activeElement?.getAttribute('value') === 'webhook' &&
            document.activeElement.checked,
          null,
          { timeout: 5_000 },
        )
        .catch(() => fail(where, 'ArrowUp did not move to the webhook tile'));
      if (!(await webhook.isChecked()))
        fail(where, 'the webhook is not chosen');

      if (device === 'mobile') {
        const lefts = await group
          .locator('.ion-tile')
          .evaluateAll((els) =>
            els.map((el) => Math.round(el.getBoundingClientRect().left)),
          );
        if (new Set(lefts).size !== 1)
          fail(where, 'the tiles are not one column on a phone');
      }
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * TruncatedText, as an agent's purpose in the Agents table. A long purpose
   * is cut to one line with the whole text still in the DOM; cut, it is the
   * next tab stop after the agent's name, and focus shows the whole text in
   * a tooltip that is not read a second time. Escape closes it. A purpose
   * that fits is no tab stop; axe.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `truncated text (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents`);
    const FULL =
      'Highlights non-standard terms in vendor contracts and flags every clause that needs legal review before signature';
    try {
      const search = page.getByRole('searchbox', { name: 'Search agents' });
      await search.waitFor({ timeout: 10_000 });
      await search.fill('contract');
      const name = page.getByRole('link', { name: 'Contract clause checker' });
      await name.waitFor({ timeout: 5_000 });
      const row = page.getByRole('row').filter({ has: name });
      const line = row.locator('.ion-truncated__text');
      const state = await line.evaluate((el) => ({
        text: el.textContent,
        cut: el.scrollWidth > el.clientWidth,
      }));
      if (state.text !== FULL)
        fail(where, `the purpose in the DOM is "${state.text}"`);
      if (!state.cut) fail(where, 'the long purpose is not cut');
      await line
        .and(page.locator('[tabindex="0"]'))
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'the cut purpose is not a tab stop'));

      await name.focus();
      await page.keyboard.press('Tab');
      await page
        .waitForFunction(
          (full) => document.activeElement?.textContent === full,
          FULL,
          { timeout: 5_000 },
        )
        .catch(() =>
          fail(where, 'Tab from the name did not reach the purpose'),
        );
      const tip = page.locator('.ion-tooltip');
      await tip
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'focus did not open the tooltip'));
      if ((await tip.textContent()) !== FULL)
        fail(where, 'the tooltip is not the whole purpose');
      if ((await tip.getAttribute('aria-hidden')) !== 'true')
        fail(where, 'the tooltip copy is in the reading order');
      if ((await line.getAttribute('aria-describedby')) !== null)
        fail(where, 'the purpose is described by its own copy');
      await page.keyboard.press('Escape');
      await tip
        .waitFor({ state: 'detached', timeout: 5_000 })
        .catch(() => fail(where, 'Escape did not close the tooltip'));

      await search.fill('expense');
      const short = page
        .getByRole('row')
        .filter({
          has: page.getByRole('link', { name: 'Expense auditor' }),
        })
        .locator('.ion-truncated__text');
      await short.waitFor({ timeout: 5_000 });
      if ((await short.getAttribute('tabindex')) !== null)
        fail(where, 'a purpose that fits is a tab stop');

      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Table columns, on Agents. The Columns menu lists every column checked,
   * the Agent column fixed; unchecking Owner takes its header and cells out
   * and leaves the menu open. The Agent column resizes from its handle — a
   * named separator whose value is the width — and a wider column shows more
   * of each purpose. The view survives a reload; a double-click puts the
   * width back. Nothing sideways on a phone; axe.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `table columns (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents`);
    // The name is the scroll region's: Table puts its label there.
    const table = page.getByRole('region', { name: 'Agents' });
    const headers = () =>
      table
        .locator('thead th')
        .evaluateAll((ths) => ths.map((th) => th.textContent.trim()));
    const agentHeader = table.getByRole('columnheader', {
      name: 'Agent',
      exact: true,
    });
    try {
      await table.waitFor({ timeout: 10_000 });
      if (!(await headers()).includes('Owner'))
        fail(where, 'Owner is not shown to begin with');

      const button = page.getByRole('button', { name: 'Columns' });
      await button.click();
      const menu = page.getByRole('menu', { name: 'Columns' });
      await menu.waitFor({ timeout: 5_000 });
      const items = menu.getByRole('menuitemcheckbox');
      if ((await items.count()) !== 7)
        fail(where, `the menu lists ${await items.count()} columns, not 7`);
      const agentItem = menu.getByRole('menuitemcheckbox', { name: 'Agent' });
      if ((await agentItem.getAttribute('aria-disabled')) !== 'true')
        fail(where, 'the Agent column can be hidden');
      const cellsBefore = await table
        .locator('tbody tr')
        .first()
        .locator('td, th')
        .count();
      await menu.getByRole('menuitemcheckbox', { name: 'Owner' }).click();
      await page
        .waitForFunction(
          () =>
            ![...document.querySelectorAll('thead th')].some(
              (th) => th.textContent.trim() === 'Owner',
            ),
          null,
          { timeout: 5_000 },
        )
        .catch(() => fail(where, 'unchecking Owner did not hide it'));
      const cellsAfter = await table
        .locator('tbody tr')
        .first()
        .locator('td, th')
        .count();
      if (cellsAfter !== cellsBefore - 1)
        fail(where, `a row went from ${cellsBefore} cells to ${cellsAfter}`);
      if (!(await menu.isVisible()))
        fail(where, 'the menu closed after one column');
      await page.keyboard.press('Escape');
      await page
        .waitForFunction(
          () => document.activeElement?.textContent?.trim() === 'Columns',
          null,
          { timeout: 5_000 },
        )
        .catch(() => fail(where, 'Escape did not return focus to Columns'));

      const handle = table.getByRole('separator', { name: 'Resize Agent' });
      const valueBefore = Number(await handle.getAttribute('aria-valuenow'));
      const headerBefore = await agentHeader.evaluate(
        (th) => th.getBoundingClientRect().width,
      );
      if (Math.abs(valueBefore - headerBefore) > 1)
        fail(
          where,
          `the handle says ${valueBefore}, the column is ${headerBefore}`,
        );
      // The most cut purpose, held by its place among all of them: a filter
      // on "is cut" would pick another row once widening uncuts this one.
      const lines = table.locator('tbody .ion-truncated__text');
      const most = await lines.evaluateAll((els) => {
        const cut = els.map((el) => el.scrollWidth - el.clientWidth);
        return cut.indexOf(Math.max(...cut));
      });
      const purpose = lines.nth(most);
      const hidden = () =>
        purpose.evaluate((el) => el.scrollWidth - el.clientWidth);
      const hiddenBefore = await hidden();
      if (hiddenBefore <= 0) fail(where, 'no purpose is cut to begin with');
      await handle.focus();
      await page.keyboard.press('End');
      const widthOf = () =>
        agentHeader.evaluate((th) =>
          Math.round(th.getBoundingClientRect().width),
        );
      if ((await widthOf()) !== 560)
        fail(where, `End took the Agent column to ${await widthOf()}, not 560`);
      if ((await handle.getAttribute('aria-valuenow')) !== '560')
        fail(where, 'the handle does not say 560');
      // The widened column shows that much more of the cut purpose.
      const hiddenAfter = await hidden();
      if (hiddenAfter > Math.max(0, hiddenBefore - (560 - headerBefore)) + 2)
        fail(
          where,
          `widening showed ${hiddenBefore - hiddenAfter}px more of the purpose`,
        );

      await page.reload();
      await table.waitFor({ timeout: 10_000 });
      if ((await headers()).includes('Owner'))
        fail(where, 'Owner came back after a reload');
      if ((await widthOf()) !== 560)
        fail(where, `after a reload the Agent column is ${await widthOf()}`);

      await table.getByRole('separator', { name: 'Resize Agent' }).dblclick();
      if ((await agentHeader.evaluate((th) => th.style.width)) !== '')
        fail(where, 'a double-click did not put the width back');

      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * AILabel, on a finished run's Result. The mark sits in the card's header
   * beside the heading, not in it; its name starts with what is seen — "AI:
   * About this result". A press opens what was generated and from what,
   * read out while focus stays on the mark; Escape closes it and returns
   * focus. On a phone the explanation stays on screen. Axe, open.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `ai label (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/runs/run_4821-h3`);
    try {
      const mark = page.getByRole('button', { name: 'AI: About this result' });
      await mark.waitFor({ timeout: 10_000 });
      if ((await mark.textContent()) !== 'AI')
        fail(where, `the mark reads "${await mark.textContent()}"`);
      const heading = page.getByRole('heading', {
        name: 'Result',
        exact: true,
      });
      if ((await heading.count()) !== 1)
        fail(where, 'the Result heading is not named "Result" alone');
      if (await heading.evaluate((h) => !!h.querySelector('button')))
        fail(where, 'the mark is inside the heading');

      const box = await mark.boundingBox();
      const target = await mark.evaluate((el) => {
        const after = window.getComputedStyle(el, '::after');
        return (
          el.getBoundingClientRect().height -
          parseFloat(after.top) -
          parseFloat(after.bottom)
        );
      });
      if (target < 24 || box.width < 24)
        fail(where, `the target is ${box.width}×${target}`);

      await mark.click();
      if ((await mark.getAttribute('aria-expanded')) !== 'true')
        fail(where, 'a press did not open the explanation');
      const bubble = page.locator(
        `#${await mark.getAttribute('aria-controls')}`,
      );
      if ((await bubble.getAttribute('role')) !== 'status')
        fail(where, 'the explanation is not read out on open');
      const text = await bubble.textContent();
      if (!text.startsWith('Generated by AI'))
        fail(where, `the explanation starts "${text.slice(0, 30)}"`);
      if (!/Written by Atlas M from this run/.test(text))
        fail(where, 'the explanation does not say what wrote it, from what');
      if (!(await mark.evaluate((el) => el === document.activeElement)))
        fail(where, 'focus left the mark on open');
      const fits = await bubble.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= 0 && r.right <= window.innerWidth;
      });
      if (!fits) fail(where, 'the explanation runs off screen');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);

      await page.keyboard.press('Escape');
      if ((await mark.getAttribute('aria-expanded')) !== 'false')
        fail(where, 'Escape did not close the explanation');
      if (!(await mark.evaluate((el) => el === document.activeElement)))
        fail(where, 'Escape did not return focus to the mark');

      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * ChatMessage, on the Assistant. A suggested question makes one turn: two
   * articles, each named by its author then its time, with a real <time>.
   * The question is Ada's, on the trailing side in a muted bubble, and keeps
   * its h2; the answer is the assistant's, spans the column, and gets Copy
   * answer after its sources once it is whole. No live region in the thread
   * — "Answer ready." is said once, outside it. Nothing sideways; axe.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `chat message (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/assistant`);
    try {
      const first = page.locator('.demo-suggestions button').first();
      await first.waitFor({ timeout: 10_000 });
      const question = (await first.textContent()).trim();
      await first.click();
      await page
        .getByRole('status')
        .filter({ hasText: 'Answer ready.' })
        .waitFor({ timeout: 20_000 });

      const articles = page.getByRole('article');
      if ((await articles.count()) !== 2)
        fail(where, `one turn made ${await articles.count()} articles, not 2`);
      const asked = page.getByRole('article', { name: /^Ada Reyes \S/ });
      const answered = page.getByRole('article', {
        name: /^Ionbase assistant \S/,
      });
      if ((await asked.count()) !== 1)
        fail(where, 'the question is not named by Ada and its time');
      if ((await answered.count()) !== 1)
        fail(where, 'the answer is not named by the assistant and its time');

      for (const [who, a] of [
        ['question', asked],
        ['answer', answered],
      ]) {
        const iso = await a.locator('time').getAttribute('datetime');
        if (!iso || Number.isNaN(Date.parse(iso)))
          fail(where, `the ${who}'s time has no exact instant`);
      }
      if (
        (await asked
          .getByRole('heading', { level: 2, name: question })
          .count()) !== 1
      )
        fail(where, 'the question lost its heading');

      const layout = await page.evaluate(() => {
        const [q, a] = document.querySelectorAll('article');
        const box = (el) => el.getBoundingClientRect();
        const probe = document.createElement('span');
        probe.style.backgroundColor = 'var(--surface-muted)';
        document.body.append(probe);
        const muted = window.getComputedStyle(probe).backgroundColor;
        probe.remove();
        const body = q.querySelector('.ion-chat-message__body');
        return {
          qAvatarAtEnd:
            Math.abs(
              box(q.querySelector('.ion-chat-message__avatar')).right -
                box(q).right,
            ) < 1,
          bubble: window.getComputedStyle(body).backgroundColor === muted,
          aSpans:
            Math.abs(
              box(a.querySelector('.ion-chat-message__main')).right -
                box(a).right,
            ) < 1,
          // The messages and the thread themselves. Inside them,
          // StreamingText is aria-live="off" on purpose, and CopyButton
          // announces its own "Copied".
          live: !!document.querySelector(
            'article[aria-live], .demo-turn[aria-live], .demo-assistant__thread[aria-live], [role="log"]',
          ),
        };
      });
      if (!layout.qAvatarAtEnd) fail(where, "Ada's avatar is not at the end");
      if (!layout.bubble) fail(where, 'the question is not in a muted bubble');
      if (!layout.aSpans) fail(where, 'the answer does not span the column');
      if (layout.live) fail(where, 'the thread is a live region');

      const copy = answered.getByRole('button', { name: 'Copy answer' });
      if ((await copy.count()) !== 1)
        fail(where, 'the whole answer has no Copy answer');
      const after = await answered.evaluate((a) => {
        const list = a.querySelector('.ion-chat-message__body');
        const actions = a.querySelector('.ion-chat-message__actions');
        return !!(
          list &&
          actions &&
          list.compareDocumentPosition(actions) &
            window.Node.DOCUMENT_POSITION_FOLLOWING
        );
      });
      if (!after) fail(where, 'Copy answer comes before the answer');

      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Stack, in the demo's rows. The Agents toolbar and its active filters,
   * and the Assistant's suggestions, are Stacks: each gap between siblings is
   * the spacing token the Stack names — 8 — measured, not read from a class.
   * On a phone the rows wrap instead of scrolling sideways, and the empty
   * state's suggestions stay centred.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `stack (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    // Siblings on the same line, and the space between each pair, against
    // the token.
    const measure = (sel) =>
      page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const probe = document.createElement('div');
        probe.style.width = 'var(--spacing-8)';
        document.body.append(probe);
        const token = probe.getBoundingClientRect().width;
        probe.remove();
        const kids = [...el.children].map((c) => c.getBoundingClientRect());
        const gaps = [];
        // On the same line when they overlap vertically — a row aligned to
        // the end has children whose tops differ.
        for (let i = 1; i < kids.length; i++)
          if (
            kids[i].top < kids[i - 1].bottom &&
            kids[i - 1].top < kids[i].bottom
          )
            // Less the next child's own margin: the Columns menu is pushed
            // to the row's end with an auto margin, which is not the gap.
            gaps.push(
              Math.round(
                kids[i].left -
                  kids[i - 1].right -
                  parseFloat(
                    window.getComputedStyle(el.children[i]).marginLeft,
                  ),
              ),
            );
        return {
          stack: el.classList.contains('ion-stack'),
          token,
          gaps,
          lines: new Set(kids.map((k) => Math.round(k.top))).size,
          inline: el.getAttribute('style'),
        };
      }, sel);
    try {
      await page.goto(`${BASE}/#/agents`);
      await page
        .getByRole('searchbox', { name: 'Search agents' })
        .waitFor({ timeout: 10_000 });
      const toolbar = await measure('.demo-toolbar');
      if (!toolbar?.stack) fail(where, 'the Agents toolbar is not a Stack');
      else {
        if (toolbar.inline)
          fail(where, `the toolbar has a style: ${toolbar.inline}`);
        if (
          !toolbar.gaps.length ||
          toolbar.gaps.some((g) => g !== toolbar.token)
        )
          fail(
            where,
            `the toolbar's gaps are ${toolbar.gaps}, not ${toolbar.token}`,
          );
        if (device === 'mobile' && toolbar.lines < 2)
          fail(where, 'the toolbar did not wrap on a phone');
      }
      await page
        .getByRole('searchbox', { name: 'Search agents' })
        .fill('contract');
      await page
        .getByRole('button', { name: 'Clear all' })
        .waitFor({ timeout: 5_000 });
      const filters = await measure('.demo-toolbar ~ .ion-stack');
      if (!filters?.stack) fail(where, 'the active filters row is not a Stack');
      else if (
        !filters.gaps.length ||
        filters.gaps.some((g) => g !== filters.token)
      )
        fail(where, `the active filters' gaps are ${filters.gaps}`);

      await page.goto(`${BASE}/#/assistant`);
      await page
        .locator('.demo-suggestions button')
        .first()
        .waitFor({ timeout: 10_000 });
      const suggestions = await measure('.demo-suggestions');
      if (!suggestions?.stack) fail(where, 'the suggestions are not a Stack');
      else if (suggestions.gaps.some((g) => g !== suggestions.token))
        fail(where, `the suggestions' gaps are ${suggestions.gaps}`);
      // Every line centred in the row — the wrapped, part-filled line is
      // where it shows; a single line may already be centred by its parent.
      const centred = await page.evaluate(() => {
        const el = document.querySelector('.demo-suggestions');
        const box = el.getBoundingClientRect();
        const kids = [...el.children].map((c) => c.getBoundingClientRect());
        const tops = [...new Set(kids.map((k) => Math.round(k.top)))];
        return tops.every((t) => {
          const row = kids.filter((k) => Math.round(k.top) === t);
          const left = row[0].left - box.left;
          const right = box.right - row[row.length - 1].right;
          return Math.abs(left - right) <= 1;
        });
      });
      if (!centred)
        fail(where, "the empty state's suggestions are not centred");

      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Grid, as the Overview's main column and its aside and as the new-agent
   * form's two short fields. On a desktop each pair sits on one row — the
   * main column twice its aside, the fields equal — the gap between them
   * the token the Grid names, measured. On a phone each falls to one column
   * at full width, the gap now between the rows.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `grid (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    // The Grid around the element with this text, its cells, and the token.
    const measure = (text, token) =>
      page.evaluate(
        ([text, token]) => {
          const hit = [...document.querySelectorAll('h2, h3, label')].find(
            (e) => e.textContent.trim() === text,
          );
          const el = hit?.closest('.ion-grid');
          if (!el) return null;
          const probe = document.createElement('div');
          probe.style.width = `var(${token})`;
          document.body.append(probe);
          const want = probe.getBoundingClientRect().width;
          probe.remove();
          const [a, b] = [...el.children].map((c) => c.getBoundingClientRect());
          return {
            want,
            width: el.getBoundingClientRect().width,
            a: {
              top: a.top,
              left: a.left,
              right: a.right,
              bottom: a.bottom,
              w: a.width,
            },
            b: { top: b.top, left: b.left, w: b.width },
          };
        },
        [text, token],
      );
    const check = (name, m, ratio) => {
      if (!m) return fail(where, `${name} is not in a Grid`);
      if (device === 'desktop') {
        if (Math.round(m.a.top) !== Math.round(m.b.top))
          fail(where, `${name}: the two are not on one row`);
        else if (Math.abs(m.a.w / m.b.w - ratio) > 0.02)
          fail(
            where,
            `${name}: the columns are ${m.a.w}:${m.b.w}, not ${ratio}:1`,
          );
        else if (Math.round(m.b.left - m.a.right) !== Math.round(m.want))
          fail(
            where,
            `${name}: the gap is ${m.b.left - m.a.right}, not ${m.want}`,
          );
      } else if (m.b.top < m.a.bottom)
        fail(where, `${name}: the two are side by side on a phone`);
      else if (
        Math.abs(m.a.w - m.width) > 0.5 ||
        Math.abs(m.b.w - m.width) > 0.5
      )
        fail(where, `${name}: a cell is not the full width on a phone`);
      else if (Math.round(m.b.top - m.a.bottom) !== Math.round(m.want))
        fail(
          where,
          `${name}: the rows are ${m.b.top - m.a.bottom} apart, not ${m.want}`,
        );
    };
    const sideways = async () => {
      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');
    };
    try {
      await page.goto(`${BASE}/#/overview`);
      await page
        .getByRole('heading', { name: 'Token budget by agent' })
        .waitFor({ timeout: 10_000 });
      check('Overview', await measure('Activity', '--spacing-12'), 2);
      await sideways();

      await page.goto(`${BASE}/#/agents/new`);
      await page.getByText('Owning team').first().waitFor({ timeout: 10_000 });
      check('New agent', await measure('Owning team', '--spacing-16'), 1);
      await sideways();
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * ThemeZone, as the shell's Header: dark on the light page, still the
   * sticky row it was. Notifications, opened from inside it, opens dark —
   * portalled out of the Header but into the zone's theme — while the
   * command palette, the shell's, stays the page's light.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `theme zone (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    // A token as a theme resolves it, and an element's own paint.
    const resolve = (token, theme) =>
      page.evaluate(
        ([token, theme]) => {
          const el = document.createElement('div');
          el.setAttribute('data-theme', theme);
          el.style.backgroundColor = `var(${token})`;
          document.body.append(el);
          const c = window.getComputedStyle(el).backgroundColor;
          el.remove();
          return c;
        },
        [token, theme],
      );
    const paint = (locator) =>
      locator.evaluate((el) => ({
        bg: window.getComputedStyle(el).backgroundColor,
        theme: el.closest('[data-theme]')?.getAttribute('data-theme'),
      }));
    try {
      await page.goto(`${BASE}/#/overview`);
      await page
        .getByRole('heading', { name: 'Token budget by agent' })
        .waitFor({ timeout: 10_000 });
      const header = page.locator('header.ion-header');
      const h = await paint(header);
      if (h.theme !== 'dark') fail(where, `the Header is in ${h.theme}`);
      else if (h.bg !== (await resolve('--surface-default', 'dark')))
        fail(where, `the Header's surface is ${h.bg}, not the dark theme's`);
      const main = await paint(page.locator('main'));
      if (main.theme !== 'light')
        fail(where, `the page around it is ${main.theme}`);

      // Still the sticky row: scrolled, it stays at the top.
      await page.mouse.wheel(0, 600);
      await page.waitForFunction(() => window.scrollY > 100);
      const top = await header.evaluate((el) =>
        Math.round(el.getBoundingClientRect().top),
      );
      if (top !== 0) fail(where, `the Header scrolled away (top ${top})`);
      await page.evaluate(() => window.scrollTo(0, 0));

      await page.getByRole('button', { name: /^Notifications, / }).click();
      const panel = page.getByRole('dialog', { name: 'Notifications' });
      await panel.waitFor({ timeout: 5_000 });
      const pop = await paint(
        panel.locator(
          'xpath=ancestor-or-self::*[contains(@class, "ion-popover")][1]',
        ),
      );
      if (pop.theme !== 'dark')
        fail(where, `Notifications opened in ${pop.theme}`);
      else if (pop.bg !== (await resolve('--surface-raised', 'dark')))
        fail(
          where,
          `Notifications' surface is ${pop.bg}, not the dark theme's`,
        );
      if (
        await panel.evaluate(
          (el) => !!el.closest('[inert], [aria-hidden="true"]'),
        )
      )
        fail(where, 'Notifications opened into a hidden node');
      await page.keyboard.press('Escape');
      await panel.waitFor({ state: 'hidden', timeout: 5_000 });

      await page.getByRole('button', { name: /^Search/ }).click();
      const palette = page.getByRole('dialog', { name: 'Search and commands' });
      await palette.waitFor({ timeout: 5_000 });
      const pal = await paint(palette);
      if (pal.theme !== 'light')
        fail(where, `the command palette opened in ${pal.theme}`);
      await page.keyboard.press('Escape');

      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * SkipLink, first on every page. One Tab from a fresh load reaches it,
   * shown and on top of everything at the window's top-left; Enter moves
   * focus into <main> without touching the hash route, and the next Tab is
   * a control inside the content, past the whole Header.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `skip link (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    try {
      for (const route of ['overview', 'agents']) {
        // A fresh load each time: going from one hash route to another is
        // the same document, and Tab would carry on from where focus was.
        await page.goto(`${BASE}/#/${route}`);
        await page.reload();
        await page.locator('#page-title').waitFor({ timeout: 10_000 });
        await page.keyboard.press('Tab');
        const shown = await page.evaluate(() => {
          const a = document.activeElement;
          if (!a?.classList.contains('ion-skip-link'))
            return { first: a?.textContent?.trim() || a?.tagName };
          const r = a.getBoundingClientRect();
          const hit = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return {
            name: a.textContent,
            onTop: a.contains(hit),
            inView: r.top >= 0 && r.left >= 0 && r.width > 40,
          };
        });
        if (shown.first)
          fail(where, `${route}: the first Tab reaches "${shown.first}"`);
        else {
          if (shown.name !== 'Skip to main content')
            fail(where, `${route}: the skip link says "${shown.name}"`);
          if (!shown.inView)
            fail(where, `${route}: the skip link is not shown`);
          if (!shown.onTop)
            fail(where, `${route}: something covers the skip link`);
        }
        await page.keyboard.press('Enter');
        const landed = await page.evaluate(() => ({
          main: document.activeElement?.id === 'main',
          hash: window.location.hash,
        }));
        if (!landed.main) fail(where, `${route}: Enter did not reach <main>`);
        if (landed.hash !== `#/${route}`)
          fail(where, `${route}: the route became ${landed.hash}`);
        await page.keyboard.press('Tab');
        const next = await page.evaluate(() => ({
          inMain: !!document.activeElement?.closest('main'),
          what: document.activeElement?.textContent?.trim().slice(0, 40),
        }));
        if (!next.inMain)
          fail(
            where,
            `${route}: the next Tab went to "${next.what}", outside <main>`,
          );
      }
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Right to left: every route with the demo's Direction set, as a presenter
   * would flip it. The same bar as the main sweep — no console errors, no
   * sideways scroll, axe clean on a desktop — and the shell measured
   * mirrored: the sidebar to the right of <main>, the brand to the right of
   * the Header's actions, the Agents table's first column at its right edge.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `rtl (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0, direction: 'rtl' }),
      );
    });
    try {
      for (const route of ROUTES) {
        const at = `${where} #/${route}`;
        const page = await context.newPage();
        page.on(
          'console',
          (m) => m.type() === 'error' && fail(at, `console: ${m.text()}`),
        );
        page.on('pageerror', (e) => fail(at, `exception: ${e.message}`));
        await page.goto(`${BASE}/#/${route}`);
        await page.locator('#page-title').waitFor({ timeout: 10_000 });
        await page.waitForFunction(
          () => !document.querySelector('[aria-busy="true"]'),
          null,
          { timeout: 10_000 },
        );
        await page.waitForTimeout(400);
        const dir = await page.evaluate(() => document.documentElement.dir);
        if (dir !== 'rtl') fail(at, `dir is "${dir}"`);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (overflow > 0) fail(at, `scrolls sideways by ${overflow}px`);

        if (device === 'desktop') {
          await page.addScriptTag({ content: axeSource });
          const violations = await page.evaluate(async () => {
            const result = await window.axe.run(document, {
              resultTypes: ['violations'],
            });
            return result.violations.map(
              (v) => `${v.impact} ${v.id} — ${v.nodes[0]?.target.join(' ')}`,
            );
          });
          for (const v of violations) fail(at, `axe ${v}`);
        }

        if (route === 'overview') {
          const shell = await page.evaluate(() => {
            const r = (sel) =>
              document.querySelector(sel)?.getBoundingClientRect();
            return {
              sidebar: r('.demo-sidebar'),
              main: r('main'),
              brand: r('.demo-brand'),
              bell: r('.demo-bell'),
              vw: window.innerWidth,
            };
          });
          if (!shell.brand || !shell.bell)
            fail(at, 'no brand or bell to measure');
          else if (shell.brand.left < shell.bell.right)
            fail(at, 'the brand is not to the right of the Header actions');
          if (
            device === 'desktop' &&
            shell.sidebar?.width &&
            shell.sidebar.left < shell.main.right - 1
          )
            fail(at, 'the sidebar is not to the right of <main>');
        }
        if (route === 'agents') {
          const edge = await page.evaluate(() => {
            const region = document.querySelector('.ion-table-container');
            const first = document.querySelector('tbody tr')?.firstElementChild;
            if (!region || !first) return null;
            return (
              region.getBoundingClientRect().right -
              first.getBoundingClientRect().right
            );
          });
          if (edge === null) fail(at, 'no Agents table to measure');
          else if (Math.abs(edge) > 2)
            fail(
              at,
              `the table's first column is ${edge}px from its right edge`,
            );
        }
        await page.close();
      }
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Forced colours — Windows High Contrast — on every route. Two checks that
   * need no knowledge of any one component, so a new one is covered the day
   * it ships:
   *
   * - Focus shows. Tab through the page; at each stop, the focused control
   *   and the same control blurred must not be the same pixels. A focus ring
   *   drawn as a box-shadow is exactly what forced colours delete.
   * - Icons are seen. Chromium does not remap colour inside an SVG, so an
   *   icon whose own `color` is a token keeps it on a page forced to the
   *   system palette — the logo in the dark header was near-white on white.
   *   Every visible SVG's colour must reach 3:1 against the page.
   */
  {
    const where = 'forced colours (desktop)';
    if (!skip(where)) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        forcedColors: 'active',
      });
      await context.addInitScript(() => {
        localStorage.setItem(
          'ionbase-ops:demo-settings',
          JSON.stringify({ theme: 'light', latency: 0 }),
        );
      });
      try {
        for (const route of ROUTES) {
          const at = `${where} #/${route}`;
          const page = await context.newPage();
          page.on('pageerror', (e) => fail(at, `exception: ${e.message}`));
          await page.goto(`${BASE}/#/${route}`);
          await page.locator('#page-title').waitFor({ timeout: 10_000 });
          await page.waitForFunction(
            () => !document.querySelector('[aria-busy="true"]'),
            null,
            { timeout: 10_000 },
          );
          await page.waitForTimeout(400);

          const faint = await page.evaluate(() => {
            const rgb = (c) =>
              (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
            const lum = ([r, g, b]) => {
              const f = (v) => {
                v /= 255;
                return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
              };
              return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
            };
            // What an icon sits on: the nearest painted background, which is
            // the page unless something kept a fill — a checked box's
            // Highlight, under a white tick.
            const under = (el) => {
              for (let e = el; e; e = e.parentElement) {
                const bg = window.getComputedStyle(e).backgroundColor;
                if (!/rgba\(.*,\s*0\)$|transparent/.test(bg)) return bg;
              }
              return 'rgb(255, 255, 255)';
            };
            const out = [];
            for (const svg of document.querySelectorAll('svg')) {
              const r = svg.getBoundingClientRect();
              if (r.width < 4 || r.height < 4) continue;
              // Charts keep their data colours on purpose, as marks.
              if (svg.closest('[class*="chart"], [class*="heatmap"]')) continue;
              const style = window.getComputedStyle(svg);
              if (style.visibility === 'hidden' || Number(style.opacity) === 0)
                continue;
              const canvas = lum(rgb(under(svg)));
              const l = lum(rgb(style.color));
              const ratio =
                (Math.max(l, canvas) + 0.05) / (Math.min(l, canvas) + 0.05);
              if (ratio < 3)
                out.push(
                  `${svg.getAttribute('class') || svg.parentElement?.className} ${ratio.toFixed(2)}:1`,
                );
            }
            return [...new Set(out)];
          });
          for (const f of faint) fail(at, `an icon is faint on the page: ${f}`);

          const seen = new Set();
          for (let i = 0; i < 30; i++) {
            await page.keyboard.press('Tab');
            const box = await page.evaluate(() => {
              const a = document.activeElement;
              if (!a || a === document.body) return null;
              a.scrollIntoView({ block: 'center', inline: 'nearest' });
              // A visually hidden input draws its focus on the control round it.
              let t = a;
              if (a.getBoundingClientRect().width < 4) t = a.parentElement;
              const r = t.getBoundingClientRect();
              const kind = `${a.tagName}.${String(a.className).split(' ')[0]}`;
              a.setAttribute('data-smoke-focus', '');
              // 10px round it: an outline offset from a wrapper that is itself
              // outside the control, as Select's is, lands 6px out.
              return {
                kind,
                x: r.left - 10,
                y: r.top - 10,
                w: r.width + 20,
                h: r.height + 20,
              };
            });
            if (!box) continue;
            if (seen.has(box.kind) || box.y < 0 || box.y + box.h > 900) {
              await page.evaluate(() =>
                document
                  .querySelector('[data-smoke-focus]')
                  ?.removeAttribute('data-smoke-focus'),
              );
              continue;
            }
            seen.add(box.kind);
            const clip = {
              x: Math.max(0, box.x),
              y: box.y,
              width: Math.min(box.w, 1280 - Math.max(0, box.x)),
              height: box.h,
            };
            const focused = await page.screenshot({ clip });
            await page.evaluate(() => document.activeElement.blur());
            const plain = await page.screenshot({ clip });
            if (focused.equals(plain))
              fail(at, `focus does not show on ${box.kind}`);
            await page.evaluate(() => {
              const e = document.querySelector('[data-smoke-focus]');
              e.removeAttribute('data-smoke-focus');
              e.focus();
            });
          }
          await page.close();
        }
      } catch (e) {
        fail(
          where,
          `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
        );
      }
      groupsChecked++;
      await context.close();
    }
  }

  /*
   * Built-in strings, replaced in the product's words. The knowledge-file
   * upload on Guardrails refuses a file too large and a file of the wrong
   * type, and says so in the demo's own sentences — never FileUpload's
   * English defaults — as the field's error, which clears on the next good
   * file. The Agents pager's page-size control is "Agents per page", not
   * "Rows per page".
   */
  check: {
    const where = 'built-in strings (light, desktop)';
    if (skip(where)) break check;
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
    try {
      await page.goto(`${BASE}/#/agents/new`);
      const input = page.locator('#field-knowledge');
      await input.waitFor({ state: 'attached', timeout: 10_000 });
      await input.setInputFiles([
        {
          name: 'notes.md',
          mimeType: 'text/markdown',
          buffer: Buffer.from('x'),
        },
        {
          name: 'handbook.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.alloc(12_000_000),
        },
        // Over by less than the rounding: refused, and the size says so.
        {
          name: 'slides.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.alloc(10_200_000),
        },
        {
          name: 'setup.exe',
          mimeType: 'application/octet-stream',
          buffer: Buffer.from('x'),
        },
      ]);
      await page
        .getByText('notes.md', { exact: true })
        .waitFor({ timeout: 5_000 });

      const invalid = await input.getAttribute('aria-invalid');
      if (invalid !== 'true')
        fail(where, `a refused file left the field valid (${invalid})`);
      const said = await input.evaluate((el) =>
        (el.getAttribute('aria-describedby') ?? '')
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' '),
      );
      for (const sentence of [
        'handbook.pdf is 12 MB. Knowledge files can be up to 10 MB each.',
        'slides.pdf is 10.2 MB. Knowledge files can be up to 10 MB each.',
        'setup.exe can’t be used as knowledge.',
      ])
        if (!said.includes(sentence))
          fail(where, `the field does not say "${sentence}": "${said}"`);
      const text = (await page.locator('main').textContent()) ?? '';
      for (const english of ['not an accepted file type', 'over the'])
        if (text.includes(english))
          fail(where, `FileUpload's default English is showing: "${english}"`);

      await input.setInputFiles([
        { name: 'faq.txt', mimeType: 'text/plain', buffer: Buffer.from('x') },
      ]);
      await page
        .getByText('faq.txt', { exact: true })
        .waitFor({ timeout: 5_000 });
      if ((await input.getAttribute('aria-invalid')) === 'true')
        fail(where, 'the error stayed after a file that was accepted');

      await page.goto(`${BASE}/#/agents`);
      const size = page.getByRole('combobox', { name: 'Agents per page' });
      await size.waitFor({ timeout: 10_000 });
      if (await page.getByRole('combobox', { name: 'Rows per page' }).count())
        fail(where, 'the pager still says "Rows per page"');
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Density is a property of a view, not of the app. The Agents table, up
   * to 50 a page scanned for the one to act on, is compact — 8px cell
   * padding — and the Run history, six runs read one at a time, keeps the
   * default 16px. Padding, not row height: a row is as tall as its tallest
   * cell's content. A system-wide density leaking into either shows here.
   */
  check: {
    const where = 'density (light, desktop)';
    if (skip(where)) break check;
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    // The table's name is on its scroll region, not on the <table>.
    const measure = (name) =>
      page.evaluate((label) => {
        const table = document
          .querySelector(`[aria-label="${label}"]`)
          ?.querySelector('table');
        const cell = table?.querySelector('tbody td');
        return table && cell
          ? {
              compact: table.classList.contains('ion-table--compact'),
              padding: window.getComputedStyle(cell).paddingTop,
            }
          : null;
      }, name);
    try {
      await page.goto(`${BASE}/#/agents`);
      await page
        .getByRole('region', { name: 'Agents' })
        .waitFor({ timeout: 10_000 });
      const agents = await measure('Agents');
      if (!agents) fail(where, 'no Agents rows to measure');
      else if (!agents.compact || agents.padding !== '8px')
        fail(
          where,
          `the Agents table is not compact: ${JSON.stringify(agents)}`,
        );

      await page.goto(`${BASE}/#/runs`);
      await page
        .getByRole('region', { name: 'Run history' })
        .waitFor({ timeout: 10_000 });
      const runs = await measure('Run history');
      if (!runs) fail(where, 'no Run history rows to measure');
      else if (runs.compact || runs.padding !== '16px')
        fail(where, `Run history is not default: ${JSON.stringify(runs)}`);
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * FullPageError: the four kinds, each inside the shell. 404, an unknown
   * address. 403, a member arriving at Settings by its address, having not
   * been offered it in the navigation. 500, a page that throws, with a
   * reference to quote that changes on a failed retry, and a Reload page that
   * recovers once the cause is gone. Offline, a Banner over a loaded page and
   * the offline kind for one that could not load — which loads by itself when
   * the connection returns. axe on each.
   */
  check: {
    const where = 'full page error (light, desktop)';
    if (skip(where)) break check;
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await context.addInitScript(() => {
      const saved = JSON.parse(
        localStorage.getItem('ionbase-ops:demo-settings') ?? '{}',
      );
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0, role: 'admin', ...saved }),
      );
    });
    const page = await context.newPage();
    const kind = () =>
      page.locator('[data-page-error]').getAttribute('data-page-error', {
        timeout: 5_000,
      });
    const headings = () => page.locator('main h1, main h2').allTextContents();
    const shellIntact = async (label) => {
      if (!(await page.getByRole('button', { name: 'Search' }).count()))
        fail(where, `${label}: the Header is gone`);
      if (!(await page.getByRole('link', { name: 'Overview' }).count()))
        fail(where, `${label}: the navigation is gone`);
      const named = await page.evaluate(() => {
        const main = document.querySelector('main');
        const id = main?.getAttribute('aria-labelledby');
        const h1 = main?.querySelector('h1');
        return !!id && h1?.id === id;
      });
      if (!named) fail(where, `${label}: <main> is not named by its h1`);
    };
    const axe = async (label) => {
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `${label}: axe ${v}`);
    };
    const demoState = async (value) => {
      await page.getByRole('button', { name: 'Demo' }).click();
      await page.getByLabel('Screen state').selectOption(value);
      await page.keyboard.press('Escape');
    };
    try {
      // 404
      await page.goto(`${BASE}/#/no-such-page`);
      if ((await kind()) !== 'not-found')
        fail(where, '404: not the not-found kind');
      const h404 = await headings();
      if (
        h404[0] !== 'Page not found' ||
        !h404.includes('There is no page at this address')
      )
        fail(where, `404 says ${JSON.stringify(h404)}`);
      if ((await page.title()) !== 'Page not found · Ionbase Ops')
        fail(where, `404 document title is "${await page.title()}"`);
      await shellIntact('404');
      await axe('404');

      // 403 — a member: no Settings offered, and its address refused.
      await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('ionbase-ops:demo-settings'));
        localStorage.setItem(
          'ionbase-ops:demo-settings',
          JSON.stringify({ ...s, role: 'member' }),
        );
      });
      await page.goto(`${BASE}/#/overview`);
      await page.reload();
      await page.getByRole('link', { name: 'Overview' }).first().waitFor();
      if (await page.getByRole('link', { name: 'Settings' }).count())
        fail(where, '403: a member is offered Settings in the navigation');
      await page.goto(`${BASE}/#/settings`);
      if ((await kind()) !== 'no-access')
        fail(where, '403: not the no-access kind');
      const h403 = await headings();
      if (!h403.includes('You don’t have access to workspace settings'))
        fail(where, `403 says ${JSON.stringify(h403)}`);
      if (await page.getByText('Danger zone').count())
        fail(where, '403: the settings themselves are showing');
      await shellIntact('403');
      await axe('403');
      await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('ionbase-ops:demo-settings'));
        localStorage.setItem(
          'ionbase-ops:demo-settings',
          JSON.stringify({ ...s, role: 'admin' }),
        );
      });

      // 500 — a page that throws while rendering.
      await page.goto(`${BASE}/#/agents`);
      await page.reload();
      await page.getByRole('region', { name: 'Agents' }).waitFor();
      await demoState('crash');
      if ((await kind()) !== 'failed') fail(where, '500: not the failed kind');
      const reference = () =>
        page.locator('.demo-error-reference code').textContent();
      const first = await reference();
      if (!/^err_[A-Z0-9]{5}$/.test(first ?? ''))
        fail(where, `500: no reference to quote ("${first}")`);
      if (!(await page.getByRole('button', { name: 'Copy reference' }).count()))
        fail(where, '500: the reference cannot be copied');
      if ((await headings())[0] !== 'Agents')
        fail(where, '500: the heading does not name the page');
      await shellIntact('500');
      await axe('500');
      await page.getByRole('button', { name: 'Reload page' }).click();
      const second = await reference();
      if (second === first)
        fail(where, '500: a failed retry kept the same reference');
      await demoState('live');
      await page.getByRole('button', { name: 'Reload page' }).click();
      await page
        .getByRole('region', { name: 'Agents' })
        .waitFor({ timeout: 5_000 });
      if (await page.locator('[data-page-error]').count())
        fail(where, '500: Reload page did not recover once the cause was gone');

      // Offline — a Banner over what loaded; the offline kind for what cannot.
      // First a page whose code is here and whose data is refused: the agent
      // is opened once online, so its chunk is loaded, then again offline.
      await page.goto(`${BASE}/#/agents/agt_rs`);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.goto(`${BASE}/#/overview`);
      await page.getByRole('heading', { name: 'Overview', level: 1 }).waitFor();
      await context.setOffline(true);
      await page.evaluate(() => {
        window.location.hash = '#/agents/agt_rs';
      });
      if ((await kind()) !== 'offline')
        fail(where, 'offline data: not the offline kind');
      await context.setOffline(false);
      await page
        .getByRole('heading', { name: 'History' })
        .waitFor({ timeout: 10_000 })
        .catch(() =>
          fail(where, 'offline data: the page did not load when back online'),
        );

      // Then a page whose code never arrived.
      await page.goto(`${BASE}/#/overview`);
      await page.getByRole('heading', { name: 'Overview', level: 1 }).waitFor();
      await context.setOffline(true);
      await page
        .getByText('What’s on screen stays readable')
        .waitFor({ timeout: 5_000 });
      if (
        !(await page
          .getByRole('heading', { name: 'Overview', level: 1 })
          .count())
      )
        fail(where, 'offline: the loaded page was replaced');
      const said = await page.evaluate(() =>
        [...document.querySelectorAll('[role="status"]')]
          .map((el) => el.textContent)
          .join(' | '),
      );
      if (!said.includes('You’re offline'))
        fail(where, `offline is not announced: "${said}"`);
      await page.evaluate(() => {
        window.location.hash = '#/settings';
      });
      if ((await kind()) !== 'offline')
        fail(where, 'offline: not the offline kind');
      await axe('offline');
      await context.setOffline(false);
      await page
        .getByRole('heading', { name: 'Notifications' })
        .waitFor({ timeout: 10_000 });
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    await context.setOffline(false);
    groupsChecked++;
    await context.close();
  }

  /*
   * ListDetail, as Members. Wide: the List's selection follows focus and the
   * SidePanel beside it follows the selection without taking focus — Tab in,
   * arrow down, read each; Tab reaches the panel, Escape there returns to the
   * row, Enter goes into it. The selection is in the address, replaced not
   * pushed, so Back leaves the page; a deep link opens it without moving
   * focus, an unknown ID is said in the panel, a search hides it and brings
   * it back. The detail's own call fails in the panel alone. Narrow: arriving
   * in the list opens nothing, and a press opens the Drawer.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `list detail (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() =>
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    const hash = () => page.evaluate(() => window.location.hash);
    const focused = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        return {
          role: el?.getAttribute('role') ?? el?.tagName.toLowerCase(),
          text: el?.textContent?.trim().slice(0, 40) ?? '',
          inPanel: !!el?.closest('#member-panel, [role="dialog"]'),
        };
      });
    const row = (name) =>
      page.getByRole('row', { name: new RegExp(`^${name}`) });
    const panel = (name) => page.getByRole('region', { name });
    const axe = async (label) => {
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `${label}: axe ${v}`);
    };
    const search = page.getByRole('searchbox', { name: 'Search members' });
    try {
      if (device === 'mobile') {
        await page.goto(`${BASE}/#/members`);
        await search.waitFor({ timeout: 10_000 });
        await search.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('ArrowDown');
        const f = await focused();
        if (f.role !== 'row' || !f.text.includes('Kwame'))
          fail(where, `↓ in the list focused ${JSON.stringify(f)}`);
        if (await page.getByRole('dialog').count())
          fail(where, 'arriving in the list opened the Drawer');
        if ((await hash()) !== '#/members')
          fail(where, `arriving in the list selected: ${await hash()}`);
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog', { name: 'Kwame Mensah' });
        await dialog.waitFor({ timeout: 5_000 });
        await axe('drawer');
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'detached', timeout: 5_000 });
        // Focus goes back a frame after the Drawer leaves.
        await page
          .waitForFunction(
            () => document.activeElement?.getAttribute('role') === 'row',
            null,
            { timeout: 2_000 },
          )
          .catch(() => {});
        const back = await focused();
        if (back.role !== 'row' || !back.text.includes('Kwame'))
          fail(
            where,
            `closing the Drawer left focus on ${JSON.stringify(back)}`,
          );
        if (
          await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          )
        )
          fail(where, 'the page scrolls sideways');
      } else {
        // Arrive from elsewhere, so Back has somewhere to go.
        await page.goto(`${BASE}/#/overview`);
        await page.getByRole('link', { name: 'Members' }).click();
        await search.waitFor({ timeout: 10_000 });
        const entries = await page.evaluate(() => window.history.length);
        await page.evaluate(() => {
          window.__membersList = document.querySelector('[role="grid"]');
        });
        if (await page.locator('#member-panel').count())
          fail(where, 'a panel is open with nothing selected');

        // Tab in: the first row is selected, the panel opens, focus stays.
        await search.focus();
        await page.keyboard.press('Tab');
        await panel('Ada Reyes').waitFor({ timeout: 5_000 });
        let f = await focused();
        if (f.role !== 'row' || !f.text.includes('Ada'))
          fail(where, `tabbing in focused ${JSON.stringify(f)}`);
        if ((await hash()) !== '#/members/usr_ada')
          fail(where, `tabbing in: the address is ${await hash()}`);

        // ↓ ↓: the panel follows, focus stays on the row, no history.
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await panel('Lin Zhou').waitFor({ timeout: 5_000 });
        f = await focused();
        if (f.role !== 'row' || !f.text.includes('Lin'))
          fail(where, `after ↓ ↓ focus is on ${JSON.stringify(f)}`);
        if ((await hash()) !== '#/members/usr_lin')
          fail(where, `after ↓ ↓ the address is ${await hash()}`);
        if ((await page.evaluate(() => window.history.length)) !== entries)
          fail(where, 'moving the selection added history entries');
        if (
          !(await page.evaluate(
            () =>
              window.__membersList === document.querySelector('[role="grid"]'),
          ))
        )
          fail(where, 'moving the selection mounted the list again');
        await panel('Lin Zhou')
          .getByRole('link')
          .first()
          .waitFor({ timeout: 5_000 });
        await axe('panel open');

        // Tab goes on into the panel; Escape there returns to the row.
        await page.keyboard.press('Tab');
        if (!(await focused()).inPanel)
          fail(where, 'Tab from the list did not reach the panel');
        await page.keyboard.press('Escape');
        await panel('Lin Zhou').waitFor({ state: 'detached', timeout: 5_000 });
        f = await focused();
        if (f.role !== 'row' || !f.text.includes('Lin'))
          fail(where, `Escape left focus on ${JSON.stringify(f)}`);
        if ((await hash()) !== '#/members')
          fail(where, `closing left the address at ${await hash()}`);

        // Enter goes into the detail.
        await page.keyboard.press('ArrowDown');
        await panel('Priya Natarajan').waitFor({ timeout: 5_000 });
        await page.keyboard.press('Enter');
        f = await focused();
        if (!f.inPanel || f.text !== 'Priya Natarajan')
          fail(where, `Enter did not go into the detail: ${JSON.stringify(f)}`);

        // Back leaves the page, not the last row.
        await page.goBack();
        await page
          .getByRole('heading', { name: 'Overview', level: 1 })
          .waitFor({ timeout: 5_000 })
          .catch(() => fail(where, `Back went to ${page.url()}`));

        // A deep link opens the panel and leaves focus where it was.
        await page.goto(`${BASE}/#/members/usr_tomas`);
        await page.reload();
        await panel('Tomás Ortega').waitFor({ timeout: 10_000 });
        if ((await focused()).inPanel)
          fail(where, 'a deep link moved focus into the panel');
        if ((await row('Tomás').getAttribute('aria-selected')) !== 'true')
          fail(where, 'a deep link did not select its row');

        // A search that hides the row hides its detail; clearing brings it back.
        await search.fill('zzz');
        await page
          .getByText('No one matches “zzz”.')
          .waitFor({ timeout: 5_000 });
        if (await panel('Tomás Ortega').count())
          fail(where, 'the panel stayed open for a row the search hid');
        await search.fill('');
        await panel('Tomás Ortega').waitFor({ timeout: 5_000 });

        // An ID that matches no one: said in the panel, the list intact.
        await page.goto(`${BASE}/#/members/usr_nobody`);
        await page.reload();
        await panel('Member not found')
          .getByRole('heading', { name: 'There is no member with this ID' })
          .waitFor({ timeout: 10_000 });
        if ((await page.getByRole('row').count()) < 8)
          fail(where, 'an unknown ID emptied the list');

        // Partial: the detail's own call fails in the panel alone.
        await page.getByRole('button', { name: /^Demo/ }).click();
        await page.getByLabel('Screen state').selectOption('partial');
        await page.keyboard.press('Escape');
        await row('Ada').click();
        const ada = panel('Ada Reyes');
        await ada
          .getByText('Their agents couldn’t load')
          .or(ada.getByText("Their agents couldn't load"))
          .waitFor({ timeout: 5_000 });
        if (!(await ada.getByText('ada@ionbase.example').count()))
          fail(where, 'partial: the facts the list had went with the agents');
        if ((await page.getByRole('row').count()) < 8)
          fail(where, 'partial: the list went with the detail');
        await axe('partial');
      }
    } catch (e) {
      fail(where, `did not run: ${e.message.split('\n')[0]}`);
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Timeline, as an agent's History on its Overview. An ordered list named
   * History, newest first; each event says what happened, who, and when in
   * a <time> with the exact instant; the markers are hidden. A purpose saved
   * in place is the newest event at once, with what it changed from and to;
   * pausing the agent is the next. Nothing sideways on a phone; axe.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `timeline (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents/agt_wx`);
    try {
      const list = page.getByRole('list', { name: 'History' });
      await list.waitFor({ timeout: 10_000 });
      const events = () =>
        list.evaluate((ol) =>
          [...ol.children].map((li) => ({
            title: li.querySelector('.ion-timeline__title')?.textContent,
            actor: li.querySelector('.ion-timeline__actor')?.textContent,
            at: li.querySelector('time')?.getAttribute('datetime'),
            detail: li.querySelector('.ion-timeline__detail')?.textContent,
            hidden: li
              .querySelector('.ion-timeline__marker')
              ?.getAttribute('aria-hidden'),
          })),
        );
      const tag = await list.evaluate((el) => el.tagName);
      if (tag !== 'OL') fail(where, `History is a <${tag}>, not an <ol>`);
      const seeded = await events();
      if (seeded.length < 2) fail(where, `${seeded.length} events, not 2+`);
      if (seeded.some((e) => !e.at || Number.isNaN(Date.parse(e.at))))
        fail(where, 'an event has no exact time');
      const times = seeded.map((e) => Date.parse(e.at));
      if (times.some((t, i) => i > 0 && t > times[i - 1]))
        fail(where, 'History is not newest first');
      if (seeded.some((e) => e.hidden !== 'true'))
        fail(where, 'a marker is read');
      if (seeded.at(-1)?.title !== 'Created the agent')
        fail(where, `the oldest event is "${seeded.at(-1)?.title}"`);

      // A purpose saved in place is the newest event at once.
      const edit = page.getByRole('button', { name: 'Edit purpose' });
      await edit.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => document.activeElement?.getAttribute('aria-label') === 'Purpose',
        null,
        { timeout: 5_000 },
      );
      const next = 'Checks expense claims against the travel policy.';
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type(next);
      await page.keyboard.press('Enter');
      await page
        .waitForFunction(
          () =>
            document.querySelector(
              '[aria-label="History"] .ion-timeline__title',
            )?.textContent === 'Changed the purpose',
          null,
          { timeout: 5_000 },
        )
        .catch(() => fail(where, 'the saved purpose is not in History'));
      const [changed] = await events();
      if (changed.actor !== 'Ada Reyes')
        fail(where, `the change is by "${changed.actor}"`);
      if (!changed.detail?.includes(`to “${next}”`))
        fail(where, `the change says "${changed.detail}"`);
      if ((await events()).length !== seeded.length + 1)
        fail(where, 'the save did not add exactly one event');

      // Pausing the agent is the next.
      await page.getByRole('button', { name: 'Pause agent' }).click();
      await page
        .getByRole('list', { name: 'History' })
        .locator('.ion-timeline__title')
        .first()
        .filter({ hasText: 'Paused the agent' })
        .waitFor({ timeout: 5_000 })
        .catch(() => fail(where, 'pausing is not in History'));
      const after = await events();
      if (after[1]?.title !== 'Changed the purpose')
        fail(where, 'the purpose change fell out of History on the refetch');

      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        await Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getTiming().iterations !== Infinity)
            .map((a) => a.finished),
        );
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Expandable rows, as an agent's recent runs. The newest failure starts
   * open with why it failed, in one cell across every column, controlled by
   * its toggle; the head names the toggle column. A completed run opens and
   * closes from the keyboard, focus staying on its toggle. axe.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `expandable rows (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/agents/agt_wx/runs`);
    try {
      const table = page.getByRole('table');
      await table.waitFor({ timeout: 10_000 });
      const toggles = table.getByRole('button', { name: /^Details for run / });
      if ((await toggles.count()) < 2)
        fail(where, `${await toggles.count()} run toggles`);
      const open = table.locator('button[aria-expanded="true"]');
      if ((await open.count()) !== 1)
        fail(where, `${await open.count()} runs start open, not 1`);
      const state = await open.first().evaluate((button) => {
        const detail = document.getElementById(
          button.getAttribute('aria-controls') ?? '',
        );
        const row = button.closest('tr');
        const head = row.closest('table').querySelector('thead tr');
        return {
          under: row.nextElementSibling === detail,
          text: detail?.textContent ?? '',
          span: detail?.cells[0].colSpan,
          columns: [...head.cells].reduce((n, c) => n + c.colSpan, 0),
          outcome: row.textContent,
        };
      });
      if (!state.under)
        fail(where, 'the open toggle does not control the row under it');
      if (!/Failed/.test(state.outcome))
        fail(where, 'the run that starts open is not a failure');
      if (!/timed out|archived|rejected/.test(state.text))
        fail(where, `the failure says "${state.text}"`);
      if (state.span !== state.columns)
        fail(where, `the detail spans ${state.span} of ${state.columns}`);
      if (
        (await table.getByRole('columnheader', { name: 'Details' }).count()) !==
        1
      )
        fail(where, 'the toggle column has no named header');

      const completed = table
        .getByRole('row')
        .filter({ hasText: 'Completed' })
        .first()
        .getByRole('button');
      await completed.focus();
      await page.keyboard.press('Enter');
      if ((await completed.getAttribute('aria-expanded')) !== 'true')
        fail(where, 'Enter did not open a completed run');
      const id = await completed.getAttribute('aria-controls');
      const said = await page
        .locator(`[id="${id}"]`)
        .textContent({ timeout: 5_000 })
        .catch(() => '');
      if (!said.includes('Finished every step'))
        fail(where, `the completed run says "${said}"`);
      await page.keyboard.press(' ');
      if ((await completed.getAttribute('aria-expanded')) !== 'false')
        fail(where, 'Space did not close it');
      if (!(await completed.evaluate((el) => el === document.activeElement)))
        fail(where, 'focus left the toggle');

      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
    }
    groupsChecked++;
    await context.close();
  }

  /*
   * Sticky header and first column, as the Runs history. On a desktop the
   * rows scroll inside the table and the header stays at its top, and a
   * task focused above the view lands clear of it. On a phone the table
   * scrolls sideways under a held Run column, whose edge then casts a
   * shadow. Nothing sideways on the page; axe.
   */
  for (const [device, width, height] of [
    ['desktop', 1280, 900],
    ['mobile', 390, 844],
  ]) {
    const where = `sticky table (light, ${device})`;
    if (skip(where)) continue;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => {
      localStorage.setItem(
        'ionbase-ops:demo-settings',
        JSON.stringify({ theme: 'light', latency: 0 }),
      );
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => fail(where, `exception: ${e.message}`));
    await page.goto(`${BASE}/#/runs`);
    try {
      const region = page.getByRole('region', { name: 'Run history' });
      await region.waitFor({ timeout: 10_000 });
      if (device === 'desktop') {
        const held = await region.evaluate(async (box) => {
          const frame = () =>
            new Promise((r) =>
              window.requestAnimationFrame(() =>
                window.requestAnimationFrame(r),
              ),
            );
          const scrolls = box.scrollHeight > box.clientHeight;
          box.scrollTop = box.scrollHeight;
          await frame();
          // Not the corner: it is held by the column too, and would stay
          // with the header broken.
          const th = box.querySelector('thead th:last-child');
          const top =
            box.getBoundingClientRect().top +
            parseFloat(window.getComputedStyle(box).borderTopWidth);
          const headAtTop = Math.abs(th.getBoundingClientRect().top - top) <= 1;
          // A task half under the header, focused: Chromium counts it as in
          // view and would not scroll, so the table must.
          // The lowest row that can be scrolled there — the scroll stops at
          // the bottom.
          const max = box.scrollHeight - box.clientHeight;
          const row = [...box.querySelectorAll('tbody tr')]
            .filter((r) => r.offsetTop - th.offsetHeight / 2 <= max)
            .at(-1);
          const link = row.querySelector('a');
          box.scrollTop = row.offsetTop - th.offsetHeight / 2;
          await frame();
          const under =
            link.getBoundingClientRect().top <
            th.getBoundingClientRect().bottom;
          link.focus();
          await frame();
          return {
            scrolls,
            headAtTop,
            under,
            clear:
              link.getBoundingClientRect().top >=
              th.getBoundingClientRect().bottom - 1,
          };
        });
        if (!held.scrolls) fail(where, 'the history does not scroll inside');
        if (!held.headAtTop) fail(where, 'the header did not stay at the top');
        if (!held.under)
          fail(
            where,
            'the check proves nothing: the task was not under the header',
          );
        if (!held.clear)
          fail(where, 'a focused task was left under the header');
      } else {
        const held = await region.evaluate(async (box) => {
          const frame = () =>
            new Promise((r) =>
              window.requestAnimationFrame(() =>
                window.requestAnimationFrame(r),
              ),
            );
          const wide = box.scrollWidth > box.clientWidth;
          const first = box.querySelector('tbody tr').cells[0];
          const before = first.getBoundingClientRect().left;
          box.scrollLeft = 200;
          box.dispatchEvent(new window.Event('scroll'));
          await frame();
          const edge = box.querySelector('tbody [data-sticky-edge]');
          return {
            wide,
            stayed: Math.abs(first.getBoundingClientRect().left - before) <= 1,
            shadow: edge
              ? window.getComputedStyle(edge).boxShadow !== 'none'
              : false,
          };
        });
        if (!held.wide) fail(where, 'the history is not wider than a phone');
        if (!held.stayed) fail(where, 'the Run column scrolled away');
        if (!held.shadow) fail(where, "the held column's edge casts no shadow");
      }

      if (
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        )
      )
        fail(where, 'the page scrolls sideways');

      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run(document, {
          resultTypes: ['violations'],
        });
        return result.violations.map((v) => `${v.impact} ${v.id}`);
      });
      for (const v of violations) fail(where, `axe ${v}`);
    } catch (e) {
      fail(
        where,
        `did not run: ${e.message.split('\n').slice(0, 3).join(' | ')}`,
      );
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
    if (skip(where)) continue;
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
  groupsChecked -
  skippedRoutes;
const scope = only ? ` (only "${only}")` : '';
// A filter that matches nothing checked nothing; that is not a pass.
if (only && checked <= 0) {
  console.error(`Demo smoke: SMOKE_ONLY="${only}" matched no check`);
  process.exit(1);
}
if (failures.length) {
  console.error(
    `Demo smoke${scope}: ${failures.length} failures across ${checked} page loads\n`,
  );
  for (const f of failures) console.error(`  ✖ ${f}`);
  process.exit(1);
}
console.log(
  `Demo smoke${scope}: ${checked} page loads — no errors, no axe violations, no sideways scroll`,
);
