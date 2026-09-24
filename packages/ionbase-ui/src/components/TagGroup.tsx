'use client';

import React, { useEffect, useRef } from 'react';
import {
  useButton,
  useFocusRing,
  useHover,
  useTag,
  useTagGroup,
  mergeProps,
  type AriaTagGroupProps,
} from 'react-aria';
import { useListState, type ListState } from 'react-stately';
import { Item } from '@react-stately/collections';
import type { Key, Node } from '@react-types/shared';

export type TagGroupSize = 'sm' | 'md';

export interface TagGroupProps<T extends object> extends Omit<
  AriaTagGroupProps<T>,
  | 'selectionMode'
  | 'selectionBehavior'
  | 'selectedKeys'
  | 'defaultSelectedKeys'
  | 'onSelectionChange'
  | 'disallowEmptySelection'
  | 'shouldSelectOnPressUp'
  | 'escapeKeyBehavior'
  | 'onAction'
  | 'errorMessage'
> {
  /**
   * Called with the keys of the tags to remove — from a tag's × button, or
   * Delete / Backspace on a focused tag. Pass it and every tag shows a remove
   * button; leave it out and the tags are read-only labels. The group does
   * not remove anything itself: drop the keys from your own list.
   */
  onRemove?: (keys: Set<Key>) => void;
  /** Figma's `Size`. Set once here, so every tag in a group matches. */
  size?: TagGroupSize;
  /**
   * Shown in place of the tags when there are none — "No filters applied".
   * Without it an empty group renders nothing but its label.
   */
  emptyLabel?: React.ReactNode;
  className?: string;
}

const RemoveIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

function RemoveButton(props: Parameters<typeof useButton>[0]) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(props, ref);
  const { focusProps, isFocusVisible } = useFocusRing();
  return (
    <button
      {...mergeProps(buttonProps, focusProps)}
      ref={ref}
      className="ion-tag__remove"
      data-focus-visible={isFocusVisible || undefined}
    >
      <RemoveIcon />
    </button>
  );
}

function TagRow<T>({ item, state }: { item: Node<T>; state: ListState<T> }) {
  const ref = useRef<HTMLDivElement>(null);
  const { focusProps, isFocusVisible } = useFocusRing();
  const { hoverProps, isHovered } = useHover({});
  const {
    rowProps,
    gridCellProps,
    removeButtonProps,
    allowsRemoving,
    isDisabled,
  } = useTag({ item }, state, ref);

  return (
    <div
      {...mergeProps(rowProps, focusProps, hoverProps)}
      ref={ref}
      className={[
        'ion-tag',
        isDisabled ? 'ion-tag--disabled' : '',
        allowsRemoving ? 'ion-tag--removable' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-focus-visible={isFocusVisible || undefined}
      data-hovered={isHovered || undefined}
    >
      <div {...gridCellProps} className="ion-tag__cell">
        <span className="ion-tag__label">{item.rendered}</span>
        {allowsRemoving && <RemoveButton {...removeButtonProps} />}
      </div>
    </div>
  );
}

/**
 * TagGroup — labels a person applied and can take away: active filters, the
 * labels on a record, the recipients of a message.
 *
 * NOT A BADGE
 *
 * A Badge reports a state the system decided — Failing, Paid. A Tag is a
 * choice someone made, which is why it is removable and why it is neutral:
 * colouring tags by intent would make "Status: Failing" as a filter look like
 * the agent is failing.
 *
 * WHAT REACT ARIA GIVES IT
 *
 * `useTagGroup` makes the group one tab stop with arrow keys between tags, a
 * remove button per tag named "Remove <tag>", and Delete / Backspace to remove
 * the focused one. When a tag goes, focus moves to its neighbour. The one case
 * React Aria leaves open is the last tag: focus would fall to <body>, so the
 * group takes it instead and reads out `emptyLabel`.
 *
 * No selection: a chip that toggles on and off is a SegmentedControl or a
 * Checkbox, which already say "selected" the way a screen reader expects.
 */
export function TagGroup<T extends object>(props: TagGroupProps<T>) {
  const {
    size = 'sm',
    emptyLabel,
    className,
    label,
    description,
    onRemove,
  } = props;
  const gridRef = useRef<HTMLDivElement>(null);
  const refocusGroup = useRef(false);

  // Wrapped so the group knows a removal it took focus from has happened.
  const handleRemove = onRemove
    ? (keys: Set<Key>) => {
        refocusGroup.current = !!gridRef.current?.contains(
          document.activeElement,
        );
        onRemove(keys);
      }
    : undefined;

  const ariaProps = { ...props, onRemove: handleRemove };
  const state = useListState(ariaProps);
  const { gridProps, labelProps, descriptionProps } = useTagGroup(
    ariaProps,
    state,
    gridRef,
  );
  const isEmpty = state.collection.size === 0;

  useEffect(() => {
    if (refocusGroup.current && isEmpty) gridRef.current?.focus();
    refocusGroup.current = false;
  }, [isEmpty]);

  return (
    <div
      className={['ion-tag-group', `ion-tag-group--${size}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <div {...labelProps} className="ion-tag-group__label">
          {label}
        </div>
      )}
      <div
        {...gridProps}
        ref={gridRef}
        // Empty, React Aria drops the grid role — an empty grid is an error.
        // It becomes a named group instead, focusable only then, so the last
        // removal lands somewhere that says "Active filters, No filters applied".
        role={isEmpty ? 'group' : gridProps.role}
        tabIndex={isEmpty ? -1 : gridProps.tabIndex}
        className="ion-tag-group__list"
      >
        {isEmpty
          ? emptyLabel && <p className="ion-tag-group__empty">{emptyLabel}</p>
          : [...state.collection].map((item) => (
              <TagRow key={item.key} item={item} state={state} />
            ))}
      </div>
      {description && (
        <div {...descriptionProps} className="ion-tag-group__description">
          {description}
        </div>
      )}
    </div>
  );
}

/**
 * One tag. The children are its label; `key` is what `onRemove` hands back.
 * Give it `textValue` when the children are not plain text.
 */
export { Item as Tag };
