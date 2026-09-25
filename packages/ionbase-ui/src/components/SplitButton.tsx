'use client';

import React from 'react';
import { useId } from 'react-aria';
import type { CollectionChildren, Key } from '@react-types/shared';
import { Button, type ButtonProps } from './Button.js';
import { Menu, MenuTrigger } from './Menu.js';

export type SplitButtonVariant =
  'primary-brand' | 'primary-neutral' | 'secondary';

export interface SplitButtonProps {
  /** The main action's label — "Save", "Run now". */
  label: string;
  /** The main action. */
  onPress?: ButtonProps['onPress'];
  /** `type="submit"` makes the main action submit its form. */
  type?: 'button' | 'submit';
  /**
   * The alternatives, as MenuItems — "Save as draft", "Run with a test
   * input". Each is a variation on the main action, not a different one.
   */
  children: CollectionChildren<object>;
  /** An alternative was chosen, by its MenuItem `key`. */
  onAction?: (key: Key) => void;
  /**
   * The menu button's name, read with the main label: "More options, Save".
   * Default "More options" — pass the translation.
   */
  menuLabel?: string;
  /** The main action's weight. Tertiary and destructive are not offered. */
  variant?: SplitButtonVariant;
  size?: ButtonProps['size'];
  startIcon?: React.ReactNode;
  /** Disables both halves. */
  isDisabled?: boolean;
  /** Disables only the menu — the alternatives are unavailable, the action is not. */
  isMenuDisabled?: boolean;
  /** MenuItem keys to disable. */
  disabledKeys?: Iterable<Key>;
  className?: string;
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m6 9 6 6 6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * SplitButton — one main action, with a menu of variations on it beside:
 * Save, and Save as draft; Run now, and Run with a test input.
 *
 * TWO BUTTONS, TWO TAB STOPS
 *
 * The halves are separate Buttons in a `group`, not one control with a hot
 * zone. Each is announced and reached on its own: the main one by its label,
 * the menu one as "More options, Save" — its own name, then the action it
 * belongs to, so a page with three split buttons has three distinct menu
 * buttons, not three called "More options". The menu one is a MenuTrigger,
 * so it announces `aria-haspopup` and `aria-expanded`, and ↓ opens it.
 *
 * NOT A MENU WITH A DEFAULT. Pressing the main half does the action, always
 * the same one; it never becomes whichever alternative was chosen last. A
 * button whose meaning changes with history cannot be pressed with
 * confidence.
 */
export function SplitButton({
  label,
  onPress,
  type = 'button',
  children,
  onAction,
  menuLabel = 'More options',
  variant = 'primary-brand',
  size = 'md',
  startIcon,
  isDisabled,
  isMenuDisabled,
  disabledKeys,
  className,
}: SplitButtonProps) {
  const mainId = useId();
  const menuId = useId();
  return (
    <div
      role="group"
      aria-labelledby={mainId}
      className={['ion-split-button', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <Button
        id={mainId}
        type={type}
        variant={variant}
        size={size}
        startIcon={startIcon}
        isDisabled={isDisabled}
        onPress={onPress}
        className="ion-split-button__main"
      >
        {label}
      </Button>
      <MenuTrigger
        placement="bottom end"
        isDisabled={isDisabled || isMenuDisabled}
      >
        <Button
          id={menuId}
          variant={variant}
          size={size}
          aria-label={menuLabel}
          aria-labelledby={`${menuId} ${mainId}`}
          startIcon={<Chevron />}
          className="ion-split-button__menu"
        />
        <Menu onAction={onAction} disabledKeys={disabledKeys}>
          {children}
        </Menu>
      </MenuTrigger>
    </div>
  );
}

SplitButton.displayName = 'SplitButton';
