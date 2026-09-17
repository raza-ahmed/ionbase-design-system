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

| Gap        | Where it showed up | Stand-in |
| ---------- | ------------------ | -------- |
| _none yet_ |                    |          |
