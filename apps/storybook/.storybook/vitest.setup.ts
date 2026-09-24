import { beforeEach } from 'vitest';
import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    parkMouse: () => Promise<void>;
  }
}

// Every story starts with the real cursor off the page — see `parkMouse` in
// vitest.config.ts for why a resting cursor breaks hover tests.
beforeEach(async () => {
  await commands.parkMouse();
});
