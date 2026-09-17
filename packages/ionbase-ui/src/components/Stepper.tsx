'use client';

import React, { createContext, forwardRef, useContext } from 'react';

export type StepperOrientation = 'horizontal' | 'vertical';
export type StepperStepStatus = 'incomplete' | 'complete' | 'error';

interface StepPosition {
  index: number;
  total: number;
}

const StepContext = createContext<StepPosition | null>(null);

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  /**
   * Names the list. Defaults to "Progress"; give it the task's name when a page
   * carries more than one — "Checkout progress".
   */
  label?: string;
  /**
   * `horizontal` for a page-width header above the form, `vertical` for a side
   * rail. Below 40rem a horizontal stepper hides every label but the current
   * one, so it does not need a second variant for mobile.
   */
  orientation?: StepperOrientation;
  /** `StepperStep` elements, first step first. */
  children?: React.ReactNode;
}

export interface StepperStepProps extends Omit<
  React.LiHTMLAttributes<HTMLLIElement>,
  'onClick'
> {
  /** The step's name, in the user's language. */
  children?: React.ReactNode;
  /** A short second line — what the step asks for, or a summary of the answer. */
  description?: React.ReactNode;
  /**
   * Whether the step's answers have been accepted. Orthogonal to `isCurrent`:
   * a user who goes Back to step 1 is on a step that is both current and
   * complete.
   */
  status?: StepperStepStatus;
  /** The step the user is on. Marked `aria-current="step"`. */
  isCurrent?: boolean;
  /**
   * Makes a visited step a link back to it. Ignored on the current step and on
   * `incomplete` steps — see the component's comment for why.
   */
  href?: string;
  /** As `href`, for a wizard that changes step without a route. */
  onPress?: () => void;
}

const STATUS_TEXT: Record<StepperStepStatus, string> = {
  incomplete: 'Not started',
  complete: 'Completed',
  error: 'Has errors',
};

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="m6 12.5 4 4 8-9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Exclamation = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M12 6.5v7"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="17.5" r="1.5" fill="currentColor" />
  </svg>
);

/**
 * Stepper — where the user is in a task that has an order.
 *
 * WHY NOT TABS
 *
 * The `tablist` role announces peers that can be visited in any order, which is
 * the opposite of a wizard. This is an ordered list: the steps are a sequence,
 * and `ol` says so. Nothing here is a tab, and arrow keys do nothing.
 *
 * POSITION AND STATUS ARE TEXT, NOT ONLY DRAWING
 *
 * Every step renders "Step 2 of 5" and its status as visually hidden text. The
 * number in the circle is for the eye; a screen reader cannot be relied on to
 * announce list position, and a coloured ring carries nothing in forced-colours
 * mode. The complete and error glyphs also differ in SHAPE — a check and an
 * exclamation — so the states survive greyscale, which WCAG 1.4.1 requires.
 *
 * ONLY VISITED STEPS ARE LINKS
 *
 * `href` / `onPress` are honoured on `complete` and `error` steps that are not
 * current. An `incomplete` step renders as text even when given one, because
 * jumping forward past unanswered steps is exactly what a wizard exists to
 * prevent — and a link that is there but should not be followed is worse than
 * no link. The current step is text for the same reason Breadcrumb's is: a link
 * to where you already are is a dead control.
 *
 * IT DOES NOT ANNOUNCE STEP CHANGES
 *
 * The Wizard pattern moves focus to the new step's heading, which announces it.
 * A live region here as well would say the same thing twice, on every step.
 */
export const Stepper = forwardRef<HTMLOListElement, StepperProps>(
  (
    {
      label = 'Progress',
      orientation = 'horizontal',
      children,
      className,
      ...rest
    },
    ref,
  ) => {
    /*
     * Position comes from the children rather than from props on each step.
     * Asking the caller to pass `index` and `total` five times is five chances
     * for "Step 3 of 4" to appear twice.
     */
    const steps = React.Children.toArray(children).filter(React.isValidElement);
    return (
      <ol
        {...rest}
        ref={ref}
        aria-label={label}
        data-orientation={orientation}
        className={[
          'ion-stepper',
          `ion-stepper--${orientation}`,
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {steps.map((step, index) => (
          <StepContext.Provider
            key={step.key ?? index}
            value={{ index, total: steps.length }}
          >
            {step}
          </StepContext.Provider>
        ))}
      </ol>
    );
  },
);

Stepper.displayName = 'Stepper';

export const StepperStep = forwardRef<HTMLLIElement, StepperStepProps>(
  (
    {
      children,
      description,
      status = 'incomplete',
      isCurrent = false,
      href,
      onPress,
      className,
      ...rest
    },
    ref,
  ) => {
    const position = useContext(StepContext);
    if (!position) {
      throw new Error('StepperStep must be rendered inside a Stepper');
    }
    const number = position.index + 1;
    const isInteractive =
      !isCurrent && status !== 'incomplete' && (!!href || !!onPress);

    const statusText = isCurrent
      ? status === 'error'
        ? 'Current step, has errors'
        : 'Current step'
      : STATUS_TEXT[status];

    const content = (
      <>
        <span className="ion-stepper__indicator" aria-hidden="true">
          {status === 'complete' ? (
            <Check />
          ) : status === 'error' ? (
            <Exclamation />
          ) : (
            number
          )}
        </span>
        <span className="ion-stepper__text">
          <span className="ion-visually-hidden">
            {`Step ${number} of ${position.total}: `}
          </span>
          <span className="ion-stepper__label">{children}</span>
          {description && (
            <span className="ion-stepper__description">{description}</span>
          )}
          <span className="ion-visually-hidden">{`, ${statusText}`}</span>
        </span>
      </>
    );

    return (
      <li
        {...rest}
        ref={ref}
        aria-current={isCurrent ? 'step' : undefined}
        className={[
          'ion-stepper__step',
          status !== 'incomplete' ? `ion-stepper__step--${status}` : '',
          isCurrent ? 'ion-stepper__step--current' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isInteractive && href ? (
          <a href={href} className="ion-stepper__trigger">
            {content}
          </a>
        ) : isInteractive ? (
          <button
            type="button"
            className="ion-stepper__trigger"
            onClick={onPress}
          >
            {content}
          </button>
        ) : (
          <span className="ion-stepper__trigger">{content}</span>
        )}
      </li>
    );
  },
);

StepperStep.displayName = 'StepperStep';
