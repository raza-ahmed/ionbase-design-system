# Open items — checklist

> **Live document, and temporary.** This lists what is still open across the
> plans in `docs/` after the enterprise checklist closed at 0.134.0. Each item
> links to the plan that explains it. Read the item there before you start it.
>
> **How to use it**
>
> 1. Take the first unchecked item. Items marked _needs_ wait for the item
>    they name.
> 2. Do each item on its own branch and PR. In that same PR, tick the box and
>    add the version or PR it shipped in: `- [x] **Raw ms gate** — 0.135.0`.
> 3. If an item turns out to be the wrong thing, strike it through and give
>    the reason. Don't delete it:
>    `- [x] ~~**Asymmetric hover**~~ — not worth it, see motion-system §6`.
> 4. In the same PR, update the plan the item came from, so the plan records
>    what happened, not this file.
>
> **When every box is ticked**, delete this file and remove its pointer from
> AGENTS.md.

---

## 1. Tidy the docs — no code

- [x] **Bring the plans' status lines up to date** — PR #99. The demo plan's
      header and its `/demo/` question; in the agent-readiness plan, the
      header, the Phase 1 and 2c notes on Dark and `knownIssues`, and Phase 5's
      "no model has generated anything", which was stale since the 14 Sep run.

## 2. Motion — [`motion-system.md`](motion-system.md) §6

- [x] **Button's Figma prototype reaction** — PR #100. It now reads 200ms
      `cubic-bezier(0.2, 0, 0, 1)`, the code's `base` + `out`, on Small,
      Medium and the one instance that inherits it. Nav Item's hover swap,
      which had no transition, got the same.
- [x] **Raw `ms` gate** — 0.135.0. A published stylelint rule: no `ms` or
      `s` in `transition*` / `animation*`. It found 14 raw durations, a new
      `cycle` rung for loops, and Spinner and ProgressBar stopping dead under
      reduced motion since 0.55.0.
- [x] **Take `box-shadow` off Button's transition** — 0.136.0. Measured
      first: the shadow mostly never animated, because its layers don't pair,
      and the three cases that did were accidental morphs. Chosen: it snaps
      everywhere, rather than adding a crossfade Figma doesn't draw.
- [x] ~~**Asymmetric hover, enter vs leave**~~ — declined. Figma's hover
      reactions now match the code's single curve, and it would touch 30
      stylesheets for a small gain. See motion-system §6.
- [x] **Hover with no transition** — 0.137.0. The rule chosen: the
      pointer's hover fades; a highlight the keys move snaps. 16 of the 18
      now fade their hover. CommandPalette's row is moved by the keys, so it
      stays instant. NotificationsPanel only underlines, and an underline
      can't fade. Menu's highlight moves with the keys, so it stopped
      fading.

## 3. Agent readiness — [`agent-readiness-plan.md`](agent-readiness-plan.md)

- [x] **Phase 5: a clean run** — finished 5 Oct 2026, 279 cells, with no
      repo access (harness fixed in #105).
  - Q1: the contracts beat the README on 27 tasks and lose on none.
  - Q3: keep the inherited props. Without them, `spellCheck` (typed
    `string`) is written as a boolean and fails to compile.
  - Q2 was not re-run.
- [x] **Fix the package README's quick start** — 0.137.1. It now reads
      `<Button variant="primary-brand">`. A new build gate, `verify-readme`,
      checks every IonBase prop and value in the README's code against the
      contracts.
- [x] **Document `useToast()`'s return** — 0.137.1. Both Toast's and
      ToastProvider's contracts now say it returns `{ toast, dismiss }`, and
      list guessing `show` or `success` as an anti-pattern.
- [ ] **4a: a worked TSX example per pattern**, 6 patterns. The plan says
      it's worth building only if the eval shows it helps. _Needs_ Phase 5.
      Without the run, you choose.
- [ ] **Demo as an eval target.** An agent builds a demo screen from the
      patterns, and we diff the result against the real screen
      ([`demo-app-plan.md`](demo-app-plan.md) §6, "later — after phase 4",
      and phase 4 is done). _Needs_ Phase 5.

## Parked — not to be done now

These have a reason to wait and are not in the count above. Don't tick them;
move one up into a section if its condition is met.

- **Condition / expression builder**: wait until a product asks for one.
  [`enterprise-components.md`](enterprise-components.md) P2.
- **3c, an MCP server**: build it only if 3a turns out not to be enough.
  [`agent-readiness-plan.md`](agent-readiness-plan.md).
