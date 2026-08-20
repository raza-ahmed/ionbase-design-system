#!/usr/bin/env node
/**
 * Score a candidate implementation against the real gates.
 *
 *   node score/score.mjs <file.tsx> [--task <id>] [--json]
 *
 * Every check here runs the same tooling a consumer would run — the shipped
 * ESLint plugin, the TypeScript compiler, the published contracts — rather than
 * a bespoke rubric. A grader that invents its own standard measures the grader.
 *
 * The heuristic checks are LABELLED as heuristics. `usesStates` greps for
 * loading/empty/error branches and will be fooled by a variable named `error`
 * that renders nothing; it is directional, not a proof, and the report says so.
 * Overstating what a check knows is how an eval becomes theatre.
 */
import {
  readFileSync,
  existsSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const UI = join(ROOT, 'packages', 'ionbase-ui');

const meta = JSON.parse(
  readFileSync(join(UI, 'dist', 'meta', 'components.json'), 'utf8'),
);
const corpus = JSON.parse(
  readFileSync(join(ROOT, 'evals', 'prompts', 'corpus.json'), 'utf8'),
);

/** Intrinsic elements the system already provides a component for. */
const HAND_ROLLED = {
  table: 'Table',
  button: 'Button',
  input: 'Input',
  select: 'Select',
  dialog: 'Modal',
  a: 'Link',
};

/* ------------------------------------------- sharper, trap-specific checks */

/**
 * The nine generic checks above are the floor — a capable model clears them
 * whatever context it is given, which the first pilot demonstrated: README-only
 * output scored 7/7 on the task with the most traps.
 *
 * These are the specific mistakes the corpus names. They are what actually
 * discriminates, because each one type-checks, renders, and looks right.
 */
function trapChecks(sf, src) {
  const out = {};
  const attrs = (node) =>
    Object.fromEntries(
      node.attributes.properties
        .filter((a) => ts.isJsxAttribute(a) && a.name)
        .map((a) => [
          a.name.getText(),
          a.initializer ? a.initializer.getText() : 'true',
        ]),
    );

  const elements = [];
  const walk = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      elements.push({ name: node.tagName.getText(), attrs: attrs(node), node });
    }
    ts.forEachChild(node, walk);
  };
  walk(sf);

  /* A placeholder is not a label — it vanishes on focus, exactly when needed. */
  const fields = elements.filter((e) =>
    ['Input', 'Select', 'PhoneInput'].includes(e.name),
  );
  const unlabelled = fields.filter(
    (e) =>
      e.attrs.placeholder &&
      !e.attrs.label &&
      !e.attrs['aria-label'] &&
      !e.attrs['aria-labelledby'],
  );
  if (fields.length) {
    out.fieldsLabelled = {
      pass: unlabelled.length === 0,
      detail: unlabelled.length
        ? `${unlabelled.length} field(s) with placeholder and no label`
        : '',
    };
  }

  /* Header cells need scope, or no data cell can be associated with a column. */
  const headerCells = elements.filter(
    (e) => e.name === 'TableCell' && (e.attrs.header || e.attrs.scope),
  );
  const inHead = /<TableHead>[\s\S]*?<\/TableHead>/.exec(src)?.[0] ?? '';
  const headCellCount = (inHead.match(/<TableCell/g) ?? []).length;
  const scopedCount = (inHead.match(/scope=/g) ?? []).length;
  if (headCellCount) {
    out.headerCellsScoped = {
      pass: scopedCount >= headCellCount,
      detail:
        scopedCount >= headCellCount
          ? ''
          : `${headCellCount - scopedCount} header cell(s) without scope`,
    };
  }
  void headerCells;

  /* An irreversible action needs a confirmation step in the same file. */
  const destructive = elements.filter(
    (e) => e.name === 'Button' && /destructive/.test(e.attrs.variant ?? ''),
  );
  if (destructive.length) {
    out.destructiveConfirmed = {
      pass: /\bModal\b/.test(src),
      detail: /\bModal\b/.test(src)
        ? ''
        : 'destructive Button with no Modal anywhere in the file',
    };
  }

  /* A Button that navigates breaks middle-click, cmd-click and copy-link. */
  const navigating = elements.filter(
    (e) =>
      e.name === 'Button' &&
      /router\.(push|replace)|navigate\(|window\.location|href\s*=/.test(
        e.attrs.onPress ?? '',
      ),
  );
  if (elements.some((e) => e.name === 'Button')) {
    out.buttonsDoNotNavigate = {
      pass: navigating.length === 0,
      detail: navigating.length
        ? `${navigating.length} Button(s) performing navigation`
        : '',
    };
  }

  return out;
}

export function score(file, taskId) {
  const src = readFileSync(file, 'utf8');
  const task = corpus.tasks.find((t) => t.id === taskId) ?? null;
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const used = new Set();
  const intrinsics = new Map();
  let importsIonbase = false;
  const raw = { colours: 0, spacing: 0 };

  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const m = node.moduleSpecifier;
      if (ts.isStringLiteral(m) && m.text.startsWith('ionbase-ui'))
        importsIonbase = true;
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText();
      if (/^[a-z]/.test(name))
        intrinsics.set(name, (intrinsics.get(name) ?? 0) + 1);
      else used.add(name);
    }
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) {
      const key = node.name.getText();
      const v = node.initializer.text;
      if (/color/i.test(key) && /^(#|rgb|hsl)/i.test(v)) raw.colours++;
      if (/padding|margin|gap|borderRadius/i.test(key) && /^\d+px$/.test(v))
        raw.spacing++;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  /* ---- what the system provides but was hand-rolled instead ---- */
  const handRolled = [];
  for (const [tag, component] of Object.entries(HAND_ROLLED)) {
    if (intrinsics.has(tag) && !used.has(component)) {
      handRolled.push({
        tag,
        shouldUse: component,
        count: intrinsics.get(tag),
      });
    }
  }

  /* ---- expected components actually present ---- */
  const expected = task?.expects?.components ?? [];
  const missing = expected.filter((c) => !used.has(c));

  /* ---- components that do not exist in the system ---- */
  const invented = [...used].filter(
    (c) =>
      !Object.hasOwn(meta.components, c) && !(meta.hooks ?? []).includes(c),
  );

  /* ---- HEURISTIC: does it branch on empty / loading / error ---- */
  const wantStates = task?.expects?.states ?? [];
  const statePatterns = {
    empty:
      /\b(isEmpty|noResults|length\s*===\s*0|length\s*<\s*1|\.length\b[^\n]*\?)/,
    loading: /\b(isLoading|loading|isPending|isFetching|skeleton)\b/i,
    error: /\b(isError|error|hasError|failed)\b/i,
  };
  const statesFound = wantStates.filter((s) => statePatterns[s]?.test(src));
  const statesMissing = wantStates.filter((s) => !statesFound.includes(s));

  /* ---- prop combinations with a measured contrast failure ---- */
  const contrastHits = [];
  for (const [name, c] of Object.entries(meta.components)) {
    for (const issue of c.a11y?.knownIssues ?? []) {
      if (!issue.appliesTo) continue;
      const wanted = Object.entries(issue.appliesTo.props ?? {});
      const re = new RegExp(
        `<${name}\\b[^>]*${wanted.map(([k, v]) => `${k}=["']${v}["']`).join('[^>]*')}`,
      );
      if (re.test(src))
        contrastHits.push({
          component: name,
          ...issue.appliesTo.props,
          ratio: issue.ratio,
        });
    }
  }

  return {
    file: basename(file),
    task: taskId ?? null,
    importsIonbase,
    componentsUsed: [...used].sort(),
    checks: {
      importsIonbase: {
        pass: importsIonbase,
        detail: importsIonbase ? '' : 'no import from ionbase-ui',
      },
      noHandRolled: {
        pass: handRolled.length === 0,
        detail: handRolled.map(
          (h) => `<${h.tag}> x${h.count} — use ${h.shouldUse}`,
        ),
      },
      noInventedComponents: { pass: invented.length === 0, detail: invented },
      expectedComponents: {
        pass: missing.length === 0,
        detail: missing,
        of: expected.length,
      },
      statesHandled: {
        pass: statesMissing.length === 0,
        detail: statesMissing,
        of: wantStates.length,
        heuristic: true,
      },
      noRawStyleValues: {
        pass: raw.colours + raw.spacing === 0,
        detail:
          raw.colours + raw.spacing
            ? `${raw.colours} colour, ${raw.spacing} spacing`
            : '',
      },
      noKnownContrastFailure: {
        pass: contrastHits.length === 0,
        detail: contrastHits,
      },
      // Only the checks whose pattern actually appears in the file — scoring a
      // Toast task on header-cell scope would just dilute the signal.
      ...trapChecks(sf, src),
    },
  };
}

/* --------------------------------------------------- lint, via the real plugin */

export function lint(file) {
  const cfg = join(ROOT, 'evals', 'score', 'candidate.eslint.mjs');
  try {
    const out = execFileSync(
      join(ROOT, 'node_modules', '.bin', 'eslint'),
      ['--no-config-lookup', '-c', cfg, '-f', 'json', file],
      { encoding: 'utf8', cwd: ROOT },
    );
    return JSON.parse(out)[0]?.messages ?? [];
  } catch (e) {
    // ESLint exits non-zero when it finds problems; the report is still on stdout.
    try {
      return JSON.parse(e.stdout)[0]?.messages ?? [];
    } catch {
      return [
        {
          ruleId: null,
          message: `eslint failed: ${String(e.message).slice(0, 200)}`,
        },
      ];
    }
  }
}

/* ------------------------------------------------------------ does it compile */

export function typecheck(file) {
  const dir = mkdtempSync(join(tmpdir(), 'ionbase-eval-'));
  try {
    writeFileSync(join(dir, 'candidate.tsx'), readFileSync(file, 'utf8'));
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          jsx: 'react-jsx',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          baseUrl: '.',
          paths: { 'ionbase-ui': [join(UI, 'dist', 'index.d.ts')] },
          typeRoots: [join(ROOT, 'node_modules', '@types')],
        },
        include: ['candidate.tsx'],
      }),
    );
    execFileSync(join(ROOT, 'node_modules', '.bin', 'tsc'), ['-p', dir], {
      encoding: 'utf8',
      cwd: ROOT,
    });
    return { pass: true, errors: [] };
  } catch (e) {
    const lines = String(e.stdout ?? e.message)
      .split('\n')
      .filter((l) => l.includes('error TS'))
      .slice(0, 10);
    return { pass: false, errors: lines };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------------ cli */

const argv = process.argv.slice(2);
if (argv.length && !argv[0].startsWith('--')) {
  const file = resolve(argv[0]);
  if (!existsSync(file)) {
    console.error(`No such file: ${file}`);
    process.exit(2);
  }
  const taskId = argv.includes('--task')
    ? argv[argv.indexOf('--task') + 1]
    : null;

  const s = score(file, taskId);
  const messages = lint(file);
  const tc = typecheck(file);

  s.lint = {
    errors: messages.filter((m) => m.severity === 2).length,
    byRule: messages.reduce((a, m) => {
      if (m.ruleId) a[m.ruleId] = (a[m.ruleId] ?? 0) + 1;
      return a;
    }, {}),
  };
  s.typecheck = tc;

  const checks = Object.entries(s.checks);
  const passed = checks.filter(([, c]) => c.pass).length;
  s.summary = {
    checksPassed: `${passed}/${checks.length}`,
    lintErrors: s.lint.errors,
    compiles: tc.pass,
  };

  if (argv.includes('--json')) {
    console.log(JSON.stringify(s, null, 2));
  } else {
    console.log(`\n${s.file}${taskId ? `  [${taskId}]` : ''}`);
    console.log(`  compiles           ${tc.pass ? 'yes' : 'NO'}`);
    if (!tc.pass)
      for (const e of tc.errors.slice(0, 3)) console.log(`      ${e.trim()}`);
    for (const [name, c] of checks) {
      const d = Array.isArray(c.detail) ? c.detail.join(', ') : c.detail;
      const flag = c.heuristic ? ' (heuristic)' : '';
      console.log(
        `  ${name.padEnd(23)}${c.pass ? 'pass' : 'FAIL'}${flag}${d ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`,
      );
    }
    console.log(`  lint errors        ${s.lint.errors}`);
    for (const [r, n] of Object.entries(s.lint.byRule))
      console.log(`      ${r}: ${n}`);
    console.log(
      `\n  ${passed}/${checks.length} checks, ${s.lint.errors} lint errors, compiles: ${tc.pass}\n`,
    );
  }
  process.exit(0);
}
