/*
 * Keyboard shortcuts, written once as a string: `mod+k`, `mod+shift+p`, `g`.
 *
 * `mod` is the platform's command modifier — ⌘ on a Mac, Ctrl elsewhere —
 * which is what almost every shortcut means. Writing `ctrl+k` would show a Mac
 * user a key they do not press for it; writing `meta+k` would ask everyone
 * else for the Windows key.
 *
 * The same string is shown by `Kbd` and matched by `CommandPalette`, so the
 * shortcut a palette opens on and the one its hint displays cannot disagree.
 */
type Modifier = 'mod' | 'ctrl' | 'alt' | 'shift' | 'meta';

const MODIFIERS: readonly Modifier[] = ['mod', 'ctrl', 'alt', 'shift', 'meta'];
const ALIASES: Record<string, string> = {
  cmd: 'meta',
  command: 'meta',
  option: 'alt',
  opt: 'alt',
  control: 'ctrl',
  esc: 'escape',
  return: 'enter',
  del: 'delete',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
};

export interface ParsedShortcut {
  modifiers: Set<Modifier>;
  key: string;
}

/** `mod+Shift+P` → `{ modifiers: {mod, shift}, key: 'p' }`. Throws on a shortcut with no key. */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
    .map((p) => ALIASES[p] ?? p);
  // `mod++` is mod and the plus key: an empty part after the split is `+`.
  const key = shortcut.endsWith('++') ? '+' : parts.pop();
  const modifiers = new Set<Modifier>();
  for (const p of parts) {
    if (!p) continue;
    if (!(MODIFIERS as readonly string[]).includes(p)) {
      throw new Error(
        `Shortcut "${shortcut}": "${p}" is not a modifier. Use mod, ctrl, alt, shift or meta, joined with "+".`,
      );
    }
    modifiers.add(p as Modifier);
  }
  if (!key || (MODIFIERS as readonly string[]).includes(key)) {
    throw new Error(`Shortcut "${shortcut}" has no key, only modifiers.`);
  }
  return { modifiers, key };
}

const MAC_SYMBOL: Record<string, string> = {
  mod: '⌘',
  meta: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
};
const MAC_NAME: Record<string, string> = {
  mod: 'Command',
  meta: 'Command',
  ctrl: 'Control',
  alt: 'Option',
  shift: 'Shift',
};
const OTHER_SYMBOL: Record<string, string> = {
  mod: 'Ctrl',
  ctrl: 'Ctrl',
  meta: 'Win',
  alt: 'Alt',
  shift: 'Shift',
};
const OTHER_NAME: Record<string, string> = {
  mod: 'Control',
  ctrl: 'Control',
  meta: 'Windows',
  alt: 'Alt',
  shift: 'Shift',
};
const KEY_SYMBOL: Record<string, [symbol: string, name: string]> = {
  enter: ['↵', 'Enter'],
  escape: ['Esc', 'Escape'],
  backspace: ['⌫', 'Backspace'],
  delete: ['Del', 'Delete'],
  tab: ['Tab', 'Tab'],
  space: ['Space', 'Space'],
  arrowup: ['↑', 'Up arrow'],
  arrowdown: ['↓', 'Down arrow'],
  arrowleft: ['←', 'Left arrow'],
  arrowright: ['→', 'Right arrow'],
};

/** macOS order: Control, Option, Shift, Command. Everywhere else: Ctrl, Alt, Shift. */
const ORDER: readonly Modifier[] = ['ctrl', 'alt', 'shift', 'mod', 'meta'];
const OTHER_ORDER: readonly Modifier[] = [
  'mod',
  'ctrl',
  'meta',
  'alt',
  'shift',
];

export interface ShortcutKey {
  /** What is printed on the key: `⌘`, `Ctrl`, `K`. */
  symbol: string;
  /** What a screen reader should say: `Command`, `Control`, `K`. */
  name: string;
}

/** The keys to draw, in the platform's conventional order. */
export function shortcutKeys(shortcut: string, isMac: boolean): ShortcutKey[] {
  const { modifiers, key } = parseShortcut(shortcut);
  const order = isMac ? ORDER : OTHER_ORDER;
  const keys = order
    .filter((m) => modifiers.has(m))
    // `mod` and `meta` are the same key on a Mac; draw it once.
    .filter((m) => !(isMac && m === 'meta' && modifiers.has('mod')))
    .map((m) => ({
      symbol: (isMac ? MAC_SYMBOL : OTHER_SYMBOL)[m],
      name: (isMac ? MAC_NAME : OTHER_NAME)[m],
    }));
  const named = KEY_SYMBOL[key];
  keys.push(
    named
      ? { symbol: named[0], name: named[1] }
      : { symbol: key.toUpperCase(), name: key.toUpperCase() },
  );
  return keys;
}

/** Whether a keydown is this shortcut — modifiers exact, so `mod+k` is not `mod+shift+k`. */
export function matchesShortcut(
  event: Pick<
    KeyboardEvent,
    'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'
  >,
  shortcut: ParsedShortcut,
  isMac: boolean,
): boolean {
  const { modifiers, key } = shortcut;
  const wantMeta = modifiers.has('meta') || (isMac && modifiers.has('mod'));
  const wantCtrl = modifiers.has('ctrl') || (!isMac && modifiers.has('mod'));
  if (event.metaKey !== wantMeta) return false;
  if (event.ctrlKey !== wantCtrl) return false;
  if (event.altKey !== modifiers.has('alt')) return false;
  if (event.shiftKey !== modifiers.has('shift')) return false;
  const pressed = event.key.toLowerCase();
  return pressed === key || (key === 'space' && pressed === ' ');
}
