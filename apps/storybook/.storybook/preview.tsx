import React from 'react';
import type { Preview, Decorator } from '@storybook/react-vite';
import '@ionbase/styles/src/index.css';

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
