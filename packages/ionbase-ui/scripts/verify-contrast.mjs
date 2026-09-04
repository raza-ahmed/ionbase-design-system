#!/usr/bin/env node
/**
 * Contrast gate.
 *
 * Closes the open item AGENTS.md has been carrying: `tokens:tier` proves an
 * alias resolves and `tokens:verify` proves a name matches its codeSyntax, but
 * nothing knew whether the resulting pair could be read. Two AA failures reached
 * production that way.
 *
 * It runs HERE rather than in packages/tokens on purpose. The question is not
 * "do these two tokens contrast" — a naive cross-product of every text role
 * against every surface role produces 53 failures for `text/on-color` alone,
 * nearly all of them meaningless, because nothing puts on-colour text on
 * `surface/default`. The question is which pairs the COMPONENTS actually
 * create, and that is only answerable from the shipped CSS. This package has
 * both the component stylesheets and the resolved token CSS.
 *
 *   src/styles/tokens/base.css        light values, already literal hex
 *   src/styles/tokens/theme-dark.css  dark overrides
 *   src/styles/<component>.css        the pairings
 *
 * Accepted failures live in contrast-exceptions.json with a reason, and an
 * exception that no longer fails is itself an error — otherwise the file
 * becomes a graveyard nobody prunes.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = join(PKG, 'src', 'styles');
const TOKENS = join(STYLES, 'tokens');
const EXCEPTIONS = join(PKG, 'contrast-exceptions.json');

/* WCAG 1.4.3 for text. AGENTS.md establishes 4.5 across the board here: the
 * largest label in the system is 20px/500, which is 15pt and not bold, so the
 * 3:1 large-text allowance never applies. Icons and borders are 1.4.11 at 3:1. */
const TEXT_MIN = 4.5;
const NONTEXT_MIN = 3.0;

/*
 * THE GROUNDS A BACKGROUND-LESS COMPONENT CAN LAND ON.
 *
 * Until 3 Sep 2026 a rule with a `color` and no `background` was skipped, and
 * the component passed by never being asked. 106 slots across 19 stylesheets
 * were in that position, and `EmptyState` — the first component that is
 * text-only from top to bottom — produced ZERO pairings while the gate
 * reported green.
 *
 * There is no single right backdrop for such a rule: the component sits on
 * whatever region holds it. So it is measured against all three neutral
 * grounds a caller can place a region on, and must be readable on every one.
 * Assuming only `surface/page` would let a component fail inside a card and
 * still pass the gate.
 *
 * Intent surfaces are deliberately NOT in this list. A component placed inside
 * a solid Alert inherits that Alert's text roles; pairing an ordinary
 * `text/secondary` against `surface/error` would report a combination nothing
 * constructs.
 */
const ASSUMED_GROUNDS = [
  '--surface-page',
  '--surface-default',
  '--surface-muted',
];

/*
 * Foreground roles whose whole meaning is "on a coloured surface". Measuring
 * them against a neutral ground asks a question the design never poses: an
 * on-colour checkmark is never drawn on the page, it is drawn on the filled
 * box that the same component painted. Where those elements declare no
 * background of their own, the honest answer is "not applicable", not a
 * fabricated failure.
 */
const ON_COLOR_ROLES = new Set([
  '--text-on-color',
  '--icon-on-color',
  '--text-inverse',
  '--icon-inverse',
]);

/* ------------------------------------------------------------ token values */

function declarations(css) {
  const out = {};
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)[;}]/gi)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

const light = declarations(readFileSync(join(TOKENS, 'base.css'), 'utf8'));
const dark = {
  ...light,
  ...declarations(readFileSync(join(TOKENS, 'theme-dark.css'), 'utf8')),
};
const MODES = { Light: light, Dark: dark };

const exFile = existsSync(EXCEPTIONS)
  ? JSON.parse(readFileSync(EXCEPTIONS, 'utf8'))
  : {};

/*
 * Modes still being designed. Measured and reported, but never a build failure
 * and never written into a component contract — a theme that is not finished
 * produces findings that are true of today's values and worthless as decisions.
 * See the comment in contrast-exceptions.json.
 */
const deferredModes = new Set(exFile.deferredModes ?? []);

/* --------------------------------------------------------------- contrast */

/** #rrggbb, #rrggbbaa, rgb() and rgba() — the four forms the token CSS emits. */
function parseColor(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  const hex = s.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (hex) {
    const n = hex[1];
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
      a: hex[2] ? parseInt(hex[2], 16) / 255 : 1,
    };
  }
  const rgb = s.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/i,
  );
  if (rgb) {
    let a = 1;
    if (rgb[4] !== undefined) {
      a = rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4]);
    }
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a };
  }
  return null;
}

const toHex = (c) =>
  `#${[c.r, c.g, c.b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;

/** Source-over: what a translucent layer actually looks like on its backdrop. */
const composite = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
});

function luminance(c) {
  const lin = [c.r, c.g, c.b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------- CSS parsing */

/** Rules as {selector, decls}, flattened out of any at-rule nesting. */
function parseRules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  const walk = () => {
    while (i < css.length) {
      const brace = css.indexOf('{', i);
      if (brace === -1) return;
      const close = css.indexOf('}', i);
      if (close !== -1 && close < brace) {
        i = close + 1;
        return;
      }
      const prelude = css.slice(i, brace).trim();
      i = brace + 1;
      if (prelude.startsWith('@')) {
        // at-rule: its children are rules in their own right
        walk();
        continue;
      }
      // collect this rule's body up to its matching close
      let depth = 1;
      let start = i;
      while (i < css.length && depth > 0) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') depth--;
        i++;
      }
      const body = css.slice(start, i - 1);
      const decls = {};
      for (const m of body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/gi)) {
        decls[m[1].trim()] = m[2].trim();
      }
      for (const sel of prelude.split(','))
        rules.push({ selector: sel.trim(), decls });
    }
  };
  walk();
  return rules;
}

const STATE_PATTERNS = [
  [/\[data-hovered|:hover/, 'hover'],
  [/\[data-pressed|:active/, 'pressed'],
  [/\[data-disabled|:disabled|--disabled/, 'disabled'],
  [/\[data-focused|:focus/, 'focus'],
  [/\[data-selected|--selected|\[aria-selected/, 'selected'],
];

function stateOf(selector) {
  for (const [re, name] of STATE_PATTERNS) if (re.test(selector)) return name;
  return 'default';
}

/** `.ion-button--success[data-hovered]` -> {base:'ion-button', variant:'ion-button--success'} */
function contextOf(selector) {
  const classes = [...selector.matchAll(/\.(ion-[a-z0-9_-]+)/g)].map(
    (m) => m[1],
  );
  if (!classes.length) return null;
  // BEM: the block is what is left after stripping __element and --modifier.
  // Deriving it rather than looking for a bare class matters — `.ion-menu__item`
  // appears without `.ion-menu` beside it, and its backdrop lives on the block.
  const block = (c) => c.replace(/__.*$/, '').replace(/--.*$/, '');
  const base = block(classes[0]);
  // Modifiers COMPOUND. `.ion-alert--solid.ion-alert--information` is a context
  // in its own right: `--solid` carries the text colour and the compound carries
  // the surface. Collapsing it to the first modifier measured all six solid
  // intents as one, which under-reported by a factor of six.
  const modifiers = classes.filter((c) => c.includes('--'));
  const variant = modifiers.length ? modifiers.join('&') : base;
  const element = classes.find((c) => c.includes('__')) ?? null;
  return { base, variant, modifiers, element };
}

/* ------------------------------------------------------------- extraction */

const files = readdirSync(STYLES).filter((f) => f.endsWith('.css'));
const pairings = [];
const textRolesSeen = new Set();

for (const file of files) {
  const rules = parseRules(readFileSync(join(STYLES, file), 'utf8'));

  // (context|state) -> { color, background-color, locals }
  const table = new Map();
  const key = (ctx, state, el) => `${ctx}|${state}|${el ?? ''}`;

  for (const { selector, decls } of rules) {
    const ctx = contextOf(selector);
    if (!ctx) continue;
    const state = stateOf(selector);
    const k = key(ctx.variant, state, ctx.element);
    const slot = table.get(k) ?? { locals: {} };
    if (decls.color) slot.color = decls.color;
    if (decls['background-color']) slot.background = decls['background-color'];
    if (decls['background-image'])
      slot.backgroundImage = decls['background-image'];
    for (const [d, v] of Object.entries(decls)) {
      if (d.startsWith('--ion-')) slot.locals[d] = v;
    }
    slot.ctx = ctx;
    slot.state = state;
    table.set(k, slot);
  }

  /**
   * Resolution order for a context: the compound modifier first, then each
   * modifier on its own, then the block. Within each, the current state before
   * the default state, and the element before the block-level rule.
   */
  const chain = (ctx, state, element) => {
    const scopes = [ctx.variant, ...(ctx.modifiers ?? []), ctx.base].filter(
      (v, i, a) => v && a.indexOf(v) === i,
    );
    const out = [];
    for (const scope of scopes) {
      for (const st of state === 'default' ? ['default'] : [state, 'default']) {
        if (element) out.push(key(scope, st, element));
        out.push(key(scope, st, null));
      }
    }
    return out;
  };

  /** Follow `var(--x)`, including one hop through a component-local `--ion-*`. */
  const deref = (value, ctx, state, element) => {
    if (!value) return null;
    const m = value.match(/var\((--[a-z0-9-]+)/i);
    if (!m) return null;
    const name = m[1];
    if (!name.startsWith('--ion-')) return { token: name, scope: null };
    for (const k of chain(ctx, state, element)) {
      const local = table.get(k)?.locals?.[name];
      if (local) {
        const inner = local.match(/var\((--[a-z0-9-]+)/i);
        if (inner) return { token: inner[1], scope: k.split('|')[0] };
      }
    }
    return null;
  };

  const lookup = (field, ctx, state, element) => {
    for (const k of chain(ctx, state, element)) {
      const v = table.get(k)?.[field];
      if (v && v.trim() !== 'transparent') return { raw: v, from: k };
    }
    return null;
  };

  // Modifiers that also appear compounded with another modifier in this file.
  const compounds = new Set();
  for (const slot of table.values()) {
    if ((slot.ctx?.modifiers ?? []).length > 1) {
      for (const m of slot.ctx.modifiers) compounds.add(m);
    }
  }

  for (const slot of table.values()) {
    const { ctx, state } = slot;
    const fg = lookup('color', ctx, state, ctx.element);
    const bg = lookup('background', ctx, state, ctx.element);
    if (!fg) continue;

    const fgRef = deref(fg.raw, ctx, state, ctx.element);
    if (!fgRef) continue;
    const fgToken = fgRef.token;

    /*
     * No background anywhere up the chain: the component draws no surface and
     * sits on whatever holds it. Measure against every ground it could land
     * on rather than skipping it — see ASSUMED_GROUNDS.
     */
    const bgRef = bg ? deref(bg.raw, ctx, state, ctx.element) : null;
    if (bg && !bgRef) continue;
    const assumed = !bg;
    if (assumed && ON_COLOR_ROLES.has(fgToken)) continue;
    const bgTokens = assumed ? [...ASSUMED_GROUNDS] : [bgRef.token];

    /*
     * Skip states the component cannot actually render.
     *
     * `.ion-alert` declares `--ion-alert-surface` as a block-level DEFAULT, so
     * a bare `.ion-alert--solid` resolves a surface through the cascade even
     * though Alert always emits an intent class beside it. That produced a real
     * cascade result for an impossible DOM: solid's on-colour text measured
     * against the block's default subtle surface, at 1.11:1.
     *
     * The tell is that the modifier takes its surface from the block rather
     * than supplying its own, while compound rules containing it do supply one.
     * Those compounds are the states that actually ship.
     */
    const single = (ctx.modifiers ?? []).length === 1;
    const surfaceFromBlock =
      !assumed && (bgRef.scope ?? bg.from.split('|')[0]) === ctx.base;
    if (single && surfaceFromBlock && compounds.has(ctx.modifiers[0])) continue;

    if (fgToken.startsWith('--text-')) textRolesSeen.add(fgToken);

    // Icons answer to 1.4.11 at 3:1, not 1.4.3 at 4.5:1.
    const isText =
      !ctx.element?.includes('icon') && !fgToken.startsWith('--icon-');

    // A translucent hover overlay is only meaningful over what it sits on.
    // The component's own root background is that, when it has one.
    const baseBgRaw = table.get(key(ctx.base, 'default', null))?.background;
    const backdrop =
      baseBgRaw && baseBgRaw.trim() !== 'transparent'
        ? (deref(baseBgRaw, ctx, 'default', null)?.token ?? null)
        : null;

    /*
     * GRADIENT STOPS. A flat `background-color` is one colour; a gradient is
     * three, and this gate could only see the flat one. AvatarGradient paints
     * `from -> mid -> to` and declares `to` as the flat fallback, so `to` was
     * the only stop ever measured — and it is the most flattering of the three
     * for dark initials, because dark text is hardest against the DARKEST stop.
     * Six of the seven hues were failing AA against `from` (blue 3.42, purple
     * 3.58, pink 3.27, orange 3.72, green 3.10, red 3.35) while the build stayed
     * green, and the stylesheet's own comment argued the measured stop was the
     * strict one. Pair against every stop, not just the one that flatters.
     *
     * A gradient also carries vars that are not colours — the sheen's alpha is
     * `rgb(255 255 255 / var(--ion-avatar-gradient-sheen))`, where the var is a
     * percentage. Keeping only what resolves to a parseable colour drops those
     * without needing to understand the gradient's grammar.
     */
    const bgImage = lookup('backgroundImage', ctx, state, ctx.element);
    if (bgImage) {
      for (const m of bgImage.raw.matchAll(/var\((--[a-z0-9-]+)/gi)) {
        const ref = deref(`var(${m[1]})`, ctx, state, ctx.element);
        if (!ref) continue;
        const value = light[ref.token];
        if (!value || !parseColor(value)) continue;
        if (!bgTokens.includes(ref.token)) bgTokens.push(ref.token);
      }
    }

    for (const bgToken of bgTokens) {
      pairings.push({
        component: file.replace(/\.css$/, ''),
        context: ctx.element ? `${ctx.variant} ${ctx.element}` : ctx.variant,
        state,
        fg: fgToken,
        bg: bgToken,
        backdrop,
        kind: isText ? 'text' : 'non-text',
        ...(assumed ? { ground: 'assumed' } : {}),
      });
    }
  }
}

/* -------------------------------------------------------------- measuring */

const results = [];
const skipped = [];
const unresolved = [];

for (const p of pairings) {
  for (const [mode, map] of Object.entries(MODES)) {
    const f = parseColor(map[p.fg]);
    let b = parseColor(map[p.bg]);
    if (!f || !b) {
      // Not a skip. A stylesheet referencing a custom property that no token
      // layer defines in this mode is the bug, and silently skipping it is how
      // a coverage regression hides — a renamed token would otherwise just
      // shrink the pairing count and still exit 0.
      unresolved.push({ ...p, mode, missing: !f ? p.fg : p.bg });
      continue;
    }
    let composited = false;
    if (b.a < 1) {
      const back = p.backdrop ? parseColor(map[p.backdrop]) : null;
      if (!back || back.a < 1) {
        skipped.push({
          ...p,
          mode,
          why: `${p.bg} is translucent and its backdrop is unknown`,
        });
        continue;
      }
      b = composite(b, back);
      composited = true;
    }
    if (f.a < 1) {
      f.r = f.r * f.a + b.r * (1 - f.a);
      f.g = f.g * f.a + b.g * (1 - f.a);
      f.b = f.b * f.a + b.b * (1 - f.a);
      f.a = 1;
    }
    results.push({
      ...p,
      mode,
      fgHex: toHex(f),
      bgHex: toHex(b),
      ...(composited ? { compositedOver: p.backdrop } : {}),
      ratio: Number(ratio(f, b).toFixed(2)),
      min: p.kind === 'text' ? TEXT_MIN : NONTEXT_MIN,
    });
  }
}

// De-duplicate: the same pair can be reached through several selectors.
const seen = new Set();
const unique = results.filter((r) => {
  const k = `${r.component}|${r.context}|${r.state}|${r.mode}|${r.fg}|${r.bg}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const measured = unique.filter((r) => !deferredModes.has(r.mode));
const deferredResults = unique.filter((r) => deferredModes.has(r.mode));
const failures = measured.filter((r) => r.ratio < r.min);
const deferredFailures = deferredResults.filter((r) => r.ratio < r.min);

/* ------------------------------------------------------------- exceptions */

const exceptions = exFile.accepted ?? [];
const exKey = (e) => `${e.fg}|${e.bg}|${e.mode}`;
const accepted = new Map(exceptions.map((e) => [exKey(e), e]));

const unexpected = [];
const matched = new Set();
for (const f of failures) {
  const e = accepted.get(exKey(f));
  if (e) matched.add(exKey(f));
  else unexpected.push(f);
}
const stale = exceptions.filter((e) => !matched.has(exKey(e)));

// Every exception must say why. An unexplained suppression is indistinguishable
// from a bug someone silenced.
const unexplained = exceptions.filter((e) => !e.reason || !e.kind);

// Accepted-but-still-broken. These do not fail the build and must never become
// invisible because of it.
const outstanding = exceptions.filter(
  (e) => e.kind === 'defect' && matched.has(exKey(e)),
);

/* ----------------------------------------------------------------- output */

mkdirSync(join(PKG, 'dist', 'meta'), { recursive: true });
writeFileSync(
  join(PKG, 'dist', 'meta', 'contrast.json'),
  `${JSON.stringify(
    {
      generated: 'by scripts/verify-contrast.mjs',
      thresholds: { text: TEXT_MIN, nonText: NONTEXT_MIN },
      deferredModes: [...deferredModes],
      pairings: unique.sort((a, b) => a.ratio - b.ratio),
      accepted: exceptions,
      deferred: exFile.deferred ?? [],
      skipped,
    },
    null,
    2,
  )}\n`,
);

const args = process.argv.slice(2);
if (args.includes('--list')) {
  for (const r of unique.sort((a, b) => a.ratio - b.ratio)) {
    const ok = r.ratio >= r.min ? ' ' : '!';
    console.log(
      `${ok} ${String(r.ratio).padStart(6)}:1 (min ${r.min})  ${r.mode.padEnd(5)} ` +
        `${r.component.padEnd(14)} ${r.context.padEnd(34)} ${r.state.padEnd(8)} ` +
        `${r.fg} on ${r.bg}`,
    );
  }
  console.log('');
}

for (const f of unexpected) {
  console.error(
    `  FAIL ${f.ratio}:1 (needs ${f.min})  ${f.mode} · ${f.component} · ${f.context} · ${f.state}\n` +
      `       ${f.fg} ${f.fgHex} on ${f.bg} ${f.bgHex}`,
  );
}
for (const e of unexplained) {
  console.error(
    `  UNEXPLAINED EXCEPTION  ${e.fg} on ${e.bg} [${e.mode}] needs both "kind" and "reason"`,
  );
}
for (const e of stale) {
  console.error(
    `  STALE EXCEPTION  ${e.fg} on ${e.bg} [${e.mode}] no longer fails — remove it from contrast-exceptions.json`,
  );
}

// A parser that silently stops finding pairings would pass forever.
const missing = [];
for (const t of textRolesSeen) {
  for (const mode of Object.keys(MODES)) {
    if (!unique.some((r) => r.fg === t && r.mode === mode))
      missing.push(`${t} [${mode}]`);
  }
}
if (missing.length) {
  console.error(
    `  COVERAGE  text roles used in CSS but measured in no pairing: ${missing.join(', ')}`,
  );
}
for (const u of unresolved.filter((u) => !deferredModes.has(u.mode))) {
  console.error(
    `  UNRESOLVED  ${u.missing} has no value in ${u.mode} — used by ${u.component} ${u.context}`,
  );
}

if (outstanding.length) {
  console.log(
    '\n  Outstanding defects — accepted, still broken, still shipping:',
  );
  for (const e of outstanding) {
    console.log(
      `    ${e.ratio}:1  ${e.mode.padEnd(5)} ${e.fg} on ${e.bg}` +
        (e.affects ? `  (${e.affects.join(', ')})` : ''),
    );
  }
}

/* Deferred failures, counted here rather than written down anywhere.
 *
 * contrast-exceptions.json used to state the number in prose — "on today's
 * values that is 3 defects". It was 8 by the time anyone looked, because the
 * agentic tier shipped and nobody edits a comment to match a measurement. The
 * count now comes from the measurement, and the note points here.
 *
 * The exempt/unexempt split is the part that matters to whoever un-defers a
 * mode: an entry already marked wcag-exempt for this mode needs no work, and
 * everything else is either a real defect or a false positive still owed an
 * exemption of its own. */
let deferredUnexempt = 0;
if (deferredModes.size) {
  console.log(
    `\n  Deferred (${[...deferredModes].join(', ')}) — measured, not enforced, not shipped in any contract:`,
  );
  const deferredExempt = new Set(
    (exFile.deferred ?? [])
      .filter((e) => e.kind === 'wcag-exempt')
      .map((e) => `${e.fg}|${e.bg}|${e.mode}`),
  );
  const seenPair = new Set();
  for (const r of deferredFailures.sort((a, b) => a.ratio - b.ratio)) {
    const k = `${r.fg}|${r.bg}|${r.mode}`;
    if (seenPair.has(k)) continue;
    seenPair.add(k);
    const isExempt = deferredExempt.has(k);
    if (!isExempt) deferredUnexempt++;
    console.log(
      `    ${r.ratio}:1  ${r.mode.padEnd(5)} ${r.fg} on ${r.bg}  (${r.component})` +
        (isExempt ? '  [wcag-exempt]' : ''),
    );
  }
  if (!deferredFailures.length)
    console.log('    none failing on current values');
  else
    console.log(
      `    ${seenPair.size} distinct pairings, ${deferredUnexempt} without an exemption — ` +
        `these become real findings the moment the mode is un-deferred`,
    );
}

const exempt = exceptions.filter((e) => e.kind === 'wcag-exempt').length;
console.log(
  `\nContrast: ${measured.length} enforced pairings (+${deferredResults.length} deferred) across ` +
    `${new Set(unique.map((p) => p.component)).size} stylesheets — ` +
    `${unexpected.length} unexpected, ${outstanding.length} outstanding defects, ` +
    `${exempt} WCAG-exempt, ${skipped.length} skipped, ${unresolved.length} unresolved` +
    (deferredUnexempt ? `, ${deferredUnexempt} deferred and unexempt` : ''),
);

process.exit(
  unexpected.length ||
    stale.length ||
    missing.length ||
    unexplained.length ||
    unresolved.length
    ? 1
    : 0,
);
