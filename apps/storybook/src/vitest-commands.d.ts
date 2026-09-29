/*
 * The custom browser commands vitest.config.ts registers, typed for the
 * stories that call them. `.storybook/vitest.setup.ts` declares the same for
 * itself; stories are compiled without it.
 */
import 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    parkMouse: () => Promise<void>;
    forcedColors: (on: boolean) => Promise<void>;
    reducedMotion: (on: boolean) => Promise<void>;
  }
}
