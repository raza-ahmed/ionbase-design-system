import type { AriaButtonProps, AriaTextFieldProps } from 'react-aria';

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
 * The same, for `AriaTextFieldProps` — Input's prop type.
 *
 * Input had the opposite defect to Button's: it destructured ten named props
 * and never built a rest object at all, so nothing outside `AriaTextFieldProps`
 * ever reached the `<input>`. `data-testid` and every other custom attribute
 * vanished with no warning. Spreading the rest fixes that, but only if these
 * come out first.
 *
 * Sources, as of react-aria 3.50:
 *   LabelableProps  label
 *   HelpTextProps   description, errorMessage
 *   InputBase       isDisabled, isReadOnly
 *   Validation      isRequired, isInvalid, validationState, validationBehavior,
 *                   validate
 *   ValueBase       onChange — takes a string, not an event; `useTextField`
 *                   returns a real DOM handler in its place
 *   FocusEvents     onFocusChange
 *   FocusableDOMProps  excludeFromTabOrder
 *
 * Several of these Input already destructures by name; they are listed anyway
 * so this reads as a complete statement about the type rather than a diff
 * against one component's parameter list.
 *
 * `spellCheck` is the odd one out: a real input attribute, but React Aria types
 * it as `string` where React wants `Booleanish`, so forwarding it from the rest
 * spread does not typecheck. It is dropped rather than cast because
 * `useTextField` already returns it — verified: `inputProps` carries the whole
 * of `TextInputDOMProps`, `spellCheck` and `autoCorrect` included.
 *
 * `value` and `defaultValue` are here for a subtler reason than the rest.
 * "`inputProps` is spread afterwards and wins" only holds for the SAME key —
 * and `useTextField` always returns `value`, even when the caller passed
 * `defaultValue`. Forwarding `defaultValue` therefore puts both on the element
 * and React warns that the input is neither controlled nor uncontrolled. This
 * was a real regression, caught by the Input stories, not a precaution.
 *
 * `placeholder`, `name`, `autoComplete` and `id` stay out of the list: they are
 * single-key collisions, so `inputProps` genuinely does win.
 */
export const ARIA_TEXT_FIELD_NON_DOM_PROPS = [
  'label',
  'description',
  'errorMessage',
  'isDisabled',
  'isReadOnly',
  'isRequired',
  'isInvalid',
  'validationState',
  'validationBehavior',
  'validate',
  'onChange',
  'onFocusChange',
  'excludeFromTabOrder',
  'spellCheck',
  'value',
  'defaultValue',
] as const satisfies readonly (keyof AriaTextFieldProps)[];

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
