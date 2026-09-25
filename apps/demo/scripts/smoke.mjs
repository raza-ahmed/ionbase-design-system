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
   * The bulk-action Toolbar, which appears only once a row is selected. With
   * real key presses: → moves between its actions, and one Tab leaves the whole
   * toolbar rather than walking each button.
   */
  {
    const where = 'batch selection (light, desktop)';
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
        if (!(await first.evaluate((el) => el === document.activeElement)))
          fail(where, 'closing the drawer did not return focus to the row');
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
  {
    const where = 'button group (light)';
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
