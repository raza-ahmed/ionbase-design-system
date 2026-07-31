import React from 'react';
import type { Preview, Decorator } from '@storybook/react-vite';
/*
 * The source CSS, by relative path, on purpose.
 *
 * `ionbase-ui/styles` is the built stylesheet — correct for consumers, wrong
 * here: it would make `storybook dev` depend on a prior `pnpm build` and would
 * stop CSS edits hot-reloading. This used to go through an `./src/*` export
 * subpath instead, but `src/` is not in the package's `files`, so that subpath
 * resolved only inside this workspace and was broken for anyone installing
 * from npm. Reaching across the workspace directly is the honest version of
 * what was already happening, and it does not put raw source on npm.
 */
import '../../../packages/ionbase-ui/src/styles/index.css';

// Custom theme switcher decorator
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme || 'light';

  React.useEffect(() => {
    // Set the data-theme attribute on document root so our token overrides apply
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <Story />;
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
      options: {
        rules: {
          /*
           * `region` requires all page content to sit inside a landmark. A
           * story is a fragment rendered bare in an iframe — there is no
           * `<main>` for it to be inside — so it cannot satisfy this rule by
           * construction. Verified it is not component-specific: it fires on
           * Divider, Badge and Checkbox exactly as it does on Table.
           *
           * Disabled because it is unactionable at this level, NOT because
           * landmarks stop mattering. An app composing these components still
           * owns its landmark structure, and nothing here checks that.
           */
          region: { enabled: false },
        },
      },
    },
  },
  // Apply our custom theme decorator globally
  decorators: [withTheme],
};

// Add a theme dropdown toolbar selector
export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'light', icon: 'circlehollow', title: 'Light Mode' },
        { value: 'dark', icon: 'circle', title: 'Dark Mode' },
      ],
      showName: true,
    },
  },
};

export default preview;
