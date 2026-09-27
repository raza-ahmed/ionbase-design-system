import React from 'react';
import type { Selection } from '@react-types/shared';
import { Button, type ButtonProps } from './Button.js';
import { Menu, MenuItem, MenuTrigger } from './Menu.js';
import type { UseTableColumnsResult } from './use-table-columns.js';

export interface TableColumnsMenuProps<Key extends string> {
  /** What `useTableColumns` returned. */
  columns: UseTableColumnsResult<Key>;
  /** The button's text, and so the menu's name. "Columns" by default. */
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

/**
 * TableColumnsMenu — a Button that opens a checklist of a table's columns:
 * checked is shown. A Menu with multiple selection, so each row is a
 * `menuitemcheckbox` that says whether its column is shown, and the menu
 * stays open while several are changed.
 *
 * A column that cannot be hidden is listed, checked and disabled, so the
 * list is every column and says why that one stays. The last one shown is
 * disabled too: a table with no columns is not a view of anything.
 */
export function TableColumnsMenu<Key extends string>({
  columns,
  label = 'Columns',
  variant = 'secondary',
  size = 'sm',
}: TableColumnsMenuProps<Key>) {
  const shown = columns.visibleColumns.map((c) => c.key);
  const disabled = columns.columns
    .filter(
      (c) => c.canHide === false || (shown.length === 1 && shown[0] === c.key),
    )
    .map((c) => c.key);

  const onSelectionChange = (selection: Selection) => {
    if (selection === 'all') return columns.setHidden([]);
    columns.setHidden(
      columns.columns.map((c) => c.key).filter((k) => !selection.has(k)),
    );
  };

  return (
    <MenuTrigger placement="bottom end">
      <Button variant={variant} size={size}>
        {label}
      </Button>
      <Menu
        selectionMode="multiple"
        selectedKeys={new Set(shown)}
        disabledKeys={disabled}
        onSelectionChange={onSelectionChange}
      >
        {columns.columns.map((c) => (
          <MenuItem key={c.key}>{c.label}</MenuItem>
        ))}
      </Menu>
    </MenuTrigger>
  );
}
