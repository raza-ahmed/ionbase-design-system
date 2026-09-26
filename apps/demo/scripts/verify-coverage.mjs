/**
 * Which ionbase-ui components the demo shows, and which it does not yet.
 *
 * Reads the component list from the published contract index, not from a list
 * kept here, so a new component appears as "not shown" the release it lands —
 * that is the demo's to-do list. Reports by default and fails only for names in
 * REQUIRED, so a component can ship before it has a home in the demo.
 *
 *   pnpm --filter @ionbase-ui/demo coverage
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Components that must stay on screen. Grows as phases land. */
const REQUIRED = [
  // Phase 1 — shell and Overview
  'Header',
  // NavItem left with the header nav: PageShell forbids listing the same
  // destinations in a Sidebar and a Header.
  'Sidebar',
  'SidebarSection',
  'SidebarItem',
  'Logo',
  'Avatar',
  'ToastProvider',
  'Tooltip',
  'Alert',
  'Badge',
  'Button',
  'DateRangePicker',
  'EmptyState',
  'ProgressBar',
  'Skeleton',
  'Tabs',
  'TabItem',
  'Select',
  'Toggle',
  'Link',
  'Icon',
  // Phase 2 — Agents, New agent, Settings
  'Table',
  'TableHead',
  'TableBody',
  'TableRow',
  'TableCell',
  'Pagination',
  'Input',
  'Checkbox',
  'CheckboxGroup',
  'Fieldset',
  'Menu',
  'MultiSelect',
  'Toolbar',
  'TableBatchBar',
  'Toggletip',
  'Slider',
  'TreeView',
  'SidePanel',
  'SidePanelLayout',
  'DescriptionList',
  'DescriptionListItem',
  'List',
  'ButtonGroup',
  'SplitButton',
  'ContextMenu',
  'CopyButton',
  'CodeSnippet',
  'PasswordInput',
  'StatusIndicator',
  'Banner',
  'InlineLoading',
  'NotificationsPanel',
  'InlineEdit',
  'SelectableTile',
  'TruncatedText',
  'MenuItem',
  'MenuSection',
  'MenuTrigger',
  'PageHeader',
  'SearchField',
  'Popover',
  'Modal',
  'Breadcrumb',
  'BreadcrumbItem',
  'Textarea',
  'Combobox',
  'RadioGroup',
  'Radio',
  'DatePicker',
  'PhoneInput',
  'FileUpload',
  'Divider',
  'Accordion',
  'AccordionItem',
  // Phase 3 — Runs and Assistant
  'AgentActivity',
  'AgentActivityStep',
  'AgentStop',
  'ApprovalGate',
  'StreamingText',
  'Drawer',
  'AvatarGroup',
  'Citation',
  'CitationList',
  'CitationListItem',
  'ConfidenceIndicator',
  'AvatarGradient',
  // Dashboard pass — the components that landed after the first three phases
  'Stepper',
  'StepperStep',
  'PromptInput',
  'ToolCall',
  'NumberInput',
  'SegmentedControl',
  'SegmentedControlItem',
  'LogoMark',
  'ScrollProgress',
  'Spinner',
  'Toast',
];

/**
 * Components reached through a hook rather than imported by name. Toast is
 * rendered by ToastProvider from `useToast()` calls — a demo that imported the
 * Toast component itself would be using it wrongly.
 */
const VIA_HOOK = { useToast: 'Toast' };

/**
 * Components a shown component renders as a documented part of itself, so
 * they are on screen without being imported. TableBatchBar's actions ARE a
 * Toolbar — named, one tab stop, arrows between them — and the demo's bulk
 * bar is where Toolbar is used as its contract intends. Forcing a separate
 * import elsewhere would mean a Toolbar around two or three page-header
 * buttons, which Toolbar's own contract says not to do.
 *
 * Only a component whose contract names the part belongs here; "it happens to
 * render one internally" is not enough.
 */
const RENDERS = { TableBatchBar: ['Toolbar'] };

const require = createRequire(import.meta.url);
const index = require('ionbase-ui/meta/index');
const components = Object.keys(index.components).sort();

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? files(path)
      : /\.tsx?$/.test(name)
        ? [path]
        : [];
  });
}

// Every name imported from the package, across the app.
const imported = new Set();
for (const file of files(
  join(dirname(fileURLToPath(import.meta.url)), '../src'),
)) {
  const source = readFileSync(file, 'utf8');
  for (const [, names] of source.matchAll(
    /import\s*\{([^}]*)\}\s*from\s*'ionbase-ui'/g,
  )) {
    for (const n of names.split(',')) {
      const name = n
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0];
      if (!name) continue;
      imported.add(VIA_HOOK[name] ?? name);
      for (const part of RENDERS[name] ?? []) imported.add(part);
    }
  }
}

const shown = components.filter((c) => imported.has(c));
const missing = components.filter((c) => !imported.has(c));
const unknownRequired = REQUIRED.filter((c) => !components.includes(c));
const requiredMissing = REQUIRED.filter(
  (c) => components.includes(c) && !imported.has(c),
);

console.log(
  `Demo coverage: ${shown.length} of ${components.length} components shown`,
);
console.log(`  not shown yet: ${missing.join(', ') || 'none'}`);

if (unknownRequired.length) {
  console.error(
    `  REQUIRED names no longer in ionbase-ui: ${unknownRequired.join(', ')}`,
  );
}
if (requiredMissing.length) {
  console.error(`  REQUIRED but not shown: ${requiredMissing.join(', ')}`);
}
process.exit(unknownRequired.length || requiredMissing.length ? 1 : 0);
