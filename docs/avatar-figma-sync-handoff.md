# Handoff — Avatar + Avatar Gradient Figma sync (2026-08-27)

Working notes for whoever finishes this, human or agent. Read
[AGENTS.md](../AGENTS.md) first; this file only carries what is specific to this
piece of work and is **not** derivable from the repo.

Delete this file when the work lands.

---

## What Figma changed

Re-exported on 2026-08-27 with `packages/ionbase-ui/figma/export-components.js`
(run through the `use_figma` MCP tool against file `gaLbGd0QNb1fUl6BjSpfBA`).
Three changes on the `Avatar` page, only two of which were asked for:

1. **`Avatar` (74:164)** gained three booleans: `Show Ring#1009:0`,
   `Show Top Indicator#1009:25`, `Show Bottom Indicator#1009:50`.
2. **`Avatar Gradient` (1054:305)** — new set. `Color` × `Size`, initials only.
3. **`Status Indicator` (1008:1764)** — new set. This is the component the two
   Avatar indicators are instances of. Nothing else in Figma uses it.

`figma/components.json` is committed as of 2026-08-21 and is therefore **stale**.
The fresh export is in [the appendix below](#appendix--fresh-components-json-entries);
it must be written over that file, because `scripts/verify-figma-map.mjs` reads
it as one of its two sides.

---

## Measurements taken from Figma

Everything below came out of `get_design_context` on the three nodes. It is
recorded here so the work does not need a second round of MCP calls.

### Avatar — ring

Same size as the avatar, drawn INSIDE its edge, over the media.

| size | ring width | colour |
| --- | --- | --- |
| lg 48 | `--border-width-thick` | `--surface-primary` |
| md 40 | `--border-width-thick` | `--surface-primary` |
| sm 32 | `--border-width-default` | `--surface-primary` |
| mini 24 | `--border-width-default` | `--surface-primary` |

### Avatar — indicators

Both flush in a corner (`right: 0`; top indicator `top: 0`, bottom
`bottom: 0`). Figma writes the offset as `left = size − indicator`, which is the
same thing. Border is `--ring-offset`.

| size | dot | border | glyph |
| --- | --- | --- | --- |
| lg 48 | 16 (`--spacing-16`) | 2px | 11px |
| md 40 | 14 (`--spacing-14`) | **1.5px** | 10px |
| sm 32 | 12 (`--spacing-12`) | 1px | 8px |
| mini 24 | 8 (`--spacing-8`) | 1px | 6px |

1.5px has no token and cannot get one — the border ladder is 1 / 2 / 4. The
glyph sizes are not on the icon ladder either, and 6px is below anything
`--icon-size-*` carries. Both are written as component locals with a comment.

In the Figma file the top indicator is `Status Indicator` at `Intent=Primary`
with its check glyph; the bottom is `Intent=Success` with `Show Icon` off.

### Status Indicator — intents

`neutral → --surface-inverse`, `primary → --surface-primary`,
`success → --surface-success`, `warning → --surface-warning`,
`error → --surface-error`, `information → --surface-information`.
Glyph is white; use `--text-on-color`.

### Avatar — two corrections nobody would have spotted

Both were wrong in the committed CSS and are one token away from something
plausible, which is exactly why they survived:

- **Large initials** used `--type-h5` (20/28). Figma applies Body/Large
  Emphasis, which is `--type-body-lg` (20/**32**). Same size, four pixels of
  leading apart.
- **Mini initials** used `--font-weight-medium`. Figma's Mini is the Caption
  style — `--font-weight-regular`. Every other size stays medium.

Also: `Type=Image` sits on `--surface-placeholder` behind `--border-subtle`,
where Character and Icon sit on `--surface-muted` behind `--border-strong`. The
old CSS gave all three the muted pair.

### Avatar Gradient

Circle only — Figma has no `Shape` axis on this set. Sizes are Avatar's four,
and the type ramp is Avatar's (including regular weight at Mini).

Every gradient is a `--color-<hue>-500` → `--color-<hue>-600` pair, which is
worth noticing: nothing here needs a new token.

| Color | from (0%) | to (100%) |
| --- | --- | --- |
| slate | `--color-gray-500` | `--color-gray-600` |
| blue | `--color-blue-500` | `--color-blue-600` |
| violet | `--color-purple-500` | `--color-purple-600` |
| pink | `--color-pink-500` | `--color-pink-600` |
| orange | `--color-orange-500` | `--color-orange-600` |
| green | `--color-green-500` | `--color-green-600` |
| red | `--color-red-500` | `--color-red-600` |
| light | `--color-gray-100` | `--color-gray-200` |

The gradient is `linear-gradient(180deg, from 0%, MID 60%, to 100%)` where MID
is the arithmetic midpoint of the two — so `color-mix(in srgb, from, to)`, which
is also the only way to express it without a raw hex that `color-no-hex` would
reject. The 60% stop position is what makes this different from a plain two-stop
gradient; do not "simplify" it away.

Over that sits a white radial sheen, identical in proportion at all four sizes:

```
radial-gradient(55.556% 64.103% at 50% 70.513%,
  rgb(255 255 255 / 18%) 0%,
  rgb(255 255 255 / 3.6%) 60%,
  rgb(255 255 255 / 0%) 100%)
```

`light` uses 32% / 6.4% instead of 18% / 3.6%.

Elevation, all four sizes derived from the box (`S` = the size):

```
inset 0 calc(-1 * S / 24) calc(S / 12)      0 rgb(0 0 0 / 12%),
inset 0 calc(S / 48)      calc(S / 48 * 1.4) 0 rgb(255 255 255 / 24%),
0      calc(S / 16)       calc(S / 6)        0 rgb(13 15 23 / 12%)
```

`light` uses 5% and 50% for the two inset colours. These must live in a
component-local custom property: `declaration-property-value-disallowed-list`
bans a raw colour inside a `box-shadow` declaration, and the point of that rule
is that a raw colour is a place dark mode gets fixed by hand — one named local
is one such place, which is the honest reading. `--ion-avatar-gradient-*` is the
prefix, matching `--ion-radio-raised` and friends.

Text is `--color-base-white` on the seven colours, `--text-default` on `light`.
**Not `--text-on-color`**: that flips to `#000000` in the dark theme, while the
gradient itself is built from primitives and does not theme. A surface that does
not theme needs a foreground that does not theme.

---

## KNOWN PROBLEM — read before running the contrast gate

`scripts/verify-contrast.mjs` pairs the `color` and `background-color` a rule
declares. Avatar Gradient must declare `background-color: var(--ion-avatar-gradient-from)`
— both as the honest worst case for the gate (the `500` end is the lightest part
of the gradient, so it is where white text is hardest to read) and as a fallback
if `background-image` never paints.

Doing that is expected to **fail the 4.5:1 gate on four of the eight colours**.
Hand-calculated, unverified — the gate's numbers are the ones that count:

| colour | white on the 500 stop | verdict |
| --- | --- | --- |
| violet | ~6.2 | passes |
| slate | ~4.9 | passes |
| blue | ~4.6 | passes |
| red | ~3.8 | **fails** |
| green | ~3.7 | **fails** |
| pink | ~3.5 | **fails** |
| orange | ~3.5 | **fails** |

Checking the midpoint rather than the top stop does not rescue them — pink still
lands near 3.8 where the initials actually sit.

**This is a Figma-side defect, not a code one, and it should not be papered
over.** The repo already has the mechanism: add each failure to
`contrast-exceptions.json` under `accepted` with `"kind": "defect"`, a reason,
and `"affects": ["AvatarGradient"]`. That keeps the build green, keeps the gate
reporting them, and copies them into the component's `a11y.knownIssues` so a
consumer is told before they ship it. Add **only** the pairs the gate actually
reports — an exception that no longer fails is itself an error.

Then surface it to Ahmed. The real fix is in Figma: darken the gradient
endpoints, or drop the white initials for a darker foreground on the four
colours that fail.

---

## What is done

Committed on this branch, complete and self-consistent, but **not yet built or
linted** — no gate has run over any of it:

- `packages/ionbase-ui/src/components/Avatar.tsx` — `ring`, `topIndicator`,
  `topIndicatorIcon`, `topIndicatorLabel`, `bottomIndicator`,
  `bottomIndicatorLabel`, plus the `AvatarIndicatorIntent` union. The media is
  now a `.ion-avatar__media` child; see the comment in the file for why the root
  cannot be the box that clips.
- `packages/ionbase-ui/src/styles/avatar.css` — rewritten for the above and for
  the three corrections.

### The one subtle bit in Avatar.tsx

Where an indicator's accessible name goes depends on whether there is an image,
and that is not an inconsistency:

- **No image** → the root takes `role="img"`, which makes it a leaf for
  assistive tech. Nothing inside is exposed, so the indicator names are folded
  into the root's `aria-label`.
- **Image** → the root has no role and the `<img>` carries the name, so each
  indicator can hold its own `.ion-visually-hidden` text.

---

## What is left

1. `src/components/AvatarGradient.tsx` — `size`, `color`, `initials`, `alt`.
   Circle only. Follow Avatar's `role="img"` + `aria-label` handling.
2. `src/styles/avatar-gradient.css` — per the measurements above.
3. Export from `src/components/index.ts`; `@import` in `src/styles/index.css`.
4. `meta/AvatarGradient.json` (intent only — `props`, `tokens`, `stylesheet`,
   `source`, `import`, `name`, `propsType` are generated and `verify-meta.mjs`
   rejects an intent file that sets them). Update `meta/Avatar.json` for the ring
   and indicators.
5. Write the fresh export over `figma/components.json`.
6. `figma/mapping.json`:
   - `Avatar`: map the three new booleans onto the new props.
   - `Avatar Gradient`: new entry → `AvatarGradient`. `Color` and `Size` are
     value maps; `Initials#1054:32` → `initials`.
   - `Status Indicator`: add to **`unmapped`** with a reason. It is Avatar's
     indicator part and nothing else composes it — the same call `Line`,
     `Progress` and `Progress Heading` get for being internal to ScrollProgress.
     Leaving it out fails check 9.
7. Storybook: new Avatar stories for ring and indicators; a new
   `AvatarGradient.stories.tsx`. Follow the existing file's habit of `play`
   functions that assert real geometry against Figma's numbers.
   **Watch the existing `RenderedGeometryMatchesFigma` story** — it reads
   `borderRadius` off the element `getByLabelText` returns, which is the root.
   The root deliberately keeps its radius, so this should still pass; if it does
   not, fix the CSS rather than the assertion.
8. Bump `packages/ionbase-ui/package.json` to `0.27.0` (new component, new
   props, no breaking API change).
9. Run every gate: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format`.
   All four must pass. `pnpm format` only checks — fix with
   `pnpm exec prettier --write <paths>` inside the package.

Do **not** run `figma/apply-descriptions.js` or anything else that writes back to
Figma. That is a separate, deliberate step and it is not part of this task.

---

## Appendix — fresh components.json entries

The full re-export is large; these are the three entries that differ from the
committed file. Everything else in the export was byte-identical apart from the
`exported` date, which becomes `2026-08-27`. Re-run
`figma/export-components.js` through `use_figma` if you want the whole file
rather than patching it — that is the supported path and it is cheap.

```json
"Avatar": {
  "page": "Avatar",
  "id": "74:164",
  "kind": "SET",
  "props": {
    "Icon#74:50": { "type": "INSTANCE_SWAP" },
    "Initials#74:25": { "type": "TEXT" },
    "Shape": { "type": "VARIANT", "options": ["Circle", "Square"], "default": "Circle" },
    "Show Bottom Indicator#1009:50": { "type": "BOOLEAN" },
    "Show Ring#1009:0": { "type": "BOOLEAN" },
    "Show Top Indicator#1009:25": { "type": "BOOLEAN" },
    "Size": { "type": "VARIANT", "options": ["Large", "Medium", "Small", "Mini"], "default": "Large" },
    "Type": { "type": "VARIANT", "options": ["Character", "Image", "Icon"], "default": "Icon" }
  }
},
"Avatar Gradient": {
  "page": "Avatar",
  "id": "1054:305",
  "kind": "SET",
  "props": {
    "Color": { "type": "VARIANT", "options": ["Slate", "Blue", "Violet", "Pink", "Orange", "Green", "Red", "Light"], "default": "Slate" },
    "Initials#1054:32": { "type": "TEXT" },
    "Size": { "type": "VARIANT", "options": ["Large", "Medium", "Small", "Mini"], "default": "Large" }
  }
},
"Status Indicator": {
  "page": "Avatar",
  "id": "1008:1764",
  "kind": "SET",
  "props": {
    "Intent": { "type": "VARIANT", "options": ["Neutral", "Primary", "Success", "Warning", "Error", "Information"], "default": "Neutral" },
    "Show Icon#1008:48": { "type": "BOOLEAN" },
    "Size": { "type": "VARIANT", "options": ["Large", "Medium", "Small", "Mini"], "default": "Large" },
    "Swap Icon#1008:49": { "type": "INSTANCE_SWAP" }
  }
}
```
