/**
 * `pnpm tokens:help` — the map, for anyone who lands in this package without
 * context.
 *
 * Half of this workflow runs inside Figma and is therefore invisible in
 * package.json, which is the whole reason this exists.
 */
const cmd = (c, what) => `  ${c.padEnd(38)} ${what}`;

console.log(`
@ionbase-ui/tokens — Figma owns token names and values. This repo does not.
Full guide: packages/tokens/README.md     Figma file: gaLbGd0QNb1fUl6BjSpfBA

NODE SIDE (runs here)
${cmd('pnpm build', 'dtcg -> audit -> verify -> css -> ts -> tsc')}
${cmd('pnpm tokens:audit', 'names parse against the naming-spec grammar')}
${cmd('pnpm tokens:verify', 'codeSyntax.WEB matches the token path')}
${cmd('pnpm tokens:renames', 'DRY RUN a rename map — required before Figma')}
${cmd('pnpm tokens:sync -- --expect <n> <sum>', 'repo still matches Figma')}

FIGMA SIDE (paste into use_figma, with the file open in Figma desktop)
${cmd('figma/export-variables.js', 'dump one collection -> src/figma/<name>.json')}
${cmd('figma/checksum.js', 'count + checksum, feed to tokens:sync')}
${cmd('figma/apply-renames.js', 'rename / delete variables')}
${cmd('figma/resync-code-syntax.js', 'rewrite codeSyntax from token paths')}

TASK — re-export after changing variables in Figma
  1. figma/export-variables.js, once per collection (set COLLECTION at the top),
     saving each result over src/figma/<collection>.json verbatim
  2. figma/checksum.js  ->  pnpm tokens:sync -- --expect <count> <names> <values>
     Both hashes. The name hash cannot see an edited colour; the value hash is
     the one that catches drift, and the two-arg form is refused.
  3. pnpm build
  A mismatch at step 2 means the export is incomplete. Do not build on it.

TASK — rename tokens
  1. edit renames.json
  2. pnpm tokens:renames        must print "Clean. Safe to apply to Figma."
  3. figma/apply-renames.js     never before step 2 passes
  4. node scripts/apply-renames-local.mjs
     pnpm tokens:sync -- --expect <count> <names> <values>
  5. pnpm build, then empty renames.json

  A bad rename map cannot be undone — the old names stop existing. Step 2 is
  what makes step 3 safe.

GOTCHAS
  · A name can be both a token and a folder (bg/brand is a variable AND the
    parent of bg/brand/hover). Those leaves live under a DEFAULT child in DTCG
    and the segment is stripped for CSS. It must never reach CSS.
  · codeSyntax is what Dev Mode shows and it can be wrong. CSS is generated from
    the token path; the two agreeing is a checked invariant, not an assumption.
  · The naming spec governs grammar only — never colour mapping. Which grey is
    body text is decided in Figma, against real components.
`);
