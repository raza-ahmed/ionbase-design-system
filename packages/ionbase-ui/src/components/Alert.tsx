import React, { forwardRef } from 'react';

export type AlertIntent =
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'information';
export type AlertEmphasis = 'subtle' | 'solid';
export type AlertLayout = 'inline' | 'banner';

/**
 * The per-intent glyphs, inlined for the same reason Select's and Modal's are:
 * they belong to the component rather than to a slot a caller fills, and
 * `ionbase-ui` deliberately does not depend on `ionbase-icons`.
 *
 * One per intent, not one shared symbol. A success alert showing an info circle
 * is wrong rather than merely unstyled — which is exactly what happened in
 * Figma when the icon was bound to a single instance-swap default.
 */
const Info = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 16v-4M12 8h.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CircleCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="m9 12 2 2 4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TriangleAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 9v4M12 17h.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CircleX = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path
      d="m15 9-6 6M9 9l6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const DismissIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M18 6 6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const INTENT_ICON: Record<AlertIntent, () => React.JSX.Element> = {
  neutral: Info,
  primary: Info,
  information: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleX,
};

export interface AlertProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title'
> {
  /** Matches the Figma `Intent` variant. Same vocabulary as `Badge`. */
  intent?: AlertIntent;
  /** Matches the Figma `Emphasis` variant. */
  emphasis?: AlertEmphasis;
  /** Matches the Figma `Layout` variant. */
  layout?: AlertLayout;
  /** Optional heading above the message. */
  title?: React.ReactNode;
  /** Hide the leading icon. Shown by default. */
  hideIcon?: boolean;
  /** Replace the intent's glyph. */
  icon?: React.ReactNode;
  /** Action buttons, rendered under the message. */
  actions?: React.ReactNode;
  /** Called when the dismiss button is pressed. Omit for no dismiss button. */
  onDismiss?: () => void;
  /** Accessible name for the dismiss button. */
  dismissLabel?: string;
  /** The message. */
  children?: React.ReactNode;
}

/**
 * Alert — Figma `Alert` (812:1902).
 *
 * `Intent` x `Emphasis` x `Layout`, with the parts as props rather than
 * variants. Intents match `Badge` exactly, so a status mapped to one can be
 * passed to the other.
 *
 * ROLE IS CHOSEN BY INTENT, NOT PASSED IN. `error` and `warning` render
 * `role="alert"`, which interrupts a screen reader; the rest render
 * `role="status"`, which waits for a pause. Getting this backwards is the
 * common failure — a page of `role="alert"` status messages talks over the
 * user, and an error announced as a status is missed.
 *
 * The icon is decorative: it repeats what the intent's colour and copy already
 * say, so it is `aria-hidden` and the live region carries the text alone.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>((props, ref) => {
  const {
    intent = 'information',
    emphasis = 'subtle',
    layout = 'inline',
    title,
    hideIcon,
    icon,
    actions,
    onDismiss,
    dismissLabel = 'Dismiss',
    className,
    children,
    ...rest
  } = props;

  const IntentIcon = INTENT_ICON[intent];
  const isUrgent = intent === 'error' || intent === 'warning';

  return (
    <div
      {...rest}
      ref={ref}
      role={isUrgent ? 'alert' : 'status'}
      className={[
        'ion-alert',
        `ion-alert--${intent}`,
        `ion-alert--${emphasis}`,
        `ion-alert--${layout}`,
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!hideIcon && (
        <span className="ion-alert__icon" aria-hidden="true">
          {icon ?? <IntentIcon />}
        </span>
      )}

      <div className="ion-alert__content">
        {title && <p className="ion-alert__title">{title}</p>}
        {children && <div className="ion-alert__message">{children}</div>}
        {actions && <div className="ion-alert__actions">{actions}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          className="ion-alert__dismiss"
          onClick={onDismiss}
          aria-label={dismissLabel}
        >
          <DismissIcon />
        </button>
      )}
    </div>
  );
});

Alert.displayName = 'Alert';
