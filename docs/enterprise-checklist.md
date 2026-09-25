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
- [ ] **ContextMenu** — _needs Menu_
- [ ] **CopyButton**
- [ ] **CodeSnippet** — _needs CopyButton_
- [ ] **PasswordInput**
- [ ] **StatusIndicator**
- [ ] **Banner**
- [ ] **InlineLoading**
- [ ] **NotificationsPanel**
- [ ] **InlineEdit**
- [ ] **SelectableTile**
- [ ] **TruncatedText**
- [ ] **Timeline**
- [ ] **Table: expandable rows**
- [ ] **Table: sticky header and first column**
- [ ] **Table: column resize and visibility**
- [ ] **AILabel** — agentic tier
- [ ] **ChatMessage** — agentic tier; update the `AssistantAnswer` pattern
- [ ] **Stack**
- [ ] **Grid**
- [ ] **ThemeZone** — audit `data-theme` first; may need no component
- [ ] **SkipLink** — and add it to the `PageShell` pattern

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

- [ ] **FullPageError** — 403, 404, 500, offline
- [ ] **ListDetail** — _needs List and SidePanel_
- [ ] **FilteredDataTable** — _needs SearchField, MultiSelect, Table: row selection_

## Cross-cutting audits

- [ ] **RTL** — logical properties everywhere; Storybook RTL toggle
- [ ] **Localised strings** — inventory every built-in string; make each overridable
- [ ] **Forced colours** — every stylesheet that needs a rule has one
- [ ] **Density** — decide system-wide or per-component, then apply

## Close-out

- [ ] Re-run the comparison in §2 of the plan against the three systems' current source, in case they shipped something new
- [ ] Delete this file and its pointer in AGENTS.md
