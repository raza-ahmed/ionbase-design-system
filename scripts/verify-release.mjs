#!/usr/bin/env node
/**
 * Is `main` ready to publish? Everything but the upload.
 *
 *   pnpm release:check
 *
 * Lint, typecheck and the stories prove the code; none of them prove the
 * tarball. A file left out of `files`, an export pointing at a path the build
 * never wrote, a `workspace:` range left in a dependency: each passes every
 * gate in the repo and breaks the first `npm i`. So this packs the package the
 * way `pnpm publish` does, installs it into an empty project outside the
 * monorepo, and uses it from there:
 *
 *   1. the tree is clean, on main, level with origin, and the version is new
 *      to npm and is the changelog's top entry;
 *   2. the tarball has no `workspace:` range and every export resolves, and
 *      the files it adds and drops against the published version are listed;
 *   3. the package imports in Node and server-renders a component;
 *   4. the patterns' worked examples type-check against the installed types,
 *      as an app's `tsc` would see them.
 *
 * It touches nothing outside a temp directory, and it never publishes.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = join(ROOT, 'packages', 'ionbase-ui');
const {
  name,
  version,
  exports: EXPORTS,
} = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'));

const run = (cmd, args, cwd = ROOT) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();

const failures = [];
const check = (ok, pass, fail) => {
  console.log(`  ${ok ? '✔' : '✖'} ${ok ? pass : fail}`);
  if (!ok) failures.push(fail);
};

console.log(`\n${name}@${version}\n`);

/* 1. The commit and the version. */
check(
  run('git', ['status', '--porcelain']) === '',
  'tree is clean',
  'tree has uncommitted changes — pnpm publish refuses',
);
const branch = run('git', ['branch', '--show-current']);
check(branch === 'main', 'on main', `on ${branch}, not main`);
run('git', ['fetch', '--quiet', 'origin', 'main']);
check(
  run('git', ['rev-parse', 'HEAD']) ===
    run('git', ['rev-parse', 'origin/main']),
  'level with origin/main',
  'HEAD is not origin/main — pull, or push what is here',
);
let published = '';
try {
  published = run('npm', ['view', `${name}@${version}`, 'version']);
} catch {
  // Not found is what a new version looks like.
}
check(
  published === '',
  `${version} is not on npm yet`,
  `${version} is already published — bump the version`,
);
const top = readFileSync(join(PKG, 'CHANGELOG.md'), 'utf8').match(
  /^## (\S+)/m,
)?.[1];
check(
  top === version,
  `CHANGELOG's top entry is ${version}`,
  `CHANGELOG's top entry is ${top}, not ${version}`,
);
/* Built here, by the package's own script, not taken from whatever dist/
 * holds. `pnpm build` goes through turbo, and a turbo cache hit restores dist/
 * on top of what is there without running the build's clean step, so a file
 * from an older build survives it. The package's script always starts from an
 * empty dist/. */
console.log('  … building the package from an empty dist/');
let built = true;
try {
  run('pnpm', ['--filter', name, 'run', 'build']);
} catch (e) {
  built = false;
  console.error(
    String(e.stdout ?? '')
      .split('\n')
      .slice(-15)
      .join('\n'),
  );
}
check(
  built && existsSync(join(PKG, 'dist', 'index.js')),
  'built from an empty dist/',
  'the build failed',
);
if (!built) process.exit(1);

/* 2. The tarball. */
const tmp = mkdtempSync(join(tmpdir(), 'ionbase-release-'));
try {
  run('pnpm', ['pack', '--pack-destination', tmp], PKG);
  const tarball = join(
    tmp,
    readdirSync(tmp).find((f) => f.endsWith('.tgz')),
  );
  const manifest = run('tar', ['-xOzf', tarball, 'package/package.json']);

  /* What changes for someone upgrading: the files this tarball adds and drops
   * against the one on npm now. Not a failure, a list to read before
   * publishing. A file nobody meant to ship or to drop shows up here; 0.138.0
   * shipped a stale contract that this would have listed. */
  try {
    const latest = run('npm', ['view', name, 'version']);
    // Its own directory: at the same version the two tarballs share a name.
    const was = join(tmp, 'published');
    run('mkdir', ['-p', was]);
    run('npm', [
      'pack',
      '--silent',
      `${name}@${latest}`,
      '--pack-destination',
      was,
    ]);
    const list = (file) =>
      new Set(
        run('tar', ['-tzf', file])
          .split('\n')
          .filter((f) => !f.endsWith('/')),
      );
    const next = list(tarball);
    const prev = list(join(was, `${name}-${latest}.tgz`));
    const added = [...next].filter((f) => !prev.has(f));
    const dropped = [...prev].filter((f) => !next.has(f));
    console.log(
      `  · against ${latest} on npm: ${next.size} files, ${added.length} added, ${dropped.length} dropped`,
    );
    for (const [sign, files] of [
      ['+', added],
      ['-', dropped],
    ]) {
      for (const f of files.slice(0, 12))
        console.log(`      ${sign} ${f.replace(/^package\//, '')}`);
      if (files.length > 12)
        console.log(`      ${sign} …and ${files.length - 12} more`);
    }
  } catch {
    console.log('  · no published version to compare files against');
  }
  check(
    !manifest.includes('workspace:'),
    'no workspace: ranges in the packed manifest',
    'the packed manifest still has a workspace: range',
  );

  const app = join(tmp, 'app');
  cpSync(join(PKG, 'dist', 'meta', 'patterns', 'examples'), join(app, 'src'), {
    recursive: true,
  });
  writeFileSync(
    join(app, 'package.json'),
    '{ "name": "app", "private": true, "type": "module" }',
  );
  console.log('  … installing the tarball into an empty project');
  run(
    'npm',
    [
      'i',
      '--no-audit',
      '--no-fund',
      '--silent',
      tarball,
      'react@19',
      'react-dom@19',
      'typescript@5',
      '@types/react@19',
      '@types/react-dom@19',
    ],
    app,
  );

  /* Every export, through the installed package's own exports map. A
   * wildcard is tried with the first file the build wrote there. */
  const unresolved = [];
  for (const [key, value] of Object.entries(EXPORTS)) {
    let sub = key;
    if (key.endsWith('/*')) {
      const target = typeof value === 'string' ? value : value.default;
      const dir = join(PKG, dirname(target.replace('*', 'x')));
      const first = readdirSync(dir, { withFileTypes: true }).find((f) =>
        f.isFile(),
      ).name;
      sub = key.replace('*', first);
    }
    const specifier = sub === '.' ? name : `${name}/${sub.slice(2)}`;
    // `import.meta.resolve` maps a specifier to a URL without opening it,
    // so the file it names is checked for separately.
    try {
      const url = run(
        'node',
        [
          '--input-type=module',
          '-e',
          `console.log(import.meta.resolve(${JSON.stringify(specifier)}))`,
        ],
        app,
      );
      if (!existsSync(fileURLToPath(url))) unresolved.push(specifier);
    } catch {
      unresolved.push(specifier);
    }
  }
  check(
    !unresolved.length,
    `all ${Object.keys(EXPORTS).length} exports resolve from the installed package`,
    `exports that do not resolve: ${unresolved.join(', ')}`,
  );

  /* 3. It runs. */
  try {
    const out = run(
      'node',
      [
        '--input-type=module',
        '-e',
        `import { createElement } from 'react';
         import { renderToString } from 'react-dom/server';
         const m = await import('${name}');
         const html = renderToString(createElement(m.Button, { variant: 'primary-brand' }, 'Save'));
         if (!/ion-button/.test(html)) throw new Error('Button rendered no ion-button');
         console.log(Object.keys(m).length);`,
      ],
      app,
    );
    check(
      true,
      `imports in Node (${out} exports) and server-renders Button`,
      '',
    );
  } catch (e) {
    check(
      false,
      '',
      `the installed package does not run: ${String(e.stderr || e.message).split('\n')[0]}`,
    );
  }

  /* 4. The worked examples, as an app compiles them. */
  writeFileSync(
    join(app, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      },
      include: ['src'],
    }),
  );
  try {
    run(join(app, 'node_modules', '.bin', 'tsc'), ['-p', '.'], app);
    check(
      true,
      'the worked examples type-check against the installed types',
      '',
    );
  } catch (e) {
    check(false, '', `the worked examples do not type-check:\n${e.stdout}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\nNot ready: ${failures.length} problem(s).\n`);
  process.exit(1);
}
console.log(`
Ready. To publish:

  pnpm --filter ${name} publish --access public    # add --otp <code> if npm asks
  npm view ${name} version                         # ${version}
  git tag v${version} && git push origin v${version}
`);
