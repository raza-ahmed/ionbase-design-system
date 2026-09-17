# Ionbase Ops — demo app

A fictional AI ops console built only from `ionbase-ui` and `ionbase-icons`,
consumed the way an outside app consumes them. Private; never published.
The plan and its decisions are in [docs/demo-app-plan.md](../../docs/demo-app-plan.md).

```bash
pnpm --filter @ionbase-ui/demo dev      # needs ionbase-ui built once: pnpm build
pnpm --filter @ionbase-ui/demo build
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

| Gap                                                                                                                                     | Where it showed up | Stand-in                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| No stat / KPI tile. `FullCard` is a full-bleed text-and-media row, not a metric.                                                        | Overview KPI row   | [`src/local/StatTile.tsx`](src/local/StatTile.tsx)                                   |
| No sequential colour ramp. `chart/1…8` is categorical only.                                                                             | Run heatmap        | `chart/1` at six fixed opacity steps, in [`charts.css`](src/local/charts/charts.css) |
| `chart/1…8` has no dark-mode values in `theme-dark.css`. Readable on the current dark surfaces, but never checked by the contrast gate. | Both charts        | Used as-is                                                                           |
| No chart primitives: axis, gridline and tooltip styling.                                                                                | Success-rate line  | visx, with classes in [`charts.css`](src/local/charts/charts.css)                    |
