# @ionbase/icons

The IonBase icon set is **Lucide**.

The 1,753 components on the Figma "Icons- Lucide" page are the stock Lucide set,
unmodified. So this package does **not** export icons — `lucide-react` already
ships every one, tree-shakeable, versioned and maintained. Re-exporting them from
Figma would be slower, produce worse markup, and permanently fork us from
upstream fixes.

What this package owns is how an icon is _used_.

## Usage

```tsx
import { Plus } from 'lucide-react';
import { Icon } from '@ionbase/icons';

<Icon as={Plus} size="sm" />              // 16px, decorative (aria-hidden)
<Icon as={Plus} label="Add item" />       // meaningful: role=img + aria-label
<Icon as={Plus} />                        // 1em — scales with surrounding text
```

The icon is passed as a prop rather than imported from here, because a barrel
re-exporting 1,753 icons defeats tree-shaking in several bundlers. Importing
straight from `lucide-react` means only the icons you use are bundled.

**Colour is never set** — `currentColor` makes an icon take the text colour it
sits in, so it themes with no icon-specific tokens.

`size` accepts `sm` (16) or `md` (24) — the only two sizes the Figma components
actually use — or any CSS length. A third named size is a design decision that
belongs in Figma as a token, not a number invented in code.

## Keeping Figma and Lucide in sync

```bash
# 1. run figma/export-icon-names.js in Figma via use_figma
# 2. compare against the installed lucide-react:
pnpm --filter @ionbase/icons icons:verify -- --expect <count> <checksum>
```

It compares checksums rather than moving 1,753 names, and reports the _direction_
of any gap, which is what decides whether it matters:

- **lucide has more than Figma** — the Figma page predates the installed release.
  Engineers can import icons with no counterpart in the design file. Low risk.
- **Figma has more than lucide** — the dangerous direction. A designer can
  specify an icon that cannot be imported at all. Upgrade `lucide-react`.

### Current state — 2026-07-28

|                     | Count | Checksum     |
| ------------------- | ----- | ------------ |
| Figma page          | 1,753 | `188846777`  |
| lucide-react 1.27.0 | 1,999 | `3699673232` |

**246 icons exist in lucide-react but not in Figma.** The Figma page was imported
from an older Lucide release. This is the low-risk direction and nothing is
blocked — re-import the Lucide Figma kit when convenient.

The Figma layers are named `Icons/ a-arrow-down 1`; the leading space and ` 1`
suffix are bulk-import artifacts and are stripped during comparison. Worth
cleaning up whenever the page is re-imported.
