'use client';

import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';

export type ApprovalGateRisk = 'low' | 'medium' | 'high';
export type ApprovalGateStatus =
  'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalGateProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'title' | 'onChange'
> {
  /**
   * What is being approved, stated as the action and its object — "Delete 14
   * projects", not "Confirm action". Required: it is the region's accessible
   * name, and a decision the user cannot name is not a decision.
   */
  title: React.ReactNode;
  /** Why it stopped here, and what happens on approval. */
  children?: React.ReactNode;
  /**
   * How much is at stake. Drives emphasis only — it does NOT change what the
   * component enforces, because the component enforces nothing.
   */
  risk?: ApprovalGateRisk;
  /** Where the decision has got to. `pending` is the only state with buttons. */
  status?: ApprovalGateStatus;
  onApprove?: () => void;
  onReject?: () => void;
  /**
   * Offer "edit" as a third way out. Omit it when the proposal cannot be
   * amended — an approve/reject pair the user cannot influence is honest;
   * an edit button that discards their edit is not.
   */
  onEdit?: () => void;
  approveLabel?: string;
  rejectLabel?: string;
  editLabel?: string;
  /** A decision is in flight. Both actions disable; neither disappears. */
  isSubmitting?: boolean;
  /** Shown in place of the actions once the decision is made. */
  resolution?: React.ReactNode;
}

const ShieldQuestion = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 16h.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const STATUS_TEXT: Record<Exclude<ApprovalGateStatus, 'pending'>, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired without a decision',
};

/**
 * ApprovalGate — a proposed action, held until a person decides.
 *
 * The human-in-the-loop control. An agent proposes; this is where a person
 * approves, rejects, or amends before anything happens. In regulated contexts
 * demonstrable human oversight is a compliance surface rather than a nicety,
 * which is why this is a first-class component and not a Modal with two
 * buttons in it.
 *
 * IT ENFORCES NOTHING, AND SAYING SO IS THE POINT
 *
 * This renders a decision. It does not gate execution — the caller does, by not
 * acting until `onApprove` fires. A component that *looked* like it enforced a
 * policy would be the worst possible thing to ship here: teams would rely on a
 * guarantee that lives entirely in their own call site. `risk` changes emphasis
 * and nothing else, for the same reason.
 *
 * NOT A MODAL, DELIBERATELY
 *
 * A modal steals focus and hides the page. But the page is the evidence: the
 * user needs the plan, the diff, the tool call and the context in front of them
 * while deciding. This sits inline, keeps everything visible, and never
 * traps focus — an approval a user was rushed through is not oversight.
 *
 * NEITHER BUTTON IS FOCUSED ON MOUNT. Autofocusing approve turns a decision
 * into an Enter keypress on a page the user has not read. Focus is moved to the
 * region's heading instead, so a screen-reader user lands on what is being
 * asked rather than on the answer.
 *
 * THE RESOLVED STATES ARE NOT DECORATION. `approved`, `rejected` and `expired`
 * replace the actions with what happened, so the record of the decision stays
 * on the page. `expired` exists because an approval request that nobody answers
 * is the common real outcome, and a gate that sits pending for ever is
 * indistinguishable from one that is broken.
 */
export const ApprovalGate = forwardRef<HTMLElement, ApprovalGateProps>(
  (
    {
      title,
      children,
      risk = 'medium',
      status = 'pending',
      onApprove,
      onReject,
      onEdit,
      approveLabel = 'Approve',
      rejectLabel = 'Reject',
      editLabel = 'Edit',
      isSubmitting = false,
      resolution,
      className,
      ...rest
    },
    ref,
  ) => {
    const headingRef = useRef<HTMLParagraphElement>(null);
    // A <section> is only a landmark once it has a name, and the name a
    // reviewer needs is the decision itself.
    const titleId = useId();
    const [announcement, setAnnouncement] = useState('');
    const previous = useRef(status);

    useEffect(() => {
      if (status !== previous.current && status !== 'pending')
        setAnnouncement(STATUS_TEXT[status]);
      previous.current = status;
    }, [status]);

    const pending = status === 'pending';

    return (
      <section
        {...rest}
        ref={ref as React.Ref<HTMLElement>}
        aria-labelledby={titleId}
        data-risk={risk}
        data-status={status}
        className={[
          'ion-approval-gate',
          `ion-approval-gate--${risk}`,
          !pending ? `ion-approval-gate--${status}` : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="ion-approval-gate__icon" aria-hidden="true">
          <ShieldQuestion />
        </span>

        <div className="ion-approval-gate__body">
          {/*
           * tabIndex -1 so the caller can move focus here when the gate
           * appears — to the question, never to an answer.
           */}
          <p
            ref={headingRef}
            id={titleId}
            tabIndex={-1}
            className="ion-approval-gate__title"
          >
            {title}
          </p>

          {children && (
            <div className="ion-approval-gate__detail">{children}</div>
          )}

          {pending ? (
            <div className="ion-approval-gate__actions">
              {/*
               * Reject first in the DOM, so the safe answer is the one a
               * keyboard reaches first — the same ordering DestructiveConfirm
               * uses in its footer.
               */}
              <button
                type="button"
                className="ion-approval-gate__action ion-approval-gate__action--reject"
                disabled={isSubmitting || !onReject}
                onClick={onReject}
              >
                {rejectLabel}
              </button>
              {onEdit && (
                <button
                  type="button"
                  className="ion-approval-gate__action ion-approval-gate__action--edit"
                  disabled={isSubmitting}
                  onClick={onEdit}
                >
                  {editLabel}
                </button>
              )}
              <button
                type="button"
                className="ion-approval-gate__action ion-approval-gate__action--approve"
                disabled={isSubmitting || !onApprove}
                onClick={onApprove}
              >
                {approveLabel}
              </button>
            </div>
          ) : (
            <p className="ion-approval-gate__resolution">
              {resolution ?? STATUS_TEXT[status]}
            </p>
          )}
        </div>

        <span
          className="ion-approval-gate__status ion-visually-hidden"
          role="status"
          aria-live="polite"
        >
          {announcement}
        </span>
      </section>
    );
  },
);

ApprovalGate.displayName = 'ApprovalGate';
