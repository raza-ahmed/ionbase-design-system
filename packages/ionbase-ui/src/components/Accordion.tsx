'use client';

import React, {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
} from 'react';

export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6;

interface AccordionContextValue {
  expanded: Set<string>;
  toggle: (id: string) => void;
  headingLevel: AccordionHeadingLevel;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

export interface AccordionProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange'
> {
  /** Let more than one section be open at once. */
  allowsMultiple?: boolean;
  /** Uncontrolled: which sections start open. */
  defaultExpandedKeys?: string[];
  /** Controlled: which sections are open. Pass `onExpandedChange` with it. */
  expandedKeys?: string[];
  onExpandedChange?: (keys: string[]) => void;
  /**
   * The level each section's heading renders at. Must fit the surrounding
   * document — a panel inside an `h2` section wants `3`.
   */
  headingLevel?: AccordionHeadingLevel;
  children?: React.ReactNode;
}

export interface AccordionItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title' | 'id'
> {
  /** Stable identity for the open set. Required. */
  id: string;
  /** The always-visible label. */
  title: React.ReactNode;
  isDisabled?: boolean;
  children?: React.ReactNode;
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
 * Accordion — sections that collapse, with the heading structure intact.
 *
 * WHY THE TRIGGER IS A BUTTON INSIDE A HEADING
 *
 * Both parts are load-bearing and the obvious implementations drop one of them.
 * The heading is how a screen-reader user navigates a long page — pressing `h`
 * moves between sections, and an accordion built from `div`s removes every one
 * of those stops. The button is what makes the section operable by keyboard and
 * announced as expandable; a heading with a click handler is neither.
 *
 * So the shape is `<h3><button aria-expanded aria-controls>`, which is the only
 * arrangement that keeps document structure AND operability.
 *
 * `headingLevel` is a prop with no safe default beyond 3, because the right
 * level depends on the document around it and nothing here can see that. Two
 * accordions at the wrong level produce a page whose outline is nonsense while
 * looking perfectly fine.
 *
 * THE PANEL IS NOT UNMOUNTED
 *
 * Collapsed sections keep their DOM and are hidden with `hidden`. Unmounting
 * would lose form state in a collapsed section — the classic multi-step-form
 * bug where answers vanish when a section is folded away — and would break
 * in-page search, which cannot find text that is not there.
 */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
  (
    {
      allowsMultiple = false,
      defaultExpandedKeys,
      expandedKeys,
      onExpandedChange,
      headingLevel = 3,
      children,
      className,
      ...rest
    },
    ref,
  ) => {
    const [internal, setInternal] = useState<string[]>(
      defaultExpandedKeys ?? [],
    );
    const isControlled = expandedKeys !== undefined;
    const current = isControlled ? expandedKeys : internal;

    const toggle = (id: string) => {
      const open = current.includes(id);
      const next = open
        ? current.filter((k) => k !== id)
        : allowsMultiple
          ? [...current, id]
          : [id];
      if (!isControlled) setInternal(next);
      onExpandedChange?.(next);
    };

    return (
      <AccordionContext.Provider
        value={{ expanded: new Set(current), toggle, headingLevel }}
      >
        <div
          {...rest}
          ref={ref}
          className={['ion-accordion', className || '']
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
      </AccordionContext.Provider>
    );
  },
);

Accordion.displayName = 'Accordion';

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ id, title, isDisabled = false, children, className, ...rest }, ref) => {
    const ctx = useContext(AccordionContext);
    if (!ctx) {
      throw new Error('AccordionItem must be rendered inside an Accordion');
    }
    const { expanded, toggle, headingLevel } = ctx;
    const reactId = useId();
    const buttonId = `${reactId}-trigger`;
    const panelId = `${reactId}-panel`;
    const isExpanded = expanded.has(id);
    const Heading = `h${headingLevel}` as const;

    return (
      <div
        {...rest}
        ref={ref}
        data-expanded={isExpanded || undefined}
        className={['ion-accordion__item', className || '']
          .filter(Boolean)
          .join(' ')}
      >
        <Heading className="ion-accordion__heading">
          <button
            type="button"
            id={buttonId}
            className="ion-accordion__trigger"
            aria-expanded={isExpanded}
            aria-controls={panelId}
            disabled={isDisabled}
            onClick={() => toggle(id)}
          >
            <span className="ion-accordion__title">{title}</span>
            <span className="ion-accordion__indicator" aria-hidden="true">
              <Chevron />
            </span>
          </button>
        </Heading>
        {/*
          Hidden, not unmounted: a collapsed section keeps its form state, and
          in-page search can still find text inside it.
        */}
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          hidden={!isExpanded}
          className="ion-accordion__panel"
        >
          <div className="ion-accordion__content">{children}</div>
        </div>
      </div>
    );
  },
);

AccordionItem.displayName = 'AccordionItem';
