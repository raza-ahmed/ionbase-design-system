# Enterprise readiness — checklist

> **Live document, and temporary.** This is the only place progress on the
> enterprise gap list is recorded. The reasoning for every line is in
> [`enterprise-components.md`](enterprise-components.md) — read the item there
> before starting it.
>
> **How to use it**
>
> 1. Take the first unchecked item in the highest open tier. Items with a
>    _needs_ note wait for the item they name.
> 2. Do it on its own branch and PR, to the definition of done in §5 of the plan.
> 3. In the same PR, tick the box and append the version it shipped in:
>    `- [x] **SearchField** — 0.82.0`. A box ticked outside its PR is a claim
>    nothing checked.
> 4. If an item turns out to be the wrong thing, strike it through with a reason
>    rather than deleting it: `- [x] ~~**DateTimePicker**~~ — became a pattern, see Form`.
>
> **When every box is ticked**, delete this file, remove its pointer from
> AGENTS.md, and leave `enterprise-components.md` as the record.

---

## P0 — every enterprise app hits these

- [x] **Menu** — upgrade to a real ARIA menu: roving focus, arrow keys, typeahead, checkable items, sections — 0.82.0. Submenus moved to MenuButton: a submenu needs a trigger to open from
- [x] **MenuButton / OverflowMenu** — shipped as `MenuTrigger`, with submenus; the overflow menu is MenuTrigger with an icon-only Button — 0.83.0
- [x] **PageHeader** — and add it to the `PageShell` pattern — 0.84.0
- [x] **SearchField** — 0.85.0
- [x] **Fieldset / CheckboxGroup** — `RadioGroup` moved onto the same shell — 0.86.0
- [x] **MultiSelect** — the Agents table's Teams filter — 0.87.0
- [x] **Toolbar** — the Agents table's bulk actions — 0.88.0
- [x] **Table: row selection and batch actions** — `useTableSelection` and `TableBatchBar`; select-all across pages as "all except" — 0.89.0
- [x] **Toggletip** — Settings' log retention — 0.90.0
- [x] **Slider** — single and range — Runs history's duration filter — 0.91.0
- [x] **TreeView** — agent's knowledge sources — 0.92.0
- [x] **SidePanel** — non-modal — Runs history's run details — 0.93.0
- [x] **DescriptionList** — agent facts, wizard review, run details — 0.94.0
- [x] **List** — selectable and actionable — Runs' approval queue — 0.95.0

## P1 — common, and where hand-rolled versions lose accessibility

- [x] **ButtonGroup** — wizard, delete dialogs, save bar, run header — 0.96.0
- [x] **SplitButton** — the wizard's Create agent / Create and start — 0.97.0
- [x] **ContextMenu** — Agents table rows, same items as their ⋯ menu — 0.98.0
- [x] **CopyButton** — the run ID in Runs history's details; confirms on the button, a toast only when the copy failed — 0.99.0
- [x] **CodeSnippet** — Settings' API access: a CLI command, an API request, an inline command — 0.100.0
- [x] **PasswordInput** — the password asked again to delete the workspace — 0.101.0
- [x] **StatusIndicator** — the status column in Agents, Runs history and Overview, replacing Badge dots — 0.102.0
- [x] **Banner** — the app shell: maintenance (dismissed for good) and a scheduled deletion (until cancelled) — 0.103.0
- [x] **InlineLoading** — each Notifications switch in Settings: Saving…, Saved, Not saved beside it — 0.104.0
- [x] **NotificationsPanel** — the header bell on every page: grouped by day, read toggles, Mark all as read, empty and loading — 0.105.0
- [x] **InlineEdit** — an agent's purpose under its name, edited in place — 0.106.0
- [x] **SelectableTile** — the new-agent wizard's "What starts a run?", three radio tiles with a sentence each — 0.107.0
- [x] **TruncatedText** — an agent's purpose in the Agents table, one line with the rest on focus — 0.108.0
- [x] **Timeline** — an agent's History on its Overview: purpose edits, pauses and the seeded record — 0.109.0
- [x] **Table: expandable rows** — an agent's recent runs: why a run failed opens under it, the newest failure open — 0.110.0
- [x] **Table: sticky header and first column** — Runs history: rows scroll under a held header, and the Run column stays on a phone — 0.111.0
- [x] **Table: column resize and visibility** — Agents: a Columns menu, and an Agent column that widens to show more of each purpose, kept across visits — 0.112.0
- [x] **AILabel** — agentic tier: a finished run's Result says a model wrote it, from what, and what to check — 0.113.0
- [x] **ChatMessage** — agentic tier; update the `AssistantAnswer` pattern: each Assistant turn is a question and an answer, named by who and when — 0.114.0
- [x] **Stack** — the Agents toolbar, its filters and the Assistant's suggestions, with their flex CSS deleted — 0.115.0
- [x] **Grid** — the Overview's main column and its aside, and the new-agent form's paired fields, with their grid CSS and media queries deleted — 0.116.0
- [x] **ThemeZone** — audited first: `data-theme` left light-inside-dark, plain text, `color-scheme` and every overlay behind. The shell's Header, dark on a light page, its Notifications dark with it — 0.117.0
- [x] **SkipLink** — first in the demo's shell on every page, Enter lands in <main> without touching the hash route; added to the `PageShell` pattern — 0.118.0

## P2 — build when a product asks

- [ ] **DualListbox**
- [ ] **TreeGrid** — _needs TreeView and Table: expandable rows_
- [ ] **DateTimePicker** — decide component or pattern first
- [ ] **ColorPicker**
- [ ] **ProgressRing**
- [ ] **Coachmark / guided tour**
- [ ] **AppSwitcher**
- [ ] **Calendar** — export the existing internal one
- [ ] **SplitPane**

## Patterns

- [x] **FullPageError** — 404, 403, 500 and offline as one pattern, always inside the shell; the demo's four kinds on one component, an error boundary, a Member role and real offline paths, with a smoke check of each — 0.123.0
- [x] **ListDetail** — a List beside the selected record in a SidePanel: the selection follows focus and the panel follows it without taking focus (SidePanel `autoFocus`), the selection in the address and replaced rather than pushed, rows opened on a press below 768px; the demo's Members page — 0.124.0
- [x] **FilteredDataTable** — scoped to what DataTable lacked: the listing in the address (search, filters, sort, page, size; defaults left out, read defensively), a filter pushed and a search replaced so Back undoes one and not the other, the selection cleared on any new listing, and a refilter that keeps its rows busy; the demo's Agents page — 0.125.0

## Cross-cutting audits

- [x] **RTL** — logical properties everywhere, enforced by stylelint in the shipped config; a Storybook Direction toggle and RTL stories; the demo's Right to left setting and an RTL smoke sweep of every route — 0.119.0
- [x] **Localised strings** — 151 built-in strings, every one replaceable by a prop or `labels`, listed in `dist/meta/strings.json`; a build gate for strings a caller cannot reach, including ones a component does not pass on; pseudo-localised stories in `ru-RU`; the demo's upload refusals in its own words — 0.121.0
- [x] **Forced colours** — audited in the demo and 172 Storybook stories with the mode emulated; 11 components fixed, 12 stories and a smoke sweep of every route that checks focus and icons with no per-component knowledge — 0.120.0
- [x] **Density** — per component, on collections of rows only: Table's compact/default/relaxed, now List's compact/default (Figma Density on List and List Item); controls keep `size`; no system-wide mode; `verify-meta` holds the vocabulary and refuses `size` and `density` on one component; the demo's Agents table compact, the Run history default — 0.122.0

## Close-out

- [ ] Re-run the comparison in §2 of the plan against the three systems' current source, in case they shipped something new
- [ ] Delete this file and its pointer in AGENTS.md
