'use client';

import React, { useMemo, useState } from 'react';
import { Button } from './Button.js';
import { Coachmark, type CoachmarkPlacement } from './Coachmark.js';

export interface TourStep {
  /** The `id` of the element this step points at. */
  target: string;
  /** Names the step's coachmark. */
  title: string;
  /** What to know about the target. */
  body?: React.ReactNode;
  placement?: CoachmarkPlacement;
}

export interface TourLabels {
  /** Default "Next". */
  next?: string;
  /** Default "Back". */
  back?: string;
  /** The last step's button. Default "Done". */
  done?: string;
  /** The close button, which ends the tour. Default "End tour". */
  close?: string;
  /** Where the reader is. Receives numbers. Default "2 of 4". */
  progress?: (current: number, total: number) => string;
}

const DEFAULTS: Required<TourLabels> = {
  next: 'Next',
  back: 'Back',
  done: 'Done',
  close: 'End tour',
  progress: (current, total) => `${current} of ${total}`,
};

export interface TourProps {
  /** The steps, in order. A step whose target is not on the page is skipped. */
  steps: TourStep[];
  /** Running or not. Start it from a button — see Coachmark on why. */
  isOpen: boolean;
  /** `false` when it ends: Done, the close button or Escape. */
  onOpenChange: (isOpen: boolean) => void;
  /** Done on the last step — finished, not abandoned. Remember it here. */
  onComplete?: () => void;
  /** The step shown, by its index in `steps`. */
  onStepChange?: (index: number) => void;
  labels?: TourLabels;
}

/** On the page and drawn: an id at a width that hides it does not count. */
const present = (id: string) => {
  const el = document.getElementById(id);
  return !!el && el.getClientRects().length > 0;
};

/**
 * Tour — Coachmarks in a sequence: one at a time, each pointing at its
 * target, with where the reader is ("2 of 4"), Back, Next, and Done on the
 * last. The close button and Escape end it; focus goes back to what started
 * it, once, at the end.
 *
 * STEPS ARE DATA
 *
 * A step names its target by `id`, so a tour is a list anyone can write
 * without threading refs through the page. A target that is not on the page
 * when the tour starts — removed, or hidden at a phone's width — is skipped,
 * and the count is of the steps that remain: "3 of 3", never "3 of 4" with a
 * step that points at nothing.
 *
 * FINISHED IS NOT DISMISSED
 *
 * `onComplete` fires for Done on the last step only. Ended early, the tour
 * calls `onOpenChange(false)` alone, so a product can offer it again to
 * someone who stopped halfway and not to someone who saw it through.
 */
export function Tour({
  steps,
  isOpen,
  onOpenChange,
  onComplete,
  onStepChange,
  labels,
}: TourProps) {
  const l = { ...DEFAULTS, ...labels };
  const [at, setAt] = useState(0);
  const [wasOpen, setWasOpen] = useState(isOpen);

  // Every start begins at the first step.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setAt(0);
  }

  // Which steps can be shown, decided when the tour starts.
  const shown = useMemo(
    () =>
      isOpen
        ? steps.map((s, i) => ({ s, i })).filter(({ s }) => present(s.target))
        : [],
    // On `isOpen` alone: the page is measured once, when the tour starts, so
    // the count does not change under the reader mid-tour.
    [isOpen],
  );

  if (!isOpen || shown.length === 0) return null;
  const index = Math.min(at, shown.length - 1);
  const { s: step } = shown[index];
  const last = index === shown.length - 1;

  const go = (next: number) => {
    setAt(next);
    onStepChange?.(shown[next].i);
  };

  return (
    <Coachmark
      target={step.target}
      title={step.title}
      placement={step.placement}
      onClose={() => onOpenChange(false)}
      closeLabel={l.close}
      progress={
        shown.length > 1 ? l.progress(index + 1, shown.length) : undefined
      }
      footer={
        <>
          {index > 0 && (
            <Button size="sm" variant="tertiary" onPress={() => go(index - 1)}>
              {l.back}
            </Button>
          )}
          <Button
            size="sm"
            variant="primary-brand"
            onPress={() => {
              if (!last) return go(index + 1);
              onComplete?.();
              onOpenChange(false);
            }}
          >
            {last ? l.done : l.next}
          </Button>
        </>
      }
    >
      {step.body}
    </Coachmark>
  );
}

Tour.displayName = 'Tour';
