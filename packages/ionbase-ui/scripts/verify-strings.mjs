/**
 * Every string a component shows or announces must be one the caller can
 * replace — and this lists them all.
 *
 * Why a gate and not a review note: a hard-coded "Go to next page" reads as
 * finished in English, and nothing fails until a product ships in French and
 * finds English in its pager, its screen reader output, or an error message it
 * passes straight to the user. By then the string is in a released API.
 *
 * A string is OVERRIDABLE when it is one of:
 *
 *   - a prop's default, in the component's destructuring —
 *       `closeLabel = 'Close dialog'`
 *   - in a table of defaults the caller's `labels` are merged over — a const
 *     named `DEFAULTS`, `DEFAULT_*` or `default*`
 *   - the right of a `??` — the fallback for a value the caller can give,
 *       `resolution ?? statusLabel ?? DEFAULT_STATUS_LABELS[status]`
 *
 * Anything else that reads as words fails, with its file and line. A string
 * that is not for the user — a developer error, a brand name — carries an
 * `i18n-exempt: <reason>` comment on its line or the one above.
 *
 * Strings react-aria renders (the calendar's buttons, a number field's
 * steppers, a tag's remove button) are not here: react-aria ships them in
 * over thirty languages and picks them by the I18nProvider's locale.
 *
 * Writes dist/meta/strings.json, the inventory: every built-in string, where
 * it lives and how to replace it. `--list` prints it.
 */
import ts from 'typescript';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(PKG, 'src', 'components');
const OUT = join(PKG, 'dist', 'meta', 'strings.json');

/** Attributes and props whose values are code, never words. */
const CODE_NAMES =
  /^(className|class|id|key|role|type|name|variant|size|intent|as|placement|slot|href|target|rel|inputMode|autoComplete|d|viewBox|fill|stroke|strokeWidth|strokeLinecap|strokeLinejoin|xmlns|orientation|elementType|selectionMode|layout|align|justify|tone|status|mode|dir|lang|method|pattern|enterKeyHint|wrap|loading|decoding|shortcut|openShortcut|aria-(hidden|live|atomic|haspopup|current|orientation|sort|autocomplete|relevant|controls|describedby|labelledby|owns)|data-[\w-]+)$/;

/** Calls whose arguments are selectors, keys or developer messages. */
const CODE_CALLS =
  /^(log|warn|error|info|matchMedia|querySelector|querySelectorAll|closest|matches|setAttribute|getAttribute|removeAttribute|hasAttribute|createElement|addEventListener|removeEventListener|getPropertyValue|setProperty|require|invariant|parseShortcut)$/;

/** Keyboard key names, compared against `event.key`. */
const KEY_NAMES =
  /^(Arrow(Left|Right|Up|Down)|Enter|Escape|Tab|Home|End|PageUp|PageDown|Backspace|Delete|Shift|Meta|Control|Alt)$/;

const DEFAULTS_NAME = /^(DEFAULTS?|DEFAULT_\w+|default[A-Z]\w*)$/;

/** Does this read as words for a person, rather than a class, a key or CSS? */
function isProse(text, fromJsx) {
  const t = text.replace(/&\w+;/g, '').trim();
  if (!/[A-Za-z]{2}/.test(t)) return false;
  if (fromJsx) return true;
  if (KEY_NAMES.test(t)) return false;
  // SVG path data and inline SVG markup.
  if (/^[Mm][\d.\s,-]/.test(t) || t.startsWith('<')) return false;
  // Class lists: every token a class name, or a value.
  if (t.split(/\s+/).every((w) => /^(ion-|--)/.test(w) || /^(\{\})?$/.test(w)))
    return false;
  // CSS values and media queries.
  if (
    /(^|[\s(])(var|calc|minmax|repeat|rgb|rgba|min|max)\(|^\(?(min-|max-)?width\b|^--/.test(
      t,
    )
  )
    return false;
  // Words: a capitalised word, several words, a word beside a value —
  // `${n} more` — or a fragment joined onto one: ', better', ' pts'.
  return (
    /^[A-Z][a-z]/.test(t) ||
    /^[\s,.:;–—]+[A-Za-z]{2,}/.test(text) ||
    /[A-Za-z]{2,}\s+\S*[A-Za-z]/.test(t) ||
    (t.includes('{}') && /\s/.test(t) && /(^|\s)[A-Za-z]{2,}/.test(t))
  );
}

function sourceFiles() {
  return readdirSync(SRC)
    .filter((f) => /\.tsx?$/.test(f) && f !== 'index.ts')
    .map((f) => join(SRC, f));
}

/** The template's literal text, with `${…}` shown as `{}`. */
function templateText(node) {
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return (
    node.head.text +
    node.templateSpans.map((s) => '{}' + s.literal.text).join('')
  );
}

function scan(file) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found = [];
  const elements = [];
  const labelProps = [];

  /** The top-level component a node is written inside. */
  const ownerOf = (node) => {
    let p = node;
    while (p.parent && !ts.isSourceFile(p.parent)) p = p.parent;
    if (ts.isVariableStatement(p))
      return p.declarationList.declarations[0]?.name.getText(sf);
    if (ts.isFunctionDeclaration(p)) return p.name?.text;
    return undefined;
  };

  const exempt = (line) =>
    /i18n-exempt:\s*\S/.test(lines[line] ?? '') ||
    /i18n-exempt:\s*\S/.test(lines[line - 1] ?? '');

  /** Why this string is replaceable, or null when it is not. */
  function overridable(node) {
    let child = node;
    for (let p = node.parent; p; child = p, p = p.parent) {
      if (
        ts.isBinaryExpression(p) &&
        p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken &&
        p.right === child
      )
        return { how: 'fallback', name: p.left.getText(sf) };
      if (ts.isBindingElement(p) && p.initializer === child)
        return { how: 'prop', name: (p.propertyName ?? p.name).getText(sf) };
      if (ts.isParameter(p) && p.initializer === child)
        return { how: 'argument', name: p.name.getText(sf) };
      if (
        ts.isVariableDeclaration(p) &&
        ts.isIdentifier(p.name) &&
        DEFAULTS_NAME.test(p.name.text)
      )
        return table(node, p);
      if (ts.isStatement(p) || ts.isClassElement(p)) return null;
    }
    return null;
  }

  /**
   * A string in a table of defaults. `DEFAULTS` is merged under the
   * component's `labels`; any other table says what replaces it in an
   * `@replace` tag — `@replace statusLabel` — because only its author knows,
   * and an inventory that guesses is one an agent cannot act on.
   */
  function table(node, decl) {
    const path = [];
    for (let p = node.parent; p && p !== decl; p = p.parent)
      if (ts.isPropertyAssignment(p)) path.unshift(p.name.getText(sf));
    const tag = ts.getJSDocTags(decl).find((t) => t.tagName.text === 'replace');
    const by = tag
      ? ts.getTextOfJSDocComment(tag.comment)?.trim()
      : decl.name.text === 'DEFAULTS'
        ? 'labels'
        : undefined;
    if (!by) return { how: 'table', untagged: decl.name.text };
    const key = path.join('.');
    return {
      how: 'table',
      name: by === 'labels' ? `labels.${key}` : key ? `${by} → ${key}` : by,
    };
  }

  /** Is this literal code rather than copy, by where it sits? */
  function isCodePosition(node) {
    // A message built from pieces is judged by where the whole goes.
    let p = node.parent;
    while (
      (ts.isBinaryExpression(p) &&
        p.operatorToken.kind === ts.SyntaxKind.PlusToken) ||
      ts.isParenthesizedExpression(p)
    )
      p = p.parent;
    if (ts.isExpressionStatement(p)) return true; // 'use client'
    if (
      ts.isImportDeclaration(p) ||
      ts.isExportDeclaration(p) ||
      ts.isLiteralTypeNode(p)
    )
      return true;
    if (ts.isExternalModuleReference(p) || ts.isImportTypeNode?.(p))
      return true;
    const attr = ts.isJsxAttribute(p)
      ? p
      : ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent)
        ? p.parent
        : null;
    if (attr && CODE_NAMES.test(attr.name.getText(sf))) return true;
    if (
      ts.isPropertyAssignment(p) &&
      p.initializer === node &&
      CODE_NAMES.test(p.name.getText(sf))
    )
      return true;
    if (
      ts.isBindingElement(p) &&
      CODE_NAMES.test((p.propertyName ?? p.name).getText(sf))
    )
      return true;
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText(sf).split('.').pop();
      if (CODE_CALLS.test(callee)) return true;
    }
    if (ts.isNewExpression(p)) return true; // new Error('…'), new Intl…
    if (ts.isThrowStatement(p)) return true;
    if (ts.isElementAccessExpression(p)) return true; // rest['aria-label']
    if (ts.isBinaryExpression(p)) {
      const op = p.operatorToken.kind;
      if (
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken
      )
        return true;
      // X.displayName = 'X'
      if (
        op === ts.SyntaxKind.EqualsToken &&
        /\.displayName$/.test(p.left.getText(sf))
      )
        return true;
    }
    if (ts.isCaseClause(p)) return true;
    return false;
  }

  const visit = (node) => {
    let text;
    let jsx = false;
    if (ts.isJsxText(node)) {
      text = node.text;
      jsx = true;
    } else if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node)
    ) {
      text = ts.isStringLiteral(node) ? node.text : templateText(node);
    }
    // `${n} ${n === 1 ? 'command' : 'commands'}`: a plural chosen inside a
    // template is a word, however short.
    if (
      ts.isStringLiteral(node) &&
      /^[a-z]{2,}$/.test(node.text) &&
      ts.isConditionalExpression(node.parent) &&
      ts.findAncestor(node, ts.isTemplateSpan)
    )
      text = `{} ${node.text}`;
    let where = text !== undefined && isProse(text, jsx) && overridable(node);
    // `placement = 'bottom start'` is a default, but not words.
    const isCodeDefault =
      where && where.how === 'prop' && CODE_NAMES.test(where.name);
    if (isCodeDefault) where = false;
    if (
      where ||
      (!isCodeDefault &&
        text !== undefined &&
        isProse(text, jsx) &&
        (jsx || !isCodePosition(node)))
    ) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
      found.push({
        file: basename(file),
        line: line + 1,
        text: text.replace(/\s+/g, ' ').trim(),
        ...(where || {}),
        owner: ownerOf(node),
        exempt: !where && exempt(line),
      });
    }
    // A `labels`, `keyLabels`… prop: a component rendering this one must
    // hand it on, or its caller cannot reach those strings.
    if (
      ts.isBindingElement(node) &&
      /^labels$|Labels$/.test((node.propertyName ?? node.name).getText(sf))
    )
      labelProps.push({
        owner: ownerOf(node),
        name: (node.propertyName ?? node.name).getText(sf),
      });
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
      const props = node.attributes.properties;
      elements.push({
        file: basename(file),
        line: line + 1,
        tag: node.tagName.getText(sf),
        owner: ownerOf(node),
        attrs: new Set(
          props.filter(ts.isJsxAttribute).map((a) => a.name.getText(sf)),
        ),
        spread: props.some(ts.isJsxSpreadAttribute),
        exempt: exempt(line),
      });
    }
    // A template's spans are scanned as one string above; its inner literals
    // are still visited, for a nested template with words of its own.
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { found, elements, labelProps };
}

const scans = sourceFiles().map(scan);
const all = scans.flatMap((s) => s.found);
const failures = all.filter((s) => !s.how && !s.exempt);

/*
 * A string is only replaceable if the caller can reach it. PromptInput draws
 * an AgentStop; if it does not pass AgentStop's `label` on, "Stop" is fixed
 * for everyone who uses PromptInput. So every component with string props
 * must have them handed on wherever another component renders it.
 */
const forward = new Map();
const need = (owner, name) => {
  if (!owner) return;
  if (!forward.has(owner)) forward.set(owner, new Set());
  forward.get(owner).add(name);
};
for (const s of all) if (s.how === 'prop') need(s.owner, s.name);
for (const { labelProps } of scans)
  for (const l of labelProps) need(l.owner, l.name);
const unforwarded = scans
  .flatMap((s) => s.elements)
  .filter(
    (e) => forward.has(e.tag) && e.owner !== e.tag && !e.exempt && !e.spread,
  )
  .map((e) => ({
    ...e,
    missing: [...forward.get(e.tag)].filter((p) => !e.attrs.has(p)),
  }))
  .filter((e) => e.missing.length);
const untagged = [
  ...new Set(
    all.filter((s) => s.untagged).map((s) => `${s.file}  ${s.untagged}`),
  ),
];
const inventory = all.filter((s) => s.how && !s.untagged);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      $comment:
        'Every built-in string and how to replace it. how: "prop" — pass that prop; "table" — `replace` names the prop, or the key in `labels`; "fallback" — pass the value on the left of `??`; "argument" — pass that argument. Generated by scripts/verify-strings.mjs.',
      strings: inventory.map(({ file, line, text, how, name }) => ({
        file,
        line,
        text,
        how,
        replace: name,
      })),
    },
    null,
    2,
  ) + '\n',
);

if (process.argv.includes('--list'))
  for (const s of inventory)
    console.log(`${s.file}:${s.line}\t${s.name}\t${s.text}`);

if (failures.length) {
  console.error(
    `\n✗ ${failures.length} built-in string(s) a caller cannot replace:\n` +
      failures.map((s) => `  ${s.file}:${s.line}  "${s.text}"`).join('\n') +
      "\n\nMake each one a prop default, a key in the component's `labels`\n" +
      'defaults, or the fallback of a `??` — or, if no user ever reads it, mark\n' +
      'the line `// i18n-exempt: <reason>`. See AGENTS.md, "Built-in strings".\n',
  );
}
if (untagged.length) {
  console.error(
    `\n✗ ${untagged.length} table(s) of default strings with no \`@replace\` tag:\n` +
      untagged.map((u) => `  ${u}`).join('\n') +
      '\n\nSay in its doc comment what a caller passes instead —\n' +
      '`/** @replace statusLabel */`. Only a table named DEFAULTS, merged\n' +
      "under the component's `labels`, goes without.\n",
  );
}
if (unforwarded.length) {
  console.error(
    `\n✗ ${unforwarded.length} component(s) rendered without their strings handed on:\n` +
      unforwarded
        .map(
          (e) =>
            `  ${e.file}:${e.line}  <${e.tag}> needs ${e.missing.join(', ')}`,
        )
        .join('\n') +
      '\n\nGive the outer component a prop for each and pass it through, so its\n' +
      'caller can replace them too.\n',
  );
}
if (failures.length || untagged.length || unforwarded.length) process.exit(1);

console.log(
  `✓ strings: ${inventory.length} built-in strings, all replaceable; ${all.filter((s) => s.exempt).length} exempt with a reason`,
);
