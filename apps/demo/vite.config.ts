import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * GitHub Pages serves the repo under a sub-path, and the demo will sit at
 * <pages>/demo/ beside Storybook. Vite writes absolute asset URLs by default,
 * so a hardcoded '/' would ship a page whose every chunk 404s — the same trap
 * recorded against STORYBOOK_BASE_PATH in apps/storybook/.storybook/main.ts.
 * Only the deploy workflow sets this; `pnpm dev` and local builds serve from '/'.
 */
export default defineConfig({
  plugins: [react()],
  base: process.env.DEMO_BASE_PATH ?? '/',
});
