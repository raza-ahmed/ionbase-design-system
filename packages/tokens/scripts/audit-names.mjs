/**
 * Validates every Figma variable name against the grammar in
 * docs/variable-naming-spec.html.
 *
 * The spec's whole claim is that names are parseable: read left to right,
 * `<component>/<variant>/<part>/<property>/<state>`, each slot drawn from a
 * closed list. If that's true, a machine can check it — and anything a machine
 * can't parse is a name a person will guess wrong.
 *
 * Reports only. Renaming happens in Figma, because Figma owns names.
 */
import { loadCollections } from './figma-to-dtcg.mjs';

// §5 closed vocabularies.
export const PROPERTY = new Set([
  'bg',
  'fg',
  'border',
  'ring',
  'shadow',
  'radius',
  'gap',
  'padding-x',
  'padding-y',
  'size',
  'border-width',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
]);

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
  'disabled',
];
const STATE = new Set(STATE_ORDER);

/** Ordered faint -> strong. The order is load-bearing: it is what gives a new
 *  value an obvious slot instead of a new synonym. */
export const ROLE_ORDER = [
  'muted',
  'subtle',
  'tint',
  'secondary',
  'body',
  'default',
  'emphasized',
  'strong',
  'bold',
  'emphasis',
  'inverse',
];
/** Off-scale: a condition rather than a prominence step. */
const ROLE_OFF_SCALE = ['disabled'];
const ROLE = new Set([...ROLE_ORDER, ...ROLE_OFF_SCALE]);

const INTENT = new Set([
  'neutral',
  'brand',
  'link',
  'scrim',
  'success',
  'warning',
  'danger',
  'info',
]);

/**
 * Roots that name a *scale* rather than a component or a property.
 * `control` is the shared size ramp every control reads from — see the spec's
 * Q3: a value more than one component uses lives here, not in the component tier.
 */
const SCALE_ROOTS = new Set([
  'control',
  'color',
  'spacing',
  'radius',
  'font',
  'border-width',
  'grid',
  'container',
  'section',
  'type',
]);

/** `on-<intent>`: the foreground sitting on that intent's fill. */
const isIntent = (s) =>
  INTENT.has(s) || (s.startsWith('on-') && INTENT.has(s.slice(3)));

export function auditNames(collections) {
  const findings = [];
  const report = (severity, name, collection, rule, detail, suggestion) =>
    findings.push({ severity, name, collection, rule, detail, suggestion });

  function auditComponentTier(name, collection) {
    const segs = name.split('/');
    const propIdx = segs.findIndex((s) => PROPERTY.has(s));

    if (propIdx === -1) {
      report(
        'error',
        name,
        collection,
        'R2',
        'no Property segment — nothing says what attribute is being set',
      );
      return;
    }

    // A State word before the property makes the name read as a *kind* of
    // thing rather than a condition of one — `button/disabled/bg` implies a
    // "disabled button" variant exists.
    for (let i = 1; i < propIdx; i++) {
      if (STATE.has(segs[i])) {
        report(
          'error',
          name,
          collection,
          'R4',
          `state '${segs[i]}' appears before the property — state is always last`,
          [...segs.slice(0, i), ...segs.slice(i + 1), segs[i]].join('/'),
        );
      }
    }

    for (let i = propIdx + 1; i < segs.length; i++) {
      const s = segs[i];
      if (STATE.has(s)) continue;

      // Composed states are legal, but only in vocabulary order — one spelling
      // per combination, or the closed list stops being closed.
      const parts = s.split('-');
      if (parts.length > 1 && parts.every((p) => STATE.has(p))) {
        const ordered = [...parts].sort(
          (a, b) => STATE_ORDER.indexOf(a) - STATE_ORDER.indexOf(b),
        );
        if (parts.join('-') !== ordered.join('-')) {
          report(
            'error',
            name,
            collection,
            'R3',
            `composed state '${s}' is out of vocabulary order`,
            name.replace(s, ordered.join('-')),
          );
        }
      } else if (ROLE.has(s)) {
        report(
          'error',
          name,
          collection,
          'R5',
          `'${s}' is a Role, which the spec restricts to the semantic tier`,
          'move it into the Part slot, or alias a semantic token',
        );
      } else {
        report(
          'error',
          name,
          collection,
          'R3',
          `'${s}' follows the property but is not a State`,
          `if it names a piece, it belongs before '${segs[propIdx]}' as a Part`,
        );
      }
    }
  }

  function auditSemanticTier(name, collection) {
    const [property, ...rest] = name.split('/');
    if (!PROPERTY.has(property)) {
      report(
        'error',
        name,
        collection,
        'R2',
        `'${property}' is not a Property word`,
      );
      return;
    }
    if (!rest.length) {
      report(
        'info',
        name,
        collection,
        'NEUTRAL',
        'bare property with no intent or role',
        `${property}/neutral/default`,
      );
      return;
    }
    if (!isIntent(rest[0])) {
      // Intent slot must be filled. A Role or State here means it was skipped.
      if (ROLE.has(rest[0]) || STATE.has(rest[0])) {
        report(
          'info',
          name,
          collection,
          'NEUTRAL',
          `intent slot omitted — reads as '${property}/${rest[0]}'`,
          `${property}/neutral/${rest.join('/')}`,
        );
      } else {
        report(
          'warn',
          name,
          collection,
          'R-vocab',
          `'${rest[0]}' sits in the Intent position but is in no closed list`,
          'amend §5, or rename to an existing word',
        );
      }
      return;
    }
    // Intent present — everything after it must be Role then optional State.
    const [role, ...tail] = rest.slice(1);
    if (role !== undefined && !ROLE.has(role) && !STATE.has(role)) {
      report(
        'warn',
        name,
        collection,
        'R-vocab',
        `'${role}' sits in the Role position but is in no closed list`,
      );
    }
    for (const s of tail) {
      const parts = s.split('-');
      const composed = parts.length > 1 && parts.every((p) => STATE.has(p));
      if (!STATE.has(s) && !composed) {
        report(
          'error',
          name,
          collection,
          'R3',
          `'${s}' trails the role but is not a State`,
        );
      }
    }
  }

  for (const c of collections) {
    for (const name of Object.keys(c.variables)) {
      // R1 applies everywhere: lowercase-kebab, max 5 segments.
      const segs = name.split('/');
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
      }
      if (segs.length > 5) {
        report(
          'error',
          name,
          c.collection,
          'R1',
          `${segs.length} segments, max is 5`,
        );
      }

      if (SCALE_ROOTS.has(segs[0])) continue; // Primitive / Breakpoint scales
      if (c.collection === 'Semantic') auditSemanticTier(name, c.collection);
      else if (c.collection === 'Component')
        auditComponentTier(name, c.collection);
    }
  }

  return findings;
}

export function printFindings(findings) {
  const label = {
    error: 'BREAKS THE GRAMMAR',
    warn: 'VOCABULARY DRIFT',
    info: 'INTENT SLOT OMITTED',
  };
  for (const sev of ['error', 'warn', 'info']) {
    const group = findings.filter((f) => f.severity === sev);
    if (!group.length) continue;
    console.log(`\n${label[sev]} — ${group.length}\n${'='.repeat(60)}`);
    for (const f of group) {
      console.log(`  ${f.name}  [${f.collection} · ${f.rule}]`);
      console.log(`    ${f.detail}`);
      if (f.suggestion) console.log(`    -> ${f.suggestion}`);
    }
  }
  const n = (s) => findings.filter((f) => f.severity === s).length;
  console.log(
    `\n${n('error')} errors, ${n('warn')} warnings, ${n('info')} intent-slot omissions.`,
  );
  return n('error') + n('warn') + n('info');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const total = printFindings(auditNames(loadCollections()));
  process.exit(total === 0 ? 0 : 1);
}
