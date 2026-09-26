# Enterprise component coverage

What an enterprise product expects a design system to have, measured against
three systems that ship to enterprises today, and what IonBase is missing.

**This file is the reasoning. It does not record status.** Progress lives in
[`enterprise-checklist.md`](enterprise-checklist.md) and nowhere else — a status
kept in two places is a status that drifts, and AGENTS.md has three stale counts
to prove it. When the checklist is finished it is deleted; this file stays, as
the record of why the system has the shape it has.

Snapshot taken 25 Sep 2026, against ionbase-ui 0.81.1.

---

## 1. Sources

| System                                   | Read from                                                                                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Carbon** (IBM)                         | `carbon-design-system/carbon` → `packages/react/src/components`, the directory the React package exports from                                                                            |
| **Lightning Design System** (Salesforce) | `salesforce-ux/design-system` → `ui/components`, the blueprint directory the docs site is generated from                                                                                 |
| **Material 3** (Google)                  | the m3.material.io component catalog, cross-checked against `material-components/material-web` and MUI's `mui-material/src`. The catalog page is JS-rendered, so it was not machine-read |

Source directories were read rather than the docs sites: they are what actually
ships, and the sites render client-side and return nothing to a fetch.

---

## 2. The union — every component, and who has it

`●` has it · `◐` covered by a variant or composition of something else · blank = absent.
IonBase column names the component that covers it.

### Actions

| Component                       | Carbon | M3  | SLDS | IonBase               |
| ------------------------------- | :----: | :-: | :--: | --------------------- |
| Button                          |   ●    |  ●  |  ●   | `Button`              |
| Icon button                     |   ●    |  ●  |  ●   | ◐ `Button`, icon-only |
| Button group / set              |   ●    |  ●  |  ●   | `ButtonGroup`         |
| Menu button / overflow menu     |   ●    |  ◐  |  ●   | `MenuTrigger`         |
| Split button / combo button     |   ●    |  ●  |  ●   | `SplitButton`         |
| Copy button                     |   ●    |     |      | `CopyButton`          |
| Toggle button group             |   ●    |  ●  |  ●   | ◐ `SegmentedControl`  |
| Link                            |   ●    |     |      | `Link`                |
| FAB / extended FAB / speed dial |        |  ●  |      | — _non-goal, §4_      |

### Inputs and forms

| Component                         | Carbon | M3  | SLDS | IonBase                         |
| --------------------------------- | :----: | :-: | :--: | ------------------------------- |
| Text input                        |   ●    |  ●  |  ●   | `Input`                         |
| Password input (reveal)           |   ●    |     |      | `PasswordInput`                 |
| Search field                      |   ●    |  ●  |  ◐   | `SearchField`                   |
| Textarea                          |   ●    |  ●  |  ●   | `Textarea`                      |
| Number input                      |   ●    |     |  ◐   | `NumberInput`                   |
| Phone input                       |        |     |      | `PhoneInput`                    |
| Select                            |   ●    |  ●  |  ●   | `Select`                        |
| Combobox (single)                 |   ●    |  ◐  |  ●   | `Combobox`                      |
| Multi-select                      |   ●    |  ◐  |  ●   | `MultiSelect`                   |
| Dual listbox / dueling picklist   |        |     |  ●   | —                               |
| Checkbox                          |   ●    |  ●  |  ●   | `Checkbox`                      |
| Checkbox group                    |   ●    |     |  ●   | `CheckboxGroup`                 |
| Radio / radio group               |   ●    |  ●  |  ●   | `Radio`, `RadioGroup`           |
| Switch                            |   ●    |  ●  |  ●   | `Toggle`                        |
| Selectable tile / visual picker   |   ●    |     |  ●   | —                               |
| Slider (single and range)         |   ●    |  ●  |  ●   | `Slider`                        |
| Date picker / range               |   ●    |  ●  |  ●   | `DatePicker`, `DateRangePicker` |
| Time picker                       |   ●    |  ●  |  ●   | `TimeField`                     |
| Date-time picker                  |        |     |  ●   | —                               |
| Color picker                      |        |     |  ●   | —                               |
| File uploader                     |   ●    |     |  ●   | `FileUpload`                    |
| Fieldset / form group             |   ●    |     |  ●   | `Fieldset`                      |
| Inline edit                       |   ●    |     |  ●   | —                               |
| Tag / pill input                  |   ●    |  ●  |  ●   | `TagGroup`, `Tag`               |
| Rich text editor                  |        |     |  ●   | — _deferred, §4_                |
| Fluid (borderless) input variants |   ●    |     |      | — _non-goal, §4_                |

### Navigation

| Component                    | Carbon | M3  | SLDS | IonBase              |
| ---------------------------- | :----: | :-: | :--: | -------------------- |
| App header / shell           |   ●    |  ●  |  ●   | `Header`             |
| Side navigation              |   ●    |  ●  |  ●   | `Sidebar`, `NavItem` |
| App switcher / launcher      |   ●    |     |  ●   | —                    |
| Page header                  |   ●    |  ◐  |  ●   | `PageHeader`         |
| Breadcrumb                   |   ●    |     |  ●   | `Breadcrumb`         |
| Tabs (incl. vertical)        |   ●    |  ●  |  ●   | `Tabs`               |
| Pagination                   |   ●    |     |      | `Pagination`         |
| Stepper / progress indicator |   ●    |     |  ●   | `Stepper`            |
| Menu (ARIA `role="menu"`)    |   ●    |  ●  |  ●   | `Menu`               |
| Context menu                 |   ●    |     |      | `ContextMenu`        |
| Tree view                    |   ●    |     |  ●   | `TreeView`           |
| Toolbar                      |   ◐    |  ●  |  ◐   | `Toolbar`            |
| Command palette              |        |     |      | `CommandPalette`     |
| Skip link                    |   ●    |     |      | —                    |
| Navigation rail / bottom bar |        |  ●  |      | — _non-goal, §4_     |

### Data display

| Component                        | Carbon | M3  | SLDS | IonBase                                                                   |
| -------------------------------- | :----: | :-: | :--: | ------------------------------------------------------------------------- |
| Data table                       |   ●    |     |  ●   | ◐ `Table`, `TableBatchBar` — _expandable rows, sticky header, resize: P1_ |
| Tree grid                        |        |     |  ●   | —                                                                         |
| List (selectable / actionable)   |   ●    |  ●  |  ◐   | `List`                                                                    |
| Description list / record detail |   ◐    |     |  ●   | `DescriptionList`                                                         |
| Card / tile                      |   ●    |  ●  |  ●   | `Card`, `FullCard`                                                        |
| Badge                            |   ●    |  ●  |  ●   | `Badge`                                                                   |
| Tag                              |   ●    |  ●  |  ●   | `Tag`                                                                     |
| Status indicator (shape + label) |   ●    |     |      | `StatusIndicator`                                                         |
| Avatar / avatar group            |   ●    |     |  ●   | `Avatar`, `AvatarGroup`                                                   |
| Big number / stat                |   ●    |     |      | `StatTile`, `StatGroup`                                                   |
| Code snippet                     |   ●    |     |      | `CodeSnippet`                                                             |
| Activity timeline / feed         |        |     |  ●   | ◐ `AgentActivity`, agent-only                                             |
| Truncated text                   |   ●    |     |      | —                                                                         |
| Keyboard key                     |        |     |      | `Kbd`                                                                     |
| Divider                          |        |  ●  |      | `Divider`                                                                 |
| Charts                           |   ●    |     |      | ◐ helpers for visx — _by design_                                          |
| Carousel                         |        |  ●  |  ●   | — _non-goal, §4_                                                          |
| Map                              |        |     |  ●   | — _non-goal, §4_                                                          |

### Feedback and overlays

| Component                       | Carbon | M3  | SLDS | IonBase              |
| ------------------------------- | :----: | :-: | :--: | -------------------- |
| Inline notification             |   ●    |     |  ●   | `Alert`              |
| Toast / snackbar                |   ●    |  ●  |  ●   | `Toast`              |
| Page banner                     |   ●    |     |  ●   | `Banner`             |
| Notifications panel             |   ●    |     |  ●   | `NotificationsPanel` |
| Progress bar                    |   ●    |  ●  |  ●   | `ProgressBar`        |
| Progress ring (determinate)     |        |  ●  |  ●   | —                    |
| Spinner                         |   ●    |  ●  |  ●   | `Spinner`            |
| Inline loading (pending → done) |   ●    |     |      | `InlineLoading`      |
| Skeleton                        |   ●    |     |      | `Skeleton`           |
| Empty state / illustration      |   ◐    |     |  ●   | `EmptyState`         |
| Tooltip                         |   ●    |  ●  |  ●   | `Tooltip`            |
| Toggletip (click-open info)     |   ●    |  ◐  |  ◐   | `Toggletip`          |
| Popover                         |   ●    |     |  ●   | `Popover`            |
| Modal / dialog                  |   ●    |  ●  |  ●   | `Modal`              |
| Drawer (modal side sheet)       |   ●    |  ●  |      | `Drawer`             |
| Side panel (non-modal)          |   ●    |  ●  |  ●   | `SidePanel`          |
| Coachmark / guided tour         |   ●    |     |  ●   | —                    |

### Layout and utilities

| Component                 | Carbon | M3  | SLDS | IonBase |
| ------------------------- | :----: | :-: | :--: | ------- |
| Grid                      |   ●    |     |  ●   | —       |
| Stack                     |   ●    |     |      | —       |
| Theme zone (scoped theme) |   ●    |     |      | —       |
| Resizable split pane      |   ●    |     |  ●   | —       |

### AI and agentic

| Component                         | Carbon | M3  | SLDS | IonBase                                       |
| --------------------------------- | :----: | :-: | :--: | --------------------------------------------- |
| AI label (provenance marker)      |   ●    |     |  ◐   | —                                             |
| Chat message / transcript         |   ◐    |     |  ●   | ◐ `AssistantAnswer` pattern                   |
| Prompt input                      |        |     |  ●   | `PromptInput`                                 |
| Streaming text                    |        |     |      | `StreamingText`                               |
| Agent stop / approval / activity  |        |     |      | `AgentStop`, `ApprovalGate`, `AgentActivity`  |
| Tool call / citation / confidence |        |     |      | `ToolCall`, `Citation`, `ConfidenceIndicator` |

IonBase is **ahead** of all three on the agentic tier and has nothing to add
there beyond the two rows marked absent. The gaps are in the classic tiers.

---

## 3. The gaps, and why each one matters

Priorities are about what an enterprise screen hits, not about how hard a thing
is to build:

- **P0** — almost every enterprise app hits it in its first week. Without it a
  team builds its own, badly, and the system has lost that screen.
- **P1** — common, and a hand-rolled version is where accessibility is usually lost.
- **P2** — real but specialised. Build when a product asks.

### P0

- **Menu, made a real menu.** `Menu` deliberately does not claim
  `role="menu"`, because it does not do roving focus, arrow keys or typeahead —
  honest, and correct for what it is. But Carbon, M3 and SLDS all ship the real
  thing, and every row-actions "⋯" in an enterprise table needs it. Build on
  react-aria's `useMenu` / `useMenuTrigger`: arrow keys, typeahead, submenus,
  checkable and radio items, separators, sections. The existing `Menu`
  contract has to be migrated rather than forked — two menus is the `control/*`
  mistake again.
- **MenuButton / OverflowMenu.** The trigger half of the above. Kept as its own
  item so the "⋯" icon-button case gets its own story and accessible-name rule.
- **PageHeader.** Title, breadcrumb, description, status, primary and secondary
  actions, tabs. Every enterprise page has one; today each product composes it
  differently, which is exactly what `PageShell` is supposed to prevent.
- **SearchField.** Clear button, Escape clears, `role="searchbox"`, submit on
  Enter. `Input type="search"` gets none of that.
- **Fieldset / CheckboxGroup.** A group label, group-level required and error
  wiring, `aria-describedby` on the group. `RadioGroup` already does this for
  radios; checkboxes have no equivalent, so "select at least one" is
  inexpressible accessibly.
- **MultiSelect.** Combobox with multiple selection rendered as removable tags.
  Carbon has three versions of it; it is the most-requested form control after
  the ones IonBase has.
- **Table: selection and batch actions.** Header checkbox with indeterminate
  state, select-all-across-pages, a batch-action bar that replaces the table
  toolbar when rows are selected and announces the count. The `DataTable`
  pattern currently leaves all of this to the caller.
- **Toolbar.** `role="toolbar"` with one tab stop and arrow-key movement. Needed
  by the batch-action bar above and by every editor-like surface.
- **Toggletip.** `Tooltip` cannot hold a link or a button — it vanishes on
  pointer-out and is not reachable by keyboard focus inside it. The "ⓘ" next to a
  field label needs a click-opened, focusable disclosure.
- **Slider**, single and range. Present in all three systems.
- **TreeView.** Folder, org and permission hierarchies. react-aria's tree
  gives the keyboard model; it is not something to hand-roll.
- **SidePanel (non-modal).** A detail pane that opens beside a list without
  trapping focus or hiding the page. `Drawer` is modal and cannot be made
  non-modal without lying about its role. Same reasoning as `ApprovalGate` not
  being a `Modal`: the page is the context.
- **DescriptionList.** Label–value pairs for record detail pages, as `<dl>`.
  Every settings summary, invoice and record header uses one.
- **List.** A selectable, actionable list (react-aria `GridList`) — inbox
  rows, file lists, pick-one-from-many that is not a form control.

### P1

- **ButtonGroup** — spacing, order and overflow for a row of actions.
- **SplitButton** — primary action plus a menu of alternatives. Depends on Menu.
- **ContextMenu** — right-click and Shift+F10. Depends on Menu.
- **CopyButton** — copies, confirms in place, and announces. Needed by CodeSnippet.
- **CodeSnippet** — inline, single-line and multi-line, with copy. Developer
  platforms and `ToolCall` payloads both want it.
- **PasswordInput** — reveal toggle whose state is announced.
- **StatusIndicator** — status as shape, icon and text together. The general
  form of what `AgentActivity` already does for agent steps; enterprise tables
  are full of coloured dots that fail WCAG 1.4.1.
- **Banner** — page-level, full-width system notice (maintenance, trial
  ending, read-only mode). `Alert` is inline and scoped to content.
- **InlineLoading** — the pending → success → error state of a submit, in place.
- **NotificationsPanel** — the bell's list: grouped, read/unread, empty state.
- **InlineEdit** — view mode that becomes a field; save, cancel, Escape.
- **SelectableTile** — checkbox and radio semantics on a card-sized target.
- **TruncatedText** — clamps, and exposes the full text to keyboard and
  screen-reader users, not just to hover.
- **Timeline** — the non-agent activity feed: audit logs, record history.
- **Table: expandable rows, sticky header and first column, column resize and
  visibility.** The rest of the enterprise table checklist.
- **AILabel** — marks content as AI-generated, opens an explanation. Carbon ships it
  as the standard marker for AI-generated content; it belongs in IonBase's agentic
  tier and fits its "no claims the system cannot back" rule.
- **ChatMessage** — one turn in a transcript: author, time, content, actions.
  Promotes what `AssistantAnswer` describes into a component.
- **Stack and Grid** — layout primitives. For an agent-first system these matter
  more than for Carbon: an agent composing a screen out of raw flex CSS is where
  token discipline breaks.
- **ThemeZone** — a subtree in the other theme (the dark header on a light
  page). Check how far `data-theme` already goes before building anything.
- **SkipLink** — the first focusable element on every page. Belongs in `PageShell`.

### P2

- **DualListbox** (SLDS dueling picklist, MUI transfer list)
- **TreeGrid** — hierarchical rows in a table. Depends on TreeView and Table work.
- **DateTimePicker** — probably a pattern over `DatePicker` + `TimeField`; decide first.
- **ColorPicker**
- **ProgressRing** — circular determinate progress.
- **Coachmark / guided tour**
- **AppSwitcher** — the grid of products in a suite's header.
- **Calendar**, exported standalone — `Calendar.tsx` already exists internally.
- **SplitPane** — resizable, keyboard-operable divider.

### Patterns to add

A missing pattern is a gap in the same way as a missing component — see
"Patterns" in AGENTS.md. Each needs empty, loading and error states.

- **FullPageError** — 403, 404, 500 and offline.
- **ListDetail** — List or Table beside a SidePanel. The shape of most admin UIs.
- **FilteredDataTable** — extend `DataTable` with filters, search and batch actions
  once the components exist.

### Cross-cutting — enterprise buyers audit these, not just components

- **RTL.** Stylesheets must use logical properties throughout; add an RTL
  toolbar toggle to Storybook so it is checked by eye as well as by lint.
- **Localised strings.** Every string a component renders itself ("Clear",
  "Next page", "Source 1:") must be overridable. Inventory them first.
- **Forced colours.** Some stylesheets handle `forced-colors`, not all. Every
  component that relies on a background or border to be seen needs a rule.
- **Density.** `Table` and `Sidebar` have it; decide whether it is a
  system-wide setting before adding it anywhere else.

---

## 4. Deliberately not planned

| Not building                          | Why                                                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FAB, speed dial, nav rail, bottom bar | Mobile-first Material patterns. Enterprise desktop apps do not use them, and `Header`'s mobile states already cover small screens.                                |
| Carousel                              | Hides content behind interaction and auto-advance is an accessibility failure by default. Nothing in an enterprise workflow needs it.                             |
| Map                                   | A mapping engine is someone else's product, for the same reason charts are visx's.                                                                                |
| Chart components                      | Already decided: IonBase ships helpers and `chart.css` for visx, not wrappers. See AGENTS.md.                                                                     |
| Rich text editor                      | Deferred. An editor engine (Lexical, Tiptap) is a product in itself; if a product needs one, IonBase ships the toolbar and content styles for it, not the engine. |
| Carbon's "Fluid" input variants       | A second visual style for every input doubles the form surface and its Figma sets for one aesthetic choice.                                                       |
| Docked composer, utility bar          | Salesforce-console-specific.                                                                                                                                      |
| Rating                                | Consumer pattern, absent from all three enterprise systems.                                                                                                       |

Reopening one of these needs a product that asks for it, not a gap in a table.

---

## 5. What "done" means for one item

Taken from what `CommandPalette` actually touched in 0.81.0. An item is done when
every line below is true, and not before — "built but not drawn" is how twelve
components ended up stranded in `codeUnmapped`.

1. `src/components/<Name>.tsx`, `src/styles/<name>.css`, exported from `index.ts`.
   Behaviour from react-aria; appearance from tokens only.
2. `meta/<Name>.json` — when to use, what to use instead, anti-patterns, a11y.
3. `apps/storybook/src/stories/<Name>.stories.tsx` with interaction tests for
   keyboard and screen-reader behaviour. Read "hover is a pulse" in AGENTS.md first.
4. Figma: drawn, exported, mapped in `figma/mapping.json` (or in `codeUnmapped`
   with a reason), description applied and countersigned.
5. The relevant pattern in `patterns/` names it, if one does.
6. Used somewhere in `apps/demo`, and covered by its smoke test.
7. `CHANGELOG.md` entry and a minor version bump; `llms.txt` regenerated.
8. `pnpm build && pnpm lint && pnpm typecheck && pnpm format` all green.

One item per PR. Upgrades to an existing component (Menu, Table) follow the same
list, and note in the changelog what an existing caller has to change.
