# Ionbase Ops — demo app

A fictional AI ops console built only from `ionbase-ui` and `ionbase-icons`,
consumed the way an outside app consumes them. Private; never published, but deployed with Storybook at
[raza-ahmed.github.io/ionbase-design-system/demo/](https://raza-ahmed.github.io/ionbase-design-system/demo/).
The plan and its decisions are in [docs/demo-app-plan.md](../../docs/demo-app-plan.md).

```bash
pnpm --filter @ionbase-ui/demo dev      # needs ionbase-ui built once: pnpm build
pnpm --filter @ionbase-ui/demo build
pnpm --filter @ionbase-ui/demo coverage # which components the demo shows, and which it doesn't yet
pnpm --filter @ionbase-ui/demo test:smoke # every route × theme in Chromium: errors, axe, sideways scroll (needs a build)
```

## Rules

- Public exports only. A deep import into `ionbase-ui` means the package is
  missing an export — log it below, don't work around it.
- All five `ionbase-ui/eslint-plugin` rules and the shipped stylelint config are
  on. Fix the code, never the config.
- Anything reusable the system does not ship goes in `src/local/` and on the gap
  list.

## Gap list

What the demo needed that IonBase does not provide. This is the demo's feedback
to the design system.

**Empty.** Every gap the demo found has been answered by the system: table
scrolling, toast naming and scroll-progress placement (0.70), StatTile
(0.71), SettingRow (0.72), themed chart colours and a sequential ramp (0.73),
chart styling for visx (0.74), and `useAgentRun` for driving a run (0.75).
Add a row here — `| Gap | Where it showed up | Stand-in |` — when the next one
turns up.
