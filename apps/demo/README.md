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

| Gap                                                                                                                                     | Where it showed up | Stand-in                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| No sequential colour ramp. `chart/1…8` is categorical only.                                                                             | Run heatmap        | `chart/1` at six fixed opacity steps, in [`charts.css`](src/local/charts/charts.css)                                          |
| `chart/1…8` has no dark-mode values in `theme-dark.css`. Readable on the current dark surfaces, but never checked by the contrast gate. | Both charts        | Used as-is                                                                                                                    |
| No chart primitives: axis, gridline and tooltip styling.                                                                                | Success-rate line  | visx, with classes in [`charts.css`](src/local/charts/charts.css)                                                             |
| Setting row: label and description on the left, control on the right, as the SettingsPanel pattern describes.                           | Settings           | [`src/local/SettingRow.tsx`](src/local/SettingRow.tsx)                                                                        |
| No way to present a scripted or recorded agent run. The agentic components render states but nothing drives them.                       | Runs               | [`src/screens/runs/use-run-engine.ts`](src/screens/runs/use-run-engine.ts). Worth considering as a documented pattern helper. |
