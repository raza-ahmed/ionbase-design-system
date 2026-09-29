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
- [ ] **Take `box-shadow` off Button's transition.** Move the elevation onto
      a `::before` and animate only its `opacity`. That lets the compositor
      handle it instead of repainting a four-layer shadow on every frame.
- [ ] **Asymmetric hover, enter vs leave.** Faster in, gentler out. Build
      it, about three lines per component, or strike it with a reason.

## 3. Agent readiness — [`agent-readiness-plan.md`](agent-readiness-plan.md)

- [ ] **Phase 5: settle what the first run left open.** The 14 Sep run
      answered questions 1 and 2: the contracts beat the README, and the rules
      brief added nothing. Still open: question 3 (does trimming the inherited
      ARIA props help?) and how big the gaps really are, since each cell ran
      once. Re-run with `--samples N` through `--provider claude-cli`, which
      needs no API key but does use model time, so it's your call. Also:
      a quarter to a third of every pack fails `tsc`.
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
