'use client';

import React, {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button } from './Button.js';
import { AgentStop } from './AgentStop.js';

export type PromptInputSubmitKey = 'enter' | 'mod-enter';

export interface PromptInputProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onSubmit'
  | 'rows'
  | 'disabled'
  | 'children'
> {
  /**
   * The accessible name of the text field. Required, and not a placeholder:
   * placeholder text disappears the moment the user types, and is not reliably
   * announced as a name.
   */
  label: string;
  /** Controlled text. Pass `onChange` with it. */
  value?: string;
  /** Uncontrolled starting text. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /**
   * Fires with the text as typed. Uncontrolled, the field clears straight away;
   * if the returned promise rejects, the text is put back — a prompt lost to a
   * network error is the one thing a composer must never do.
   */
  onSubmit?: (value: string) => void | Promise<unknown>;
  /**
   * Which key sends. `enter` sends on Enter with Shift+Enter for a new line —
   * a chat. `mod-enter` sends on Cmd/Ctrl+Enter and leaves Enter for new lines —
   * a composer where messages are long and a stray Enter is expensive.
   */
  submitKey?: PromptInputSubmitKey;
  /**
   * A run is in progress. The send control becomes an `AgentStop` in the same
   * place, and submitting is refused. The field stays editable, so the user can
   * draft the next message while the agent works.
   */
  isRunning?: boolean;
  /** Called by the stop control while `isRunning`. */
  onStop?: () => void;
  /** Passed to the stop control once the stop has been requested. */
  isStopping?: boolean;
  isDisabled?: boolean;
  /** Rows the field starts at. */
  minRows?: number;
  /** Rows the field grows to before it scrolls. */
  maxRows?: number;
  /**
   * Controls at the start of the toolbar — attach, a model picker, a tool
   * toggle. Icon-only controls here need their own `aria-label`.
   */
  actions?: React.ReactNode;
  /** Rendered above the text — attached files, a quoted message. */
  attachments?: React.ReactNode;
  /** Accessible name of the send control. */
  sendLabel?: string;
  /** Class names for the outer box. */
  className?: string;
}

const SendGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M12 19V5m0 0-6 6m6-6 6 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* useLayoutEffect warns during server rendering; the resize only matters in a browser. */
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * PromptInput — where a person writes to an agent.
 *
 * WHY IT IS NOT A TEXTAREA AND A BUTTON
 *
 * Every composer is assembled that way, and every one re-implements the same
 * four bugs:
 *
 *   Enter during IME composition sends half a word. Japanese, Chinese and
 *   Korean input confirm a candidate with Enter; a handler that does not check
 *   `isComposing` sends the message mid-character. That excludes whole
 *   languages from the product, silently, and nobody on an English keyboard
 *   ever sees it.
 *
 *   The prompt is lost when sending fails. Clearing on submit is right —
 *   waiting for the server makes the composer feel broken — but clearing and
 *   never restoring destroys what may have been a long message. Uncontrolled,
 *   a rejected `onSubmit` promise puts the text back.
 *
 *   The stop control lives somewhere else. While a run is going, the send
 *   button's place is exactly where the user's pointer and attention already
 *   are, so that is where `AgentStop` goes — the same control, the same
 *   guarantees, not a second stop button with different ones.
 *
 *   The keyboard contract is invisible. "Enter sends, Shift+Enter for a new
 *   line" is announced through `aria-describedby`, because a screen-reader
 *   user who presses Enter expecting a newline has just sent a message.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not upload, pick models or render messages. `attachments` and
 * `actions` are slots, because what a product attaches and which tools it
 * offers are the product's decisions.
 */
export const PromptInput = forwardRef<HTMLTextAreaElement, PromptInputProps>(
  (
    {
      label,
      value: valueProp,
      defaultValue = '',
      onChange,
      onSubmit,
      submitKey = 'enter',
      isRunning = false,
      onStop,
      isStopping = false,
      isDisabled = false,
      minRows = 1,
      maxRows = 8,
      actions,
      attachments,
      sendLabel = 'Send',
      placeholder,
      className,
      onKeyDown,
      ...rest
    },
    forwardedRef,
  ) => {
    const ref = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement);

    const [internal, setInternal] = useState(defaultValue);
    const isControlled = valueProp !== undefined;
    const value = isControlled ? valueProp : internal;

    const setValue = (next: string) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    };

    const hintId = useId();
    const canSubmit =
      !isDisabled && !isRunning && value.trim().length > 0 && !!onSubmit;

    /*
     * Grow with the text up to `maxRows`, then scroll. Measured from the
     * rendered line-height rather than a token, so it stays right inside a
     * caller's own type scale.
     */
    useIsomorphicLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      const style = window.getComputedStyle(el);
      const line = parseFloat(style.lineHeight) || 24;
      const padding =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      el.style.height = 'auto';
      const min = line * minRows + padding;
      const max = line * maxRows + padding;
      const next = Math.min(Math.max(el.scrollHeight, min), max);
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    }, [value, minRows, maxRows]);

    const submit = () => {
      if (!canSubmit || !onSubmit) return;
      const sent = value;
      const result = onSubmit(sent);
      if (isControlled) return;
      setInternal('');
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).then(undefined, () => {
          // Put it back only if the user has not started typing something new.
          setInternal((current) => (current === '' ? sent : current));
        });
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.key !== 'Enter') return;
      // An IME confirming a candidate also presses Enter. 229 covers Safari,
      // which reports the keydown before setting isComposing.
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      const wantsSubmit =
        submitKey === 'enter'
          ? !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey
          : event.metaKey || event.ctrlKey;
      if (!wantsSubmit) return;
      event.preventDefault();
      submit();
    };

    const hint =
      submitKey === 'enter'
        ? 'Press Enter to send, Shift and Enter for a new line.'
        : 'Press Command or Control and Enter to send.';

    return (
      <div
        className={[
          'ion-prompt-input',
          isDisabled ? 'ion-prompt-input--disabled' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
        /*
         * The whole box looks like the field, so a click on its padding should
         * behave like a click on the field. Controls inside keep their own
         * clicks.
         */
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            ref.current?.focus();
          }
        }}
      >
        {attachments && (
          <div className="ion-prompt-input__attachments">{attachments}</div>
        )}
        <textarea
          {...rest}
          ref={ref}
          rows={minRows}
          value={value}
          placeholder={placeholder}
          aria-label={label}
          aria-describedby={
            [rest['aria-describedby'], hintId].filter(Boolean).join(' ') ||
            undefined
          }
          disabled={isDisabled}
          className="ion-prompt-input__field"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="ion-prompt-input__toolbar">
          <div className="ion-prompt-input__actions">{actions}</div>
          {isRunning && onStop ? (
            <AgentStop
              size="sm"
              onStop={onStop}
              isStopping={isStopping}
              className="ion-prompt-input__stop"
            />
          ) : (
            <Button
              variant="primary-brand"
              size="sm"
              aria-label={sendLabel}
              startIcon={<SendGlyph />}
              isDisabled={!canSubmit}
              onPress={submit}
              className="ion-prompt-input__send"
            />
          )}
        </div>
        <span id={hintId} className="ion-visually-hidden">
          {hint}
        </span>
      </div>
    );
  },
);

PromptInput.displayName = 'PromptInput';
