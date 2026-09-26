'use client';

import React, { forwardRef, useId } from 'react';
import { Checkbox } from './Checkbox.js';
import { Radio, useIsInRadioGroup } from './Radio.js';

export interface SelectableTileProps {
  /** The option's value — what the group reports. */
  value: string;
  /** The option's name, and the tile's accessible name: "Pro", "Weekly". */
  title: React.ReactNode;
  /** What choosing it means, in a sentence. Read after the name. */
  description?: React.ReactNode;
  /** A decorative mark above the title. Hidden from assistive tech. */
  icon?: React.ReactNode;
  /**
   * More detail below the description — a price, a limit. Read with the
   * description. Text only: nothing inside a tile may be interactive, since
   * the whole tile is its control.
   */
  children?: React.ReactNode;
  isDisabled?: boolean;
  /** Standalone only, outside a group: whether it is ticked. */
  isSelected?: boolean;
  /** Standalone only: the starting state. */
  defaultSelected?: boolean;
  /** Standalone only: called with the new state. */
  onSelectionChange?: (isSelected: boolean) => void;
  className?: string;
}

/**
 * SelectableTile — a choice the size of a card: a plan, a schedule, a
 * template, with a sentence about each.
 *
 * A REAL CHECKBOX OR RADIO, THE SIZE OF A CARD. Inside a RadioGroup it is a
 * Radio; inside a CheckboxGroup, or alone, a Checkbox — the same native input
 * those render, so the group's name, value, required rule, disabled state and
 * error wiring all apply, arrow keys move between radios, and a form submits
 * it. The title is the input's label; its label is stretched over the tile,
 * so the whole card is the target, not only the box.
 *
 * THE NAME IS THE TITLE. The description and anything below it are read after
 * the name, through `aria-describedby`, rather than folded into it: "Pro,
 * radio button, 2 of 3, Unlimited agents and priority support".
 *
 * NOTHING INSIDE IS INTERACTIVE. The whole tile is one control; a link in it
 * would be unreachable by pointer and confusing by keyboard. Put a "Compare
 * plans" link beside the group.
 *
 * SELECTED IS MORE THAN A COLOUR. The tile's border thickens and takes the
 * brand colour, and the box or dot is filled — the same indicator as a plain
 * checkbox or radio, so the state survives greyscale and forced colours.
 */
export const SelectableTile = forwardRef<HTMLInputElement, SelectableTileProps>(
  (
    {
      value,
      title,
      description,
      icon,
      children,
      isDisabled,
      isSelected,
      defaultSelected,
      onSelectionChange,
      className,
    },
    ref,
  ) => {
    const inRadioGroup = useIsInRadioGroup();
    const detailsId = useId();
    const hasDetails = description != null || children != null;
    const describedBy = hasDetails ? detailsId : undefined;

    const control = inRadioGroup ? (
      <Radio
        ref={ref}
        value={value}
        isDisabled={isDisabled}
        aria-describedby={describedBy}
        className="ion-tile__control"
      >
        {title}
      </Radio>
    ) : (
      <Checkbox
        ref={ref}
        value={value}
        isDisabled={isDisabled}
        isSelected={isSelected}
        defaultChecked={defaultSelected}
        onSelectionChange={onSelectionChange}
        aria-describedby={describedBy}
        className="ion-tile__control"
      >
        {title}
      </Checkbox>
    );

    return (
      <div
        className={['ion-tile', className || ''].filter(Boolean).join(' ')}
        data-kind={inRadioGroup ? 'radio' : 'checkbox'}
      >
        {icon && (
          <span className="ion-tile__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {control}
        {hasDetails && (
          <div id={detailsId} className="ion-tile__details">
            {description != null && (
              <p className="ion-tile__description">{description}</p>
            )}
            {children != null && (
              <div className="ion-tile__extra">{children}</div>
            )}
          </div>
        )}
      </div>
    );
  },
);

SelectableTile.displayName = 'SelectableTile';
