import React, { forwardRef, useRef } from 'react';
import {
  useTabList,
  useTab,
  useTabPanel,
  useHover,
  useFocusRing,
  mergeProps,
  type AriaTabListProps,
} from 'react-aria';
import { useTabListState, type TabListState } from 'react-stately';
import { Item } from '@react-stately/collections';
import type { Node } from '@react-types/shared';

export type TabsType = 'pill' | 'underline';
export type TabsSize = 'sm' | 'md' | 'lg';

export interface TabsProps<T extends object> extends AriaTabListProps<T> {
  /** Visual style. Matches the Figma `Type` variant. */
  type?: TabsType;
  /** Matches the Figma `Size` variant. */
  size?: TabsSize;
  /**
   * Only `horizontal` is implemented. Figma also defines vertical; the prop
   * exists so adding it later is additive rather than a breaking rename.
   */
  orientation?: 'horizontal';
  className?: string;
}

/**
 * A single tab. `useTab` supplies roving tabindex, arrow-key navigation and the
 * aria-controls/aria-labelledby pairing with the panel.
 */
function Tab<T extends object>({
  item,
  state,
  type,
  size,
}: {
  item: Node<T>;
  state: TabListState<T>;
  type: TabsType;
  size: TabsSize;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { key, rendered } = item;
  const isDisabled = state.disabledKeys.has(key);

  const { tabProps, isSelected } = useTab({ key }, state, ref);
  // Same pattern as Button: native :hover latches on touch, and focus-visible
  // must distinguish keyboard from pointer.
  const { hoverProps, isHovered } = useHover({ isDisabled });
  const { focusProps, isFocusVisible } = useFocusRing();

  const className = [
    'ion-tabs__item',
    `ion-tabs__item--${type}`,
    size !== 'md' ? `ion-tabs__item--${size}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      {...mergeProps(tabProps, hoverProps, focusProps)}
      ref={ref}
      className={className}
      data-selected={isSelected || undefined}
      data-hovered={isHovered || undefined}
      data-focused={isFocusVisible || undefined}
      data-disabled={isDisabled || undefined}
    >
      {rendered}
    </div>
  );
}

function TabPanel<T extends object>({
  state,
  className,
  ...rest
}: {
  state: TabListState<T>;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const { tabPanelProps } = useTabPanel(rest, state, ref);

  return (
    <div
      {...tabPanelProps}
      ref={ref}
      className={['ion-tabs__panel', className].filter(Boolean).join(' ')}
    >
      {state.selectedItem?.props.children}
    </div>
  );
}

export const Tabs = forwardRef(function Tabs<T extends object>(
  props: TabsProps<T>,
  forwardedRef: React.Ref<HTMLDivElement>,
) {
  const {
    type = 'pill',
    size = 'md',
    orientation = 'horizontal',
    className: customClassName,
    ...ariaProps
  } = props;

  const state = useTabListState(ariaProps);
  const listRef = useRef<HTMLDivElement>(null);
  const { tabListProps } = useTabList(ariaProps, state, listRef);

  const trackClassName = [
    'ion-tabs__track',
    `ion-tabs__track--${type}`,
    `ion-tabs__track--${orientation}`,
  ].join(' ');

  return (
    <div
      ref={forwardedRef}
      className={['ion-tabs', customClassName].filter(Boolean).join(' ')}
    >
      <div {...tabListProps} ref={listRef} className={trackClassName}>
        {[...state.collection].map((item) => (
          <Tab
            key={item.key}
            item={item}
            state={state}
            type={type}
            size={size}
          />
        ))}
      </div>
      <TabPanel key={state.selectedItem?.key} state={state} />
    </div>
  );
}) as <T extends object>(
  props: TabsProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;

/** A tab and its panel content. `title` is the tab label; children are the panel. */
export { Item as TabItem };
