# Demo app — IonBase as a real product

_Proposal, 17 Sep 2026. Product story and chart library agreed the same day.
Phases 0–3 done 17 Sep 2026. Phase 4 (ship it) built, awaiting review. After
that the demo grows through the coverage loop in §5._

A showcase dashboard that lives in this repo and consumes `ionbase-ui` and
`ionbase-icons` **exactly as an outside app would**. It has two jobs:

1. **Show the potential.** Storybook shows components one at a time. The demo
   shows them working together as a product, in light and dark.
2. **Be the consumer app this repo does not have.** [`AGENTS.md`](../AGENTS.md)
   records that `no-raw-style-values` has no real target here, because "this repo
   contains no consumer app code". The demo is that code, and it runs every
   shipped guardrail at full strength.

---

## 1. Decisions

| Decision     | Choice                                                                                                 | Why                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product      | **Ionbase Ops** — a fictional AI ops console: agents run jobs, humans approve and watch                | The agent-focused components need a product where they make sense. A generic admin panel would hide them.                                                                           |
| Charts       | [visx](https://airbnb.io/visx) (`@visx/*`, MIT, v4 supports React 19), styled only with IonBase tokens | visx provides unstyled chart building blocks, so IonBase decides every colour and font. See §3.                                                                                     |
| Location     | `apps/demo`, package `@ionbase-ui/demo`, `"private": true`                                             | `apps/*` is already in the workspace. It is never published.                                                                                                                        |
| Stack        | Vite + React 19 + TypeScript (strict, ESM)                                                             | Vite is already in the tree through Storybook. No Next.js — a static SPA is enough and deploys to Pages.                                                                            |
| Dependencies | `ionbase-ui: workspace:*`, `ionbase-icons: workspace:*`                                                | Same link Storybook uses: it builds against `dist`, so it tests what ships.                                                                                                         |
| Imports      | **Public exports only** — no `ionbase-ui/src/...`, no alias to source                                  | If the demo needs a deep import, the package is missing an export. Log it as a gap; don't work around it.                                                                           |
| Styling      | `import 'ionbase-ui/styles'` plus a small layout CSS file that uses tokens only                        | Linted by `ionbase-ui/stylelint-config`. A hex or raw px value in the demo fails the build.                                                                                         |
| Lint         | All 5 `ionbase-ui/eslint-plugin` rules turned **on**, none turned off                                  | This fills the dogfooding gap described in `AGENTS.md`.                                                                                                                             |
| Routing      | Hash routing (`#/runs`); router library only if it earns its place                                     | GitHub Pages has no SPA fallback, so a path route that is refreshed returns 404.                                                                                                    |
| Data         | Typed local fixtures behind a fake async API with added latency                                        | Makes loading, empty and error states real rather than faked in JSX.                                                                                                                |
| Theme        | Toggle writes `data-theme="dark"` on `<html>`                                                          | This is the selector the token CSS already uses (`theme-dark.css`).                                                                                                                 |
| Hosting      | Same GitHub Pages deploy, served at `<pages>/demo/`                                                    | A repo gets one Pages site. The demo builds into `storybook-static/demo/` before the upload. Vite `base` comes from an env var, following Storybook's `STORYBOOK_BASE_PATH` lesson. |

---

## 2. Screens are patterns, not inventions

`packages/ionbase-ui/patterns/*.json` already describes how components should be
composed. **Each demo screen is an implementation of one or more patterns.** The
demo does not invent layouts the system has no opinion about. Each screen must
cover the pattern's `loading`, `empty` and `error` states, and `partial` where it
applies.

| Screen                      | Pattern(s)                        | Components on show                                                                                                                                                                                                                               |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App shell (all screens)     | `PageShell`                       | Header, Sidebar, SidebarSection, SidebarItem, Logo/LogoMark, Avatar, MenuTrigger + Menu (workspace switcher), PageHeader + Breadcrumb, Drawer (mobile nav), ToastProvider, Tooltip, CommandPalette + Kbd (⌘K)                                    |
| **Overview**                | `PageShell`                       | StatTile (local stand-in for KPI tiles), Badge, ProgressBar, Skeleton, Alert, DateRangePicker, Tabs, plus visx charts: run heatmap (weekday × hour) and a success-rate line                                                                      |
| **Agents**                  | `DataTable`, `DestructiveConfirm` | Table (sortable headers via `useTableSort`), Pagination, Select and MultiSelect filters, TagGroup (active filters), Checkbox (bulk select), Toolbar (bulk actions), Menu, Modal, EmptyState, Toast                                               |
| **New agent** (from Agents) | `Wizard`, `Form`                  | Input, Textarea, PhoneInput, Radio, Checkbox, CheckboxGroup, Fieldset, DescriptionList (review step), DatePicker, TimeField, FileUpload, Button, ProgressBar                                                                                     |
| **Settings**                | `SettingsPanel`                   | Toggle, Select, RadioGroup, CheckboxGroup, Toggletip, Accordion, Divider, Link, Popover                                                                                                                                                          |
| **Agent detail**            | `PageShell`                       | NavItem (`isCurrent` section switcher), FullCard, Card, Badge, Button, StatGroup/StatTile, Table, EmptyState, DescriptionList (the agent's facts), TreeView (knowledge sources), plus a visx stacked bar chart with ChartLegend and ChartTooltip |
| **Agent runs**              | `AgentRun`, `HumanApproval`       | AgentActivity, AgentStop, ApprovalGate, ConfidenceIndicator, Spinner, StreamingText, Slider (history's duration range), SidePanel + SidePanelLayout (a run's details beside the history), List (the "Waiting for you" approval queue)            |
| **Assistant**               | `AssistantAnswer`                 | StreamingText, Citation, ConfidenceIndicator, Textarea, ScrollProgress                                                                                                                                                                           |

The last two screens make the pitch. Most design systems can draw a table. Few
can show an agent asking for approval before it acts.

### A demo control bar

A small, clearly separate toolbar (not part of the "product") to:

- switch theme (light / dark)
- force a screen's state: `live · loading · empty · error · partial`
- set fake latency (0 / 800ms / 3s)

This lets you step through every state during a live demo without editing code.
It also makes the states visible to screenshots and tests.

---

## 3. What the demo will not do

- **No chart styling of its own.** IonBase has no chart component. visx draws the
  shapes, and every colour and font comes from IonBase tokens. Chart wrappers live
  in `src/local/charts/` and are logged on the gap list (§5), because they are
  the first version of a future chart layer in IonBase. Traps to plan for:
  - **Use CSS variables through `style` or `className`, not the SVG `fill`
    attribute.** Browsers do not reliably resolve `var()` inside SVG
    presentation attributes.
  - **Map heatmap colours to fixed steps, not a smooth colour scale.** A visx
    colour scale works out in-between values in JavaScript, and it cannot do that
    with `var(--…)` strings. Use 5–7 bins, each mapped to a token, and they
    switch with dark mode for free. `ionbase-ui/tokens-js` gives light-mode
    values only, so using it here would break dark mode.
  - **Use `useParentSize`, not `<ParentSize>`.** In visx 4, `ParentSize`
    draws its children inside an absolutely positioned box. A container with no
    fixed height clips the chart to nothing, with no error.
  - **Put a hidden data table inside a `.ion-visually-hidden` wrapper, not on
    the `<table>`.** A table cannot shrink below its content, so a 24-column
    table with the class on it scrolled the mobile page sideways by 882px.
  - **Charts need a text alternative.** Each chart gets a visually hidden table
    or summary. Tooltips need keyboard focus, not just hover.
- **No backend, no auth.** Fixtures only.
- **No demo-only components that should be system components.** If a screen needs
  a reusable piece the system does not ship (stat tile, sidebar, page header),
  build it locally in `apps/demo/src/local/` and **log it** — that folder is the
  candidate list for new `ionbase-ui` components.

---

## 4. Phases

| Phase                   | Scope                                                                                                                                                                                                       | Done when                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **0. Scaffold**         | `apps/demo` with Vite, tsconfig extending `tsconfig.base.json`, ESLint (all 5 rules on) + stylelint config, `dev`/`build`/`typecheck`/`lint`/`format` scripts, Turbo picks it up                            | `pnpm build lint typecheck format` all green with an empty page on the screen          |
| **1. Shell + Overview** | `PageShell`, theme toggle, hash routing, fixture API, Overview screen with all three states, control bar                                                                                                    | Overview works on mobile and desktop, in light and dark, and every state can be forced |
| **2. Classic screens**  | Agents (`DataTable` + `DestructiveConfirm`), New agent (`Wizard` + `Form`), Settings                                                                                                                        | Every component in `forms` and `navigation` appears on at least one screen             |
| **3. Agentic screens**  | Agent runs, Assistant                                                                                                                                                                                       | A scripted run streams steps, stops for approval, and completes or is cancelled        |
| **4. Ship it**          | CI builds the demo, Pages deploy copies it to `/demo/`, Storybook and README link to it, and a Playwright smoke test opens each route in both themes and checks for no console errors and no axe violations | The demo URL is live from `main`, and a PR that breaks the demo fails CI               |

Phases 0–1 are the smallest version worth showing. 2 and 3 can happen in either
order.

---

## 5. Keeping it growing — the component coverage check

As the system grows, the demo should not quietly fall behind. Add a script,
`apps/demo/scripts/verify-coverage.mjs`, that:

1. reads `ionbase-ui/meta/index` (the component list already published), and
2. greps `apps/demo/src` for imports of each component, then
3. prints which components are **shown** and which are **not shown yet**, and exits non-zero only
   for components on an explicit `required` list.

It reports rather than fails by default, so a new component can ship before it
has a demo home. The list of what is missing is visible on every run, though.
That is the "keep adding" loop:

```
new component lands in ionbase-ui
  → coverage script lists it as "not shown"
  → pick the screen (or pattern) it belongs to
  → add it, with its states
  → anything hand-built in src/local/ is a candidate for the next component
```

Keep a short `apps/demo/README.md` with a **gap list**: missing exports, local
stand-ins and chart needs. It is the demo's feedback to the design system.

---

## 6. Open questions

| Question                                                                                            | Default if unanswered         |
| --------------------------------------------------------------------------------------------------- | ----------------------------- |
| Should the demo also be an eval target (an agent builds a screen from the patterns and we diff it)? | Later — after phase 4         |
| Separate Pages path (`/demo/`) or its own domain?                                                   | `/demo/` on the existing site |
