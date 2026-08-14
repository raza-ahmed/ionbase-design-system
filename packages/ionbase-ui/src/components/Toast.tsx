'use client';

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export type ToastIntent =
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'information';

export type ToastPlacement =
  'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

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

const INTENT_ICON: Record<ToastIntent, () => React.JSX.Element> = {
  neutral: Info,
  primary: Info,
  information: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleX,
};

export interface ToastOptions {
  intent?: ToastIntent;
  title?: React.ReactNode;
  message?: React.ReactNode;
  /** One action. A second choice belongs in a dialog, which will still be there. */
  action?: { label: string; onPress: () => void };
  /** Milliseconds before auto-dismiss. `null` keeps it until dismissed. */
  duration?: number | null;
  dismissLabel?: string;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

export interface ToastProps extends ToastItem {
  onDismiss: (id: string) => void;
}

/**
 * Toast — Figma `Toast` (820:1655).
 *
 * Neutral chrome on `surface/raised`; the intent is carried by the icon alone.
 * A tinted panel floating over unknown content competes with whatever is
 * behind it, and makes Toast and Alert indistinguishable at a glance.
 *
 * AUTO-DISMISS PAUSES ON HOVER AND FOCUS. A toast that keeps counting down
 * while being read or while its action has keyboard focus takes the action
 * away mid-reach — WCAG 2.2.1 asks for exactly this. The timer restarts rather
 * than resumes, which is the forgiving direction.
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>((props, ref) => {
  const {
    id,
    intent = 'information',
    title,
    message,
    action,
    duration = 5000,
    dismissLabel = 'Dismiss',
    onDismiss,
  } = props;

  const IntentIcon = INTENT_ICON[intent];
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (duration === null || paused) return;
    const t = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(t);
  }, [duration, paused, id, onDismiss]);

  return (
    <div
      ref={ref}
      className={`ion-toast ion-toast--${intent}`}
      /*
       * `status`, not `alert`, at every intent — including error.
       *
       * Alert derives its role from intent because it sits in the page and an
       * error there is content the user has arrived at. A toast arrives
       * unbidden, often several at once; assertive live regions would
       * interrupt whatever is being read each time one lands. Anything urgent
       * enough to interrupt should not be transient in the first place.
       */
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <span className="ion-toast__icon" aria-hidden="true">
        <IntentIcon />
      </span>

      <div className="ion-toast__content">
        {title && <p className="ion-toast__title">{title}</p>}
        {message && <p className="ion-toast__message">{message}</p>}
      </div>

      {action && (
        <button
          type="button"
          className="ion-toast__action"
          onClick={action.onPress}
        >
          {action.label}
        </button>
      )}

      <button
        type="button"
        className="ion-toast__dismiss"
        onClick={() => onDismiss(id)}
        aria-label={dismissLabel}
      >
        <DismissIcon />
      </button>
    </div>
  );
});

Toast.displayName = 'Toast';

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children?: React.ReactNode;
  /** Where the stack sits. Not a Figma variant — position is the queue's concern. */
  placement?: ToastPlacement;
  /** Oldest are dropped past this. Prevents an unbounded stack covering the page. */
  limit?: number;
}

/**
 * Renders the queue and supplies `useToast`.
 *
 * The live region is the CONTAINER, declared once and always present. A region
 * that appears at the same moment as its content is not reliably announced —
 * assistive tech has to be watching the node before the text lands in it.
 */
export function ToastProvider({
  children,
  placement = 'bottom-right',
  limit = 4,
}: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const prefix = useId();

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `${prefix}-${counter.current++}`;
      setItems((prev) => [...prev, { ...options, id }].slice(-limit));
      return id;
    },
    [prefix, limit],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={`ion-toast-region ion-toast-region--${placement}`}
        role="region"
        aria-label="Notifications"
      >
        {items.map((item) => (
          <Toast key={item.id} {...item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside a <ToastProvider>');
  return ctx;
}
