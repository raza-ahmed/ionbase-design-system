/**
 * Disabled-prop resolution for the library-wide `isDisabled` convention.
 *
 * Canonical name is React Aria's `isDisabled`. Native `disabled` remains
 * accepted as a deprecated alias for one minor so callers are not broken on
 * the rename. When both are passed, `isDisabled` wins.
 */
export function resolveDisabled(
  isDisabled?: boolean,
  disabled?: boolean,
): boolean | undefined {
  if (isDisabled !== undefined) return isDisabled;
  if (disabled !== undefined) return disabled;
  return undefined;
}
