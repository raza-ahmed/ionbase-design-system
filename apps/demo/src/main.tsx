import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// The built stylesheet, by its public specifier — tokens and components in one
// import, exactly as the README tells a consumer to do.
import 'ionbase-ui/styles';
import './app.css';
import './local/charts/charts.css';

import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
