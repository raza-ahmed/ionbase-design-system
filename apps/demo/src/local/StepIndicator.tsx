import { Icon } from 'ionbase-ui';
import { Check } from 'ionbase-icons/icons/check';

/**
 * LOCAL STAND-IN — gap list: IonBase has no step indicator, and the Wizard
 * pattern forbids Tabs for it (a tablist promises peers visited in any order).
 * Not interactive on purpose: moving back is the review step's job.
 */
export function StepIndicator({
  steps,
  current,
  completed,
}: {
  steps: readonly string[];
  current: number;
  /** Index of the last accepted step, or -1. */
  completed: number;
}) {
  return (
    <nav aria-label="Progress">
      <ol className="demo-steps">
        {steps.map((label, i) => {
          const state =
            i === current ? 'current' : i <= completed ? 'done' : 'todo';
          return (
            <li
              key={label}
              className="demo-steps__item"
              data-state={state}
              aria-current={i === current ? 'step' : undefined}
            >
              <span className="demo-steps__marker" aria-hidden="true">
                {state === 'done' ? <Icon as={Check} size="xs" /> : i + 1}
              </span>
              <span className="ion-text-body-sm">
                {label}
                {state === 'done' && (
                  <span className="ion-visually-hidden"> (complete)</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
