import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

/*
 * Moves Chromium's real mouse outside the test iframe. Stories render at the
 * iframe's top-left corner, and a real cursor resting there hovers them for
 * real — `:hover` and react-aria's hover both fire, which synthetic
 * `userEvent.unhover` cannot undo. That is what made the Link and
 * ScrollProgress hover tests fail on CI and never locally: the link came up
 * already underlined, and the ScrollProgress panel opened under the cursor
 * and stayed open. Reproduced by parking the mouse on the link.
 */
const parkMouse: BrowserCommand<[]> = async ({ page }) => {
  const viewport = page.viewportSize();
  if (!viewport) return;
  // The far corner: outside the iframe, which is narrower than the viewport
  // (at most 960 of 1280), and far from the top-left where stories render.
  await page.mouse.move(viewport.width - 1, viewport.height - 1);
};

/*
 * Windows High Contrast, emulated: Chromium remaps every colour to the system
 * palette exactly as the real mode does, and computed styles then report the
 * remapped values — so a story can assert what a forced-colours user sees.
 * Reset before every story in vitest.setup.ts, so one that fails cannot leave
 * the next rendering in high contrast.
 */
const forcedColors: BrowserCommand<[on: boolean]> = async ({ page }, on) => {
  await page.emulateMedia({ forcedColors: on ? 'active' : 'none' });
};

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        // Found only by Timeline's server-render test. Discovered mid-run, it
        // made Vite reload the page and fail every test in the file with it.
        optimizeDeps: { include: ['react-dom/server'] },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
            commands: { parkMouse, forcedColors },
          },
          setupFiles: ['./.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
