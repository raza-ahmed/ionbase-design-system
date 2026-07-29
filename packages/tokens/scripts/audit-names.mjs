/**
 * Validates every Figma variable name against the v2 grammar in
 * docs/variable-naming-spec.html.
 *
 *   Primitives   family / step              color/blue/500, scale/8
 *   Semantics    group / step               primary/500, radius/xl
 *   Interface    element / role [/ state]   surface/primary/hover
 *   Breakpoint   group / role / property    type/h1/line-height
 *
 * The spec's whole claim is that names are parseable: read left to right, each
 * slot drawn from a closed list. If that's true a machine can check it, and
 * anything a machine can't parse is a name a person will guess wrong.
 *
 * Reports only. Renaming happens in Figma, because Figma owns names.
 *
 * WHY THIS WAS REWRITTEN. The v1 version branched on `c.collection === 'Semantic'`
 * and `=== 'Component'`. After the v2 migration neither collection exists, so
 * every structural check was skipped and the audit reported a clean 0/0/0 while
 * validating essentially nothing. A gate that cannot fail is worse than no gate:
 * it is a green light nobody earned. If you rename a collection, come here.
 */
import { loadCollections } from './figma-to-dtcg.mjs';

// -- Interface vocabulary ---------------------------------------------------

/** First slot of an Interface token. Closed, and effectively never grows —
 *  five elements cover every paintable property Figma exposes. */
export const ELEMENTS = new Set(['text', 'icon', 'surface', 'border', 'ring']);

/** Second slot: prominence within the neutrals, or a structural layer. */
export const NEUTRAL_ROLES = new Set([
  // prominence
  'default',
  'secondary',
  'tertiary',
  'placeholder',
  'disabled',
  'strong',
  'stronger',
  'subtle',
  'muted',
  // structural surfaces
  'page',
  'sunken',
  'raised',
  'overlay',
  'scrim',
  'placeholder',
  // inversion and contrast
  'inverse',
  'inverse-subtle',
  'on-color',
  // interaction washes, which are roles at this position
  'hover',
  'pressed',
  'selected',
  'selected-hover',
  'transparent',
  // affordances
  'interactive',
  'link',
  'focus',
  'focus-error',
  'offset',
]);

/** The five meanings. Every accent role carries the same slots — that is what
 *  stops one role's `default` meaning a saturated 500 and another's a 200 tint. */
export const ACCENTS = new Set([
  'primary',
  'error',
  'success',
  'warning',
  'information',
]);

/** Weight suffixes an accent role may take, hyphenated into the role slot. */
export const ACCENT_SUFFIXES = new Set(['strong', 'subtle', 'tint']);

/** Third slot. `default` is implicit and never written. */
export const STATE_ORDER = [
  'hover',
  'pressed',
  'focus',
  'selected',
  'checked',
  'indeterminate',
  'expanded',
  'invalid',
  'loading',
  'read-only',
  'visited',
];
const STATES = new Set(STATE_ORDER);

// -- Semantics and Primitives ----------------------------------------------

/** Groups allowed at the head of a Semantics name. */
export const SEMANTIC_GROUPS = new Set([
  'primary',
  'neutral',
  'success',
  'warning',
  'error',
  'information',
  'chart',
  'base',
  'alpha',
  'radius',
  'border-width',
  'font',
  'control',
  'icon-size',
]);

/** Families allowed at the head of a Primitives name. All value-keyed —
 *  a primitive named for a role (`radius/full`, `font/weight/regular`) is the
 *  layering mistake v2 corrected. */
export const PRIMITIVE_FAMILIES = new Set([
  'color',
  'spacing',
  'scale',
  'font',
]);

export const BREAKPOINT_GROUPS = new Set([
  'grid',
  'container',
  'section',
  'type',
]);

/** Words retired in v2. Catching these by name gives a far better error than
 *  "unknown role", because the fix is a rename, not an amendment.
 *
 *  These are POSITION-SENSITIVE. `body` is a legitimate Breakpoint type role
 *  (`type/body`) and `bold` a legitimate font weight (`font/weight/bold`) — only
 *  the v1 element/intent words are wrong everywhere. Applying the full list
 *  globally is a false positive, which is exactly what the first run produced. */
const RETIRED_ANYWHERE = {
  bg: 'surface',
  fg: 'text or icon',
  brand: 'primary',
  danger: 'error',
  info: 'information',
};
const RETIRED_IN_INTERFACE_ROLE = {
  emphasis: 'strong or inverse',
  emphasized: 'strong',
  bold: 'stronger',
  body: 'secondary',
  variant: '(slot removed)',
  part: '(slot removed)',
};

const isNumericStep = (s) => /^(?:\d+|\d+-\d+)$/.test(s);

export function auditNames(collections) {
  const findings = [];
  const report = (severity, name, collection, rule, detail, suggestion) =>
    findings.push({ severity, name, collection, rule, detail, suggestion });

  /** An accent role, with or without a weight suffix. */
  function isAccentRole(s) {
    if (ACCENTS.has(s)) return true;
    const i = s.lastIndexOf('-');
    if (i < 1) return false;
    return ACCENTS.has(s.slice(0, i)) && ACCENT_SUFFIXES.has(s.slice(i + 1));
  }

  function isState(s) {
    if (STATES.has(s)) return true;
    const parts = s.split('-');
    return parts.length > 1 && parts.every((p) => STATES.has(p));
  }

  function auditInterface(name, collection) {
    const segs = name.split('/');
    const [element, role, ...rest] = segs;

    if (!ELEMENTS.has(element)) {
      report(
        'error',
        name,
        collection,
        'R-element',
        `'${element}' is not an element`,
        `one of: ${[...ELEMENTS].join(', ')}`,
      );
      return;
    }
    if (role === undefined) {
      report(
        'error',
        name,
        collection,
        'R-role',
        'no role — an element alone names nothing',
        `${element}/default`,
      );
      return;
    }
    if (RETIRED_IN_INTERFACE_ROLE[role]) {
      report(
        'error',
        name,
        collection,
        'R-retired',
        `'${role}' was retired from the role slot in v2`,
        `use ${RETIRED_IN_INTERFACE_ROLE[role]}`,
      );
    } else if (!NEUTRAL_ROLES.has(role) && !isAccentRole(role)) {
      if (isState(role)) {
        report(
          'error',
          name,
          collection,
          'R-order',
          `'${role}' is a state, and state is never second`,
        );
      } else {
        report(
          'error',
          name,
          collection,
          'R-role',
          `'${role}' is not a role`,
          `accents take -strong / -subtle / -tint; neutrals come from the closed list`,
        );
      }
    }
    // Everything after the role must be a state, and only one slot of it.
    if (rest.length > 1) {
      report(
        'error',
        name,
        collection,
        'R-depth',
        `${segs.length} segments — Interface is element/role[/state]`,
        `compose states with a hyphen: ${element}/${role}/${rest.join('-')}`,
      );
      return;
    }
    if (rest.length === 1) {
      const st = rest[0];
      if (st === 'default') {
        report(
          'error',
          name,
          collection,
          'R-state',
          'the resting state is never written',
          `${element}/${role}`,
        );
      } else if (st === 'disabled') {
        report(
          'error',
          name,
          collection,
          'R-state',
          '`disabled` is a role, not a state — it never combines',
        );
      } else if (!isState(st)) {
        report(
          'error',
          name,
          collection,
          'R-state',
          `'${st}' is not a state`,
          `one of: ${STATE_ORDER.join(', ')}`,
        );
      } else {
        const parts = st.split('-');
        if (parts.length > 1) {
          const ordered = [...parts].sort(
            (a, b) => STATE_ORDER.indexOf(a) - STATE_ORDER.indexOf(b),
          );
          if (parts.join('-') !== ordered.join('-')) {
            report(
              'error',
              name,
              collection,
              'R-state-order',
              `composed state '${st}' is out of vocabulary order`,
              `${element}/${role}/${ordered.join('-')}`,
            );
          }
        }
      }
    }
  }

  function auditSemantics(name, collection) {
    const segs = name.split('/');
    const group = segs[0];
    if (!SEMANTIC_GROUPS.has(group)) {
      report(
        'error',
        name,
        collection,
        'R-group',
        `'${group}' is not a Semantics group`,
        `one of: ${[...SEMANTIC_GROUPS].join(', ')}`,
      );
      return;
    }
    // Colour ramps are numeric steps and nothing else.
    if (ACCENTS.has(group) || group === 'neutral') {
      if (segs.length !== 2 || !isNumericStep(segs[1])) {
        report(
          'error',
          name,
          collection,
          'R-step',
          `a colour ramp is '<group>/<step>'`,
          `${group}/500`,
        );
      }
    }
  }

  function auditPrimitives(name, collection) {
    const family = name.split('/')[0];
    if (!PRIMITIVE_FAMILIES.has(family)) {
      report(
        'error',
        name,
        collection,
        'R-family',
        `'${family}' is not a primitive family`,
        `Primitives are value-keyed: ${[...PRIMITIVE_FAMILIES].join(', ')}`,
      );
    }
  }

  function auditBreakpoint(name, collection) {
    const group = name.split('/')[0];
    if (!BREAKPOINT_GROUPS.has(group)) {
      report(
        'error',
        name,
        collection,
        'R-group',
        `'${group}' is not a Breakpoint group`,
        `one of: ${[...BREAKPOINT_GROUPS].join(', ')}`,
      );
    }
    if (/\b(color|colour|surface|text|icon)\b/.test(name)) {
      report(
        'error',
        name,
        collection,
        'R-colour',
        'colour does not belong in Breakpoint — it does not vary by screen size',
      );
    }
  }

  const KNOWN = new Set(['Primitives', 'Semantics', 'Interface', 'Breakpoint']);
  for (const c of collections) {
    // A renamed or unexpected collection must be loud, never silently skipped.
    if (!KNOWN.has(c.collection)) {
      report(
        'error',
        `(collection) ${c.collection}`,
        c.collection,
        'R-collection',
        'unknown collection — this audit checks Primitives, Semantics, Interface, Breakpoint',
        'if a collection was renamed, update scripts/audit-names.mjs',
      );
      continue;
    }

    for (const name of Object.keys(c.variables)) {
      const segs = name.split('/');

      // Universal: lowercase-kebab, depth budget, no retired vocabulary.
      for (const s of segs) {
        if (!/^[a-z0-9-]+$/.test(s)) {
          report(
            'error',
            name,
            c.collection,
            'R1',
            `segment '${s}' is not lowercase-kebab`,
          );
        }
        if (RETIRED_ANYWHERE[s]) {
          report(
            'error',
            name,
            c.collection,
            'R-retired',
            `'${s}' was retired in v2`,
            `use ${RETIRED_ANYWHERE[s]}`,
          );
        }
      }
      if (segs.length > 4) {
        report(
          'error',
          name,
          c.collection,
          'R-depth',
          `${segs.length} segments, max is 4`,
        );
      }

      if (c.collection === 'Interface') auditInterface(name, c.collection);
      else if (c.collection === 'Semantics') auditSemantics(name, c.collection);
      else if (c.collection === 'Primitives')
        auditPrimitives(name, c.collection);
      else if (c.collection === 'Breakpoint')
        auditBreakpoint(name, c.collection);
    }
  }

  return findings;
}

export function printFindings(findings) {
  const label = {
    error: 'BREAKS THE GRAMMAR',
    warn: 'VOCABULARY DRIFT',
    info: 'NOTE',
  };
  for (const sev of ['error', 'warn', 'info']) {
    const group = findings.filter((f) => f.severity === sev);
    if (!group.length) continue;
    console.log(`\n${label[sev]} - ${group.length}\n${'='.repeat(60)}`);
    for (const f of group) {
      console.log(`  ${f.name}  [${f.collection} / ${f.rule}]`);
      console.log(`    ${f.detail}`);
      if (f.suggestion) console.log(`    -> ${f.suggestion}`);
    }
  }
  const n = (s) => findings.filter((f) => f.severity === s).length;
  console.log(
    `\n${n('error')} errors, ${n('warn')} warnings, ${n('info')} notes.`,
  );
  return n('error') + n('warn') + n('info');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const collections = loadCollections();
  const counted = collections
    .map((c) => `${c.collection}:${Object.keys(c.variables).length}`)
    .join('  ');
  console.log(`Auditing ${counted}`);
  const total = printFindings(auditNames(collections));
  process.exit(total === 0 ? 0 : 1);
}
