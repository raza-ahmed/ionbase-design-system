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

- [ ] **Bring the plans' status lines up to date.** Docs only:
  - [`demo-app-plan.md`](demo-app-plan.md): the header says Phase 4 is
    "awaiting review", but the demo is live and smoke-tested in CI.
  - `demo-app-plan.md` §6: close the `/demo/` vs own-domain question on its
    default, `/demo/`, which is what shipped.
  - [`agent-readiness-plan.md`](agent-readiness-plan.md) Phase 1 "Still open":
    it says `knownIssues` is empty and `surface/information` is unused. Both
    stopped being true when Phase 2c filled the field and Alert `solid`
    started using the token. Point the note at 2c.

## 2. Motion — [`motion-system.md`](motion-system.md) §6

- [ ] **Button's Figma prototype reaction.** Figma says 300ms Ease In; the
      code says 200ms ease-out. Change the reaction to match the code (or
      delete it) so nobody takes the timing from Figma again.
- [ ] **Raw `ms` gate.** A build gate or stylelint rule that fails on a
      raw `ms` value in a component stylesheet. It allows the timing tokens
      and the `0.01ms` reduced-motion values. Colour and geometry already
      have gates; motion doesn't.
- [ ] **Take `box-shadow` off Button's transition.** Move the elevation onto
      a `::before` and animate only its `opacity`. That lets the compositor
      handle it instead of repainting a four-layer shadow on every frame.
- [ ] **Asymmetric hover, enter vs leave.** Faster in, gentler out. Build
      it, about three lines per component, or strike it with a reason.

## 3. Agent readiness — [`agent-readiness-plan.md`](agent-readiness-plan.md)

- [ ] **Phase 5: run the real A/B test.** A model generates against the
      contract pack and against the README, and the results are compared.
      The harness is built; only the two fixtures have run. It needs
      `--provider api`, an API key and some spend, so it's your call. It
      settles the four questions in "What a real run should settle".
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
- **Dark theme contrast defects**: deferred until the Dark theme is settled
  in Figma; see AGENTS.md.
