/**
 * FIGMA-SIDE SCRIPT — does not run in Node.
 *
 * Writes the generated code blocks into component descriptions, so Dev Mode
 * shows the real component on ANY Figma plan. Dev Mode's code panel is
 * paywalled; the description field is not, and both Dev Mode and the MCP
 * read tools surface it.
 *
 * HOW TO RUN
 *
 *   1. pnpm --filter ionbase-ui build      (regenerates dist/figma-descriptions.json)
 *   2. paste this script into `use_figma`, with BLOCKS replaced by the
 *      `blocks` object from that file, as { "<nodeId>": "<block text>" }
 *
 * USE descriptionMarkdown, NEVER description — THIS COST AN HOUR
 *
 * `node.description = x` HTML-escapes on write. Setting `<Button x="a">'` and
 * reading it back gives `&lt;Button x=&quot;a&quot;&gt;&#39;` — 16 characters
 * in, 40 out. Every write adds another layer, so a second pass over an already
 * written description produces `&amp;amp;#39;` and corrupts any apostrophe or
 * angle bracket a designer typed by hand.
 *
 * `node.descriptionMarkdown = x` round-trips exactly, including fenced code
 * blocks. It is a SEPARATE field: these components had content in
 * `description` and an empty `descriptionMarkdown`, so the repair was to read
 * the escaped `description`, decode it until stable, and write the result to
 * `descriptionMarkdown`. That decode loop is kept below, because anyone who
 * reaches for `description` again will need it.
 *
 * Markdown normalises two harmless things: runs of blank lines collapse, and
 * a literal `*` is stored as `\*` so it renders as an asterisk rather than
 * emphasis. Neither loses content.
 *
 * APPEND, NEVER REPLACE. Most of these carry long hand-written descriptions —
 * Link's is nearly 3,000 characters of real design reasoning. The block is
 * fenced by BEGIN/END markers, so a re-run replaces only the block.
 */

const BLOCKS = {/* "21:461": "───── CODE · ionbase-ui ─────\n…" */};

const BEGIN = '───── CODE · ionbase-ui ─────';
const END = '───── end code ─────';

const decodeOnce = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

/** Decode until stable: past writes through `description` may have stacked. */
const decodeFully = (s) => {
  let prev,
    next = s,
    guard = 0;
  do {
    prev = next;
    next = decodeOnce(prev);
    guard++;
  } while (next !== prev && guard < 12);
  return next;
};

const results = [];
for (const [id, block] of Object.entries(BLOCKS)) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node) {
    results.push({ id, error: 'not found' });
    continue;
  }

  // descriptionMarkdown is the source of truth; fall back to the legacy plain
  // field, decoded, for components that have never had markdown written.
  const current =
    node.descriptionMarkdown || decodeFully(node.description || '');

  const start = current.indexOf(BEGIN);
  const stop = current.indexOf(END);

  let next, action;
  if (start !== -1 && stop !== -1 && stop > start) {
    next = current.slice(0, start) + block + current.slice(stop + END.length);
    action = 'replaced';
  } else {
    next = current.trim() ? current.trimEnd() + '\n\n' + block : block;
    action = current.trim() ? 'appended' : 'created';
  }

  node.descriptionMarkdown = next;
  results.push({
    name: node.name,
    action,
    entitiesLeft: (
      node.descriptionMarkdown.match(/&(lt|gt|quot|#39|amp);/g) || []
    ).length,
  });
}

return results;
