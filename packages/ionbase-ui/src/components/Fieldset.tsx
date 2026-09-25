import React, { forwardRef, useId } from 'react';

export type FieldsetOrientation = 'vertical' | 'horizontal';

export interface FieldsetProps extends Omit<
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'disabled'
> {
  /** The question the fields answer. Renders as the `<legend>`. */
  label?: React.ReactNode;
  /** Help text beneath the fields. Replaced by `errorMessage` while invalid. */
  description?: React.ReactNode;
  /** Shown in the description's place while `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  /** Whether the group as a whole fails validation. */
  isInvalid?: boolean;
  /** How the fields flow. Horizontal wraps rather than overflowing. */
  orientation?: FieldsetOrientation;
  children?: React.ReactNode;
}

/**
 * The ids a group hands down to its own controls. Kept separate from the
 * rendering so CheckboxGroup and RadioGroup can give every checkbox and radio
 * the same `aria-describedby` the fieldset carries — see FieldsetShell.
 */
export function useFieldsetHelper(
  description: React.ReactNode,
  errorMessage: React.ReactNode,
  isInvalid: boolean | undefined,
) {
  const helperId = useId();
  // Input's convention: the error takes the helper's slot, it does not stack.
  const helper = isInvalid && errorMessage ? errorMessage : description;
  return { helper, helperId: helper ? helperId : undefined };
}

interface FieldsetShellProps extends Omit<
  FieldsetProps,
  'description' | 'errorMessage'
> {
  /** Only the choice groups may disable natively — see Fieldset. */
  disabled?: boolean;
  /** Choice groups space their options at 8, not a form's 16. */
  isChoiceGroup?: boolean;
  /** The description or the error, whichever shows — see useFieldsetHelper. */
  helper: React.ReactNode;
  helperId: string | undefined;
}

/**
 * The rendering shared by Fieldset, CheckboxGroup and RadioGroup.
 *
 * A real `<fieldset>`: the legend names the group for assistive technology and
 * the inputs stay grouped for form submission, neither of which a div with
 * `role="group"` gets for free.
 *
 * The fieldset is `display: block` on purpose. A rendered `<legend>` is not a
 * flex item — browsers lay it out in the fieldset's border, outside the flex
 * container — so a flex column here would put `gap` everywhere but under the
 * legend. The fields get a flex wrapper of their own instead.
 */
export const FieldsetShell = forwardRef<
  HTMLFieldSetElement,
  FieldsetShellProps
>((props, ref) => {
  const {
    label,
    isInvalid,
    orientation = 'vertical',
    isChoiceGroup = false,
    helper,
    helperId,
    className,
    children,
    'aria-describedby': describedBy,
    ...rest
  } = props;

  return (
    <fieldset
      {...rest}
      ref={ref}
      aria-describedby={
        [describedBy, helperId].filter(Boolean).join(' ') || undefined
      }
      data-invalid={isInvalid || undefined}
      className={[
        'ion-fieldset',
        isChoiceGroup ? 'ion-fieldset--choices' : '',
        orientation === 'horizontal' ? 'ion-fieldset--horizontal' : '',
        isInvalid ? 'ion-fieldset--error' : '',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && <legend className="ion-fieldset__legend">{label}</legend>}
      <div className="ion-fieldset__content">{children}</div>
      {helper && (
        <span id={helperId} className="ion-fieldset__helper">
          {helper}
        </span>
      )}
    </fieldset>
  );
});

FieldsetShell.displayName = 'FieldsetShell';

/**
 * Groups related fields under one label, with one description and one error —
 * an address, a date range typed as two fields, a set of limits.
 *
 * For checkboxes use CheckboxGroup and for radios RadioGroup: both render this
 * same shell, and add the selection state it deliberately does not own.
 *
 * There is no `isDisabled`. A native `disabled` fieldset does disable every
 * control inside, but Input, Select and the rest draw their disabled state from
 * their own prop, so the fields would stop working while still looking live.
 * Disable the fields themselves; the choice groups can cascade because their
 * checkboxes and radios style off `:disabled`.
 */
export const Fieldset = forwardRef<HTMLFieldSetElement, FieldsetProps>(
  (props, ref) => {
    const { description, errorMessage, ...rest } = props;
    const { helper, helperId } = useFieldsetHelper(
      description,
      errorMessage,
      rest.isInvalid,
    );
    return (
      <FieldsetShell {...rest} ref={ref} helper={helper} helperId={helperId} />
    );
  },
);

Fieldset.displayName = 'Fieldset';
