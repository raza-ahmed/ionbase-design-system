import type { AriaButtonProps } from 'react-aria';

/**
 * React Aria prop types are not DOM prop types.
 *
 * A component that extends `AriaButtonProps` (or any other `Aria*Props`) and
 * then spreads its leftover props onto an element ships those extras straight
 * to the DOM. React logs `Unknown event handler property \`onPress\`. It will
 * be ignored.` for the handlers and renders the rest as stray attributes — and
 * nothing in this repo's build, lint, typecheck or Storybook run sees it,
 * because it is a runtime console warning in the consumer's app.
 *
 * The hooks already read these off the *full* props object, so dropping them
 * from the spread costs nothing: `useButton(props, ref)` still receives
 * `onPress` and still fires it.
 */

/**
 * Every `AriaButtonProps<'button'>` member that must not reach a `<button>`.
 *
 * Typed as `keyof AriaButtonProps<'button'>` on purpose: if a React Aria
 * upgrade renames or removes one of these, this array stops compiling rather
 * than silently going stale. That is the whole point — the bug this fixes was
 * a hand-maintained mental list drifting from the library's actual type.
 *
 * Sources, as of react-aria 3.50:
 *   PressEvents          onPress, onPressStart, onPressEnd, onPressChange,
 *                        onPressUp
 *   FocusEvents          onFocusChange
 *   FocusableDOMProps    excludeFromTabOrder
 *   AriaBaseButtonProps  preventFocusOnPress
 *   LinkButtonProps      elementType, href, target, rel
 *
 * `onClick` is deliberately absent: it is a real DOM handler, and `useButton`
 * returns its own `onClick` in `buttonProps`, which is spread afterwards and
 * wins. Also absent are the many members that *are* valid button attributes —
 * `type`, `name`, `value`, `form*`, `autoFocus`, `id`, `aria-*`, `onFocus`,
 * `onBlur`, `onKeyDown`, `onKeyUp` — those must keep flowing through.
 *
 * The `LinkButtonProps` four are here because this Button always renders a
 * `<button>`. `elementType` would draw React's unknown-prop warning; `href`,
 * `target` and `rel` would render as attributes a `<button>` does nothing
 * with.
 */
export const ARIA_BUTTON_NON_DOM_PROPS = [
  'onPress',
  'onPressStart',
  'onPressEnd',
  'onPressChange',
  'onPressUp',
  'onFocusChange',
  'excludeFromTabOrder',
  'preventFocusOnPress',
  'elementType',
  'href',
  'target',
  'rel',
] as const satisfies readonly (keyof AriaButtonProps<'button'>)[];

/**
 * Returns `props` without `keys`, leaving `props` untouched.
 *
 * Preferred over a destructure with a long list of ignored bindings: the list
 * lives next to the type it is derived from instead of being retyped in every
 * component, and `no-unused-vars` has nothing to complain about.
 */
export function omitProps<T extends object, K extends readonly PropertyKey[]>(
  props: T,
  keys: K,
): Omit<T, K[number]> {
  const result = { ...props } as Record<PropertyKey, unknown>;
  for (const key of keys) delete result[key];
  return result as Omit<T, K[number]>;
}
