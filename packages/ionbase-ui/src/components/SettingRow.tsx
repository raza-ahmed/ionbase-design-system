import React, { cloneElement, forwardRef, isValidElement, useId } from 'react';

/** The ids a control needs to be named and described by the row. */
export interface SettingRowIds {
  labelId: string;
  descriptionId?: string;
}

export interface SettingRowProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** The setting's name. It becomes the control's accessible name. */
  label: React.ReactNode;
  /** What the setting does, announced with the control. */
  description?: React.ReactNode;
  /**
   * The control. Pass it as an element — `<Toggle />`, `<Select />`,
   * `<Button />` — and the row names and describes it for you. Pass a
   * function when the ids have to go somewhere other than the element's own
   * props; it receives them.
   */
  children:
    | React.ReactElement<{
        'aria-labelledby'?: string;
        'aria-describedby'?: string;
        children?: React.ReactNode;
      }>
    | ((ids: SettingRowIds) => React.ReactNode);
}

/**
 * SettingRow — one setting: its name and what it does on the left, the control
 * on the right. The row the SettingsPanel pattern is built from.
 *
 * THE WIRING IS THE POINT, NOT THE LAYOUT
 *
 * A label placed beside a Toggle looks labelled and is not: a screen reader
 * announces "switch, off" and nothing else, and the description is never read
 * at all. The pattern names this as its first a11y requirement, and the demo
 * app's stand-in handed the ids to a render function — which still left the
 * wiring as a step to remember. Here an element child is cloned with
 * `aria-labelledby` and `aria-describedby` already set, so the row cannot be
 * used without them. A value the caller passes explicitly wins, so an
 * existing name is never overwritten.
 *
 * A CONTROL WITH ITS OWN TEXT KEEPS ITS OWN NAME
 *
 * A Button reading "Delete workspace…" must be announced by that text — WCAG
 * 2.5.3 wants the visible words inside the accessible name, and a row label of
 * "Danger zone" would replace them. So a child with children of its own is
 * left named by them, and the row's label joins its description instead: the
 * setting is still announced, just as context rather than as the name.
 *
 * The label is text rather than a `<label>` because the control may not be a
 * form field, and a `<label>` pointing at a button is invalid.
 *
 * It stacks below 30rem of its OWN width, not the viewport's, so the same row
 * works in a full page and in a narrow drawer.
 */
export const SettingRow = forwardRef<HTMLDivElement, SettingRowProps>(
  ({ label, description, children, className, id, ...rest }, ref) => {
    const auto = useId();
    const base = id ?? auto;
    const labelId = `${base}-label`;
    const descriptionId = description ? `${base}-description` : undefined;

    let control: React.ReactNode;
    if (typeof children === 'function') {
      control = children({ labelId, descriptionId });
    } else if (isValidElement(children)) {
      const props = children.props as {
        'aria-labelledby'?: string;
        'aria-describedby'?: string;
        children?: React.ReactNode;
      };
      const namesItself = props.children != null && props.children !== false;
      const describedBy = namesItself
        ? [labelId, descriptionId].filter(Boolean).join(' ')
        : descriptionId;
      control = cloneElement(children, {
        'aria-labelledby':
          props['aria-labelledby'] ?? (namesItself ? undefined : labelId),
        'aria-describedby': props['aria-describedby'] ?? describedBy,
      });
    } else {
      control = children;
    }

    return (
      <div
        {...rest}
        id={id}
        ref={ref}
        className={['ion-setting-row', className || '']
          .filter(Boolean)
          .join(' ')}
      >
        <div className="ion-setting-row__inner">
          <div className="ion-setting-row__text">
            <span id={labelId} className="ion-setting-row__label">
              {label}
            </span>
            {description && (
              <span id={descriptionId} className="ion-setting-row__description">
                {description}
              </span>
            )}
          </div>
          <div className="ion-setting-row__control">{control}</div>
        </div>
      </div>
    );
  },
);

SettingRow.displayName = 'SettingRow';
