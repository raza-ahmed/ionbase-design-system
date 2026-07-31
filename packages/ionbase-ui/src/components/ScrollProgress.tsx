'use client';

import React, {
  forwardRef,
  useState,
  useRef,
  useId,
  useEffect,
  useImperativeHandle,
} from 'react';
import { useHover } from 'react-aria';

export interface ScrollProgressSection {
  id: string;
  label: string;
}

export interface ScrollProgressProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  /** 0-100. The caller computes this from whatever it is tracking — a
   *  window scroll fraction, a custom scroll container, a reading-time
   *  estimate. This component has no opinion on the source. */
  progress: number;
  sections: ScrollProgressSection[];
  /** The section the rail's heavier tick and the panel's selected row point
   *  to. Also the caller's to compute — see `progress`. */
  activeId?: string;
  /** Fired when a row is chosen. The component does not scroll anywhere
   *  itself; matching Menu, it reports the choice and lets the caller decide
   *  what "select this section" means for their page. */
  onSelect?: (id: string) => void;
}

/**
 * The compact rail is the disclosure trigger. It is a real `<button>`, so a
 * keyboard user reaches it by Tab and opens it the same way as any button —
 * Enter or Space — no `:focus-within` trick required; a mouse user can also
 * just hover it. Built as a WAI-ARIA Disclosure (`aria-expanded` +
 * `aria-controls`) rather than a menu: see the CSS header for why
 * `role="menu"` is deliberately not used here.
 *
 * Closes on outside pointerdown and on Escape — the minimum a disclosure
 * needs to not trap the page once opened, not a full popover/focus-trap
 * implementation.
 */
export const ScrollProgress = forwardRef<HTMLDivElement, ScrollProgressProps>(
  (
    { progress, sections, activeId, onSelect, className, ...rest },
    forwardedRef,
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const isTriggerHovered = useRef(false);
    const isPanelHovered = useRef(false);
    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const panelId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(forwardedRef, () => containerRef.current!);

    /*
     * Two separate hover regions, not one on the outer container: the panel
     * is `position: absolute` and doesn't expand the container's own layout
     * box, so a single hover region sized to the trigger would see the
     * pointer leave (and close the panel) the moment it travels from the
     * trigger into the panel to click a row. The panel stays open as long as
     * either region is hovered.
     *
     * Closing is debounced by 100ms: the trigger and the panel don't touch,
     * so the cursor crosses a dead zone between them on the way from one to
     * the other, briefly leaving both. Closing instantly on that gap, rather
     * than giving the pointer a moment to arrive somewhere that counts, is
     * the same "safe triangle" problem every hoverable popover has.
     */
    const scheduleClose = () => {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = setTimeout(() => {
        if (!isTriggerHovered.current && !isPanelHovered.current) {
          setIsOpen(false);
        }
      }, 100);
    };

    useEffect(() => () => clearTimeout(closeTimeoutRef.current), []);

    const { hoverProps: triggerHoverProps, isHovered } = useHover({
      onHoverChange: (hovered) => {
        isTriggerHovered.current = hovered;
        if (hovered) {
          clearTimeout(closeTimeoutRef.current);
          setIsOpen(true);
        } else {
          scheduleClose();
        }
      },
    });
    const { hoverProps: panelHoverProps } = useHover({
      onHoverChange: (hovered) => {
        isPanelHovered.current = hovered;
        if (hovered) {
          clearTimeout(closeTimeoutRef.current);
          setIsOpen(true);
        } else {
          scheduleClose();
        }
      },
    });

    useEffect(() => {
      if (!isOpen) return;

      function handlePointerDown(e: PointerEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
        }
      }
      function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') setIsOpen(false);
      }

      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen]);

    const roundedProgress = Math.round(progress);
    const activeSection = sections.find((s) => s.id === activeId);

    return (
      <div
        {...rest}
        ref={containerRef}
        className={['ion-scroll-progress', className].filter(Boolean).join(' ')}
      >
        <button
          {...triggerHoverProps}
          type="button"
          className="ion-scroll-progress__trigger"
          data-hovered={isHovered || undefined}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={
            `Reading progress: ${roundedProgress}%` +
            (activeSection ? `. Currently in ${activeSection.label}.` : '') +
            ' Activate to jump to a section.'
          }
          onClick={() => setIsOpen((v) => !v)}
        >
          <span className="ion-scroll-progress__percent" aria-hidden="true">
            {roundedProgress}%
          </span>
          <span className="ion-scroll-progress__rail" aria-hidden="true">
            {sections.map((section) => (
              <span
                key={section.id}
                className={[
                  'ion-scroll-progress__tick',
                  section.id === activeId
                    ? 'ion-scroll-progress__tick--active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            ))}
          </span>
        </button>

        <div
          {...panelHoverProps}
          id={panelId}
          className="ion-scroll-progress__panel"
          data-open={isOpen || undefined}
        >
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={[
                'ion-scroll-progress__heading',
                section.id === activeId
                  ? 'ion-scroll-progress__heading--selected'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={section.id === activeId ? 'true' : undefined}
              onClick={() => {
                onSelect?.(section.id);
                setIsOpen(false);
              }}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
);

ScrollProgress.displayName = 'ScrollProgress';
