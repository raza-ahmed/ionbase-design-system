# Drop the source SVGs here

One file per icon, flat — no subdirectories. This directory is the **source of
truth**; everything in `src/` is generated from it and is gitignored.

    packages/ionbase-icons/svg/
      arrow-right.svg
      chevron-down.svg
      copy.svg
      ...

## Naming

**kebab-case, matching the icon's id.** The filename is the only place the name
is stated — the generator derives both the module path and the exported
component name from it:

    copy.svg            ->  ionbase-icons/icons/copy      export const Copy
    arrow-right.svg     ->  ionbase-icons/icons/arrow-right   export const ArrowRight
    a-arrow-down.svg    ->  ionbase-icons/icons/a-arrow-down  export const AArrowDown

So `Copy.svg`, `copy_icon.svg` and `copy 2.svg` are all wrong. The generator
rejects anything that is not `^[a-z0-9]+(-[a-z0-9]+)*\.svg$` rather than
guessing, because a silently renamed icon is a broken import for a consumer.

## What the generator does to each file

It does **not** trust the source markup:

- `width` / `height` attributes are dropped. Size comes from CSS or from the
  `Icon` wrapper, never baked into the component.
- `viewBox` is kept exactly as authored. A mixed set still works, but see below.
- Hardcoded colours (`#000`, `black`, `rgb(...)`) become `currentColor`, so an
  icon inherits the text colour it sits in and themes for free.
- `<title>`, `<desc>`, `<!-- comments -->`, editor cruft (`id`, `class`,
  `data-name`, `xmlns:*`, Sketch/Figma/Illustrator attributes) are stripped.
- Everything else — paths, groups, `stroke-width`, `stroke-linecap`,
  `fill-rule` — is preserved verbatim.

## Before you drop 1753 files, run the audit

    pnpm --filter ionbase-icons icons:audit

It reads this directory and reports the things that decide how the generator
must behave, none of which are safe to assume:

- **viewBox consistency.** A set that mixes 24×24 and 16×16 cannot share one
  size convention — the same `size="md"` would render two different optical
  weights.
- **stroke-based vs fill-based.** These need opposite `currentColor` handling.
  A set with both needs the distinction recorded per icon, not guessed.
- **stroke-width spread.** Stroke icons that disagree on weight will not look
  like one family however they are sized.
- **name collisions** after kebab-case normalisation, and names that collide
  with JS reserved words once PascalCased.

Fix what it reports, then generate. It is much cheaper to correct 1753 files
before they become 1753 committed components.
