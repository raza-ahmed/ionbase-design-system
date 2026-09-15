import type { ChangeEvent, ChangeEventHandler } from 'react';

/**
 * Selection-prop resolution for the two checkbox-shaped controls.
 *
 * These components carried React Aria's `isDisabled` and `isIndeterminate`
 * beside the DOM's `checked` and `onChange(event)`. The mix is what makes the
 * wrong guess feel right: given Aria-shaped names, callers reach for the rest
 * of the Aria shape, and it did not compile. In the first full eval run this
 * was the single most common type error in generated code, and one file
 * invented a `CheckboxChange` type that exists nowhere in the package.
 *
 * Both shapes work now. `isSelected` is an alias for `checked`, and
 * `onSelectionChange` receives the boolean while `onChange` still receives the
 * event. Both handlers fire, in that order, so pairing them in either
 * combination behaves.
 *
 * WHY NOT ONE `onChange` THAT TAKES EITHER — this was measured, not assumed.
 * A union of function types is NOT additive: TypeScript cannot contextually
 * type a parameter against two signatures, so every existing
 * `onChange={(e) => …}` without an explicit annotation becomes an implicit
 * `any` and fails under `strict`. That is the most common real-world form, so
 * the "additive" overload would have broken more callers than it helped. A
 * second, differently-named handler is the only shape that adds the Aria
 * convention without taking the DOM one away.
 */
export interface SelectionProps {
  /** React Aria's name for `checked`. Wins when both are passed. */
  isSelected?: boolean;
  /** Receives the new selection state rather than the change event. */
  onSelectionChange?: (isSelected: boolean) => void;
}

export function resolveSelection(
  isSelected: boolean | undefined,
  checked: boolean | undefined,
  onChange: ChangeEventHandler<HTMLInputElement> | undefined,
  onSelectionChange: ((isSelected: boolean) => void) | undefined,
): {
  checked: boolean | undefined;
  onChange: ChangeEventHandler<HTMLInputElement> | undefined;
} {
  const resolvedChecked = isSelected !== undefined ? isSelected : checked;

  // Left undefined when neither handler is given, so an uncontrolled input
  // stays uncontrolled and React's "checked without onChange" warning still
  // reaches callers who have genuinely forgotten one.
  const resolvedOnChange =
    onChange || onSelectionChange
      ? (event: ChangeEvent<HTMLInputElement>) => {
          onChange?.(event);
          onSelectionChange?.(event.target.checked);
        }
      : undefined;

  return { checked: resolvedChecked, onChange: resolvedOnChange };
}
