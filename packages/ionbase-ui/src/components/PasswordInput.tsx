'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  mergeProps,
  useButton,
  useFocusRing,
  useHover,
  useTextField,
} from 'react-aria';
import type { AriaTextFieldProps } from 'react-aria';
import { ARIA_TEXT_FIELD_NON_DOM_PROPS, omitProps } from './dom-props.js';

export type PasswordInputSize = 'sm' | 'md' | 'lg';

type PasswordInputDOMProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | keyof AriaTextFieldProps
  | 'size'
  | 'type'
  | 'disabled'
  | 'autoCapitalize'
  | 'spellCheck'
>;

export interface PasswordInputProps
  extends Omit<AriaTextFieldProps, 'type'>, PasswordInputDOMProps {
  /** Input's sizes: Small, Medium, Large. */
  size?: PasswordInputSize;
  /**
   * Default `current-password`. Pass `new-password` on a sign-up or change
   * form, so a password manager offers to generate one instead of filling
   * the old.
   */
  autoComplete?: 'current-password' | 'new-password' | 'off';
  /** Controlled: whether the password is shown. */
  isRevealed?: boolean;
  /** Uncontrolled: whether it starts shown. Default false. */
  defaultRevealed?: boolean;
  onRevealedChange?: (isRevealed: boolean) => void;
  /**
   * The toggle's name. It does not change with the state — `aria-pressed`
   * says whether it is on. Default "Show password".
   */
  revealLabel?: string;
  /** Announced when the password is shown. Default "Password shown". */
  shownMessage?: string;
  /** Announced when it is hidden again. Default "Password hidden". */
  hiddenMessage?: string;
  /** Class names for the control box (`.ion-input`). */
  className?: string;
  /** Class names for the `.ion-field` wrapper when a label or helper is shown. */
  wrapperClassName?: string;
}

const glyph = (d: string[]) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    {d.map((path) => (
      <path
        key={path}
        d={path}
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    ))}
  </svg>
);

/* Lucide's eye and eye-off, as the icons package draws them. */
const EYE = glyph([
  'M12.0002 8.36364C14.0084 8.36372 15.6365 9.99175 15.6365 12C15.6365 14.0083 14.0084 15.6363 12.0002 15.6364C9.99185 15.6364 8.36379 14.0083 8.36379 12C8.36379 9.99169 9.99185 8.36364 12.0002 8.36364ZM12.0002 10.1818C10.996 10.1818 10.182 10.9958 10.182 12C10.182 13.0042 10.996 13.8182 12.0002 13.8182C13.0043 13.8181 13.8184 13.0041 13.8184 12C13.8184 10.9959 13.0043 10.1819 12.0002 10.1818Z',
  'M12.0002 4.72816C14.1154 4.72826 16.1834 5.35654 17.9412 6.53303C19.5892 7.63605 20.8955 9.17448 21.7169 10.9737L21.875 11.3377L21.8865 11.3679C22.0379 11.776 22.038 12.2249 21.8865 12.633C21.8828 12.6429 21.879 12.6534 21.875 12.6632C21.0685 14.6186 19.6991 16.2914 17.9412 17.4678C16.1834 18.6442 14.1153 19.2726 12.0002 19.2727C9.88485 19.2726 7.81613 18.6444 6.05821 17.4678C4.30032 16.2913 2.93097 14.6187 2.12444 12.6632C2.12037 12.6533 2.11662 12.643 2.1129 12.633C1.96148 12.225 1.96163 11.7759 2.1129 11.3679L2.12444 11.3377C2.9309 9.38228 4.30047 7.70963 6.05821 6.53303C7.81613 5.35649 9.88485 4.72824 12.0002 4.72816ZM12.0002 6.54635C10.2449 6.54642 8.52808 7.06777 7.0694 8.04404C5.62011 9.01422 4.48912 10.3906 3.81834 12C4.48915 13.6097 5.61979 14.9865 7.0694 15.9568C8.52808 16.9331 10.2449 17.4545 12.0002 17.4545C13.7552 17.4545 15.4715 16.9329 16.93 15.9568C18.3795 14.9867 19.5094 13.6095 20.1802 12C19.5094 10.3906 18.3794 9.01417 16.93 8.04404C15.4714 7.06782 13.7553 6.54645 12.0002 6.54635Z',
]);
const EYE_OFF = glyph([
  'M2.26645 2.26642C2.62147 1.91143 3.19695 1.91141 3.55195 2.26642L21.7338 20.4483C22.0885 20.8033 22.0887 21.3788 21.7338 21.7337C21.3788 22.0887 20.8033 22.0885 20.4483 21.7337L16.8305 18.116C15.6759 18.7015 14.4232 19.0748 13.132 19.2125C11.6089 19.3747 10.0679 19.2077 8.61499 18.7224C7.16221 18.2369 5.8302 17.4443 4.71052 16.3991C3.59089 15.3537 2.70839 14.0794 2.1244 12.6633C2.12033 12.6534 2.11658 12.6422 2.11286 12.6322C1.96156 12.2242 1.96143 11.7751 2.11286 11.3671L2.1244 11.3369C2.85807 9.55769 4.0574 8.01797 5.58498 6.87046L2.26645 3.55193C1.91143 3.19691 1.91143 2.62144 2.26645 2.26642ZM6.8847 8.17018C5.52652 9.12999 4.46151 10.4559 3.81829 11.9992C4.3029 13.1624 5.02952 14.2099 5.95075 15.07C6.87987 15.9375 7.98561 16.5945 9.19116 16.9975C10.3967 17.4002 11.6755 17.5386 12.9394 17.404C13.8102 17.3112 14.6594 17.0874 15.4615 16.7471L13.8458 15.1313C13.2815 15.4638 12.6335 15.6422 11.9682 15.6365C11.015 15.6281 10.1032 15.2451 9.42909 14.5711C8.75502 13.897 8.37214 12.9853 8.36375 12.032C8.35796 11.3664 8.53515 10.7178 8.86801 10.1535L6.8847 8.17018ZM10.2441 11.5295C10.2019 11.6869 10.1805 11.8505 10.1819 12.0161C10.1861 12.4926 10.3776 12.9485 10.7146 13.2856C11.0516 13.6225 11.5076 13.8141 11.9841 13.8183C12.1493 13.8196 12.3119 13.7963 12.4688 13.7544L10.2441 11.5295Z',
  'M10.7404 4.80282C13.0548 4.52704 15.3964 5.01624 17.4067 6.19575C19.2913 7.30161 20.7885 8.95751 21.7 10.9356L21.8749 11.336L21.8865 11.3662C22.0378 11.7742 22.0378 12.2233 21.8865 12.6313C21.8828 12.6413 21.879 12.6516 21.8749 12.6615C21.5097 13.5468 21.0265 14.3791 20.4394 15.1357C20.1317 15.5323 19.5612 15.6046 19.1645 15.2973C18.7683 14.9895 18.6955 14.4181 19.0029 14.0215C19.4834 13.4024 19.8786 12.7216 20.1802 11.9983C19.4411 10.2239 18.1453 8.73673 16.487 7.76357C14.819 6.78495 12.8755 6.37885 10.9552 6.60768C10.4569 6.66679 10.0043 6.31055 9.94489 5.81223C9.88601 5.31415 10.2423 4.86237 10.7404 4.80282Z',
]);

interface RevealProps {
  label: string;
  isPressed: boolean;
  isDisabled?: boolean;
  controls: string;
  onPress: () => void;
}

function RevealButton({
  label,
  isPressed,
  isDisabled,
  controls,
  onPress,
}: RevealProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const { buttonProps } = useButton(
    {
      'aria-label': label,
      'aria-pressed': isPressed,
      'aria-controls': controls,
      isDisabled,
      onPress,
      // The press must not take focus from where it is: a mouse user goes on
      // typing in the field, a keyboard user stays on the toggle.
      preventFocusOnPress: true,
    },
    ref,
  );
  const { focusProps, isFocusVisible } = useFocusRing();
  return (
    <button
      {...mergeProps(buttonProps, focusProps)}
      ref={ref}
      data-focused={isFocusVisible || undefined}
      className="ion-password-input__reveal"
    >
      {isPressed ? EYE_OFF : EYE}
    </button>
  );
}

/**
 * PasswordInput — a password field with a way to see what was typed.
 *
 * THE TOGGLE IS A TOGGLE. Its name stays "Show password" and `aria-pressed`
 * says whether it is on, which is how a screen reader expects a toggle to
 * behave: a name that flips to "Hide password" reads as a different button.
 * A polite status beside it also says "Password shown" or "Password hidden"
 * when it changes, because some screen readers do not read a changed pressed
 * state aloud. It is a real tab stop, not the clear button's skipped one: it
 * has no keyboard shortcut to stand in for it.
 *
 * WHAT A SHOWN PASSWORD MUST NOT DO
 *
 *   Go to a spellchecker. A shown password is `type="text"`, and browsers
 *   spellcheck text fields, some by sending them to a server. Spellcheck,
 *   autocorrect and autocapitalise are off whatever the state.
 *
 *   Be submitted shown. A password manager recognises a login by its
 *   `type="password"` field when the form is submitted; a shown one is not
 *   offered for saving. Submitting the form hides it first.
 *
 * The box IS Input's — the same `.ion-input` classes as SearchField and
 * NumberInput — so a password field under an email field matches it.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, forwardedRef) => {
    const {
      size = 'md',
      label,
      description,
      errorMessage,
      isDisabled,
      isReadOnly,
      isInvalid,
      autoComplete = 'current-password',
      isRevealed: isRevealedProp,
      defaultRevealed = false,
      onRevealedChange,
      revealLabel = 'Show password',
      shownMessage = 'Password shown',
      hiddenMessage = 'Password hidden',
      className,
      wrapperClassName,
      ...rest
    } = props;

    const [internal, setInternal] = useState(defaultRevealed);
    const isControlled = isRevealedProp !== undefined;
    const isRevealed = isControlled ? isRevealedProp : internal;
    const onChangeRef = useRef(onRevealedChange);
    onChangeRef.current = onRevealedChange;
    const setRevealed = useCallback(
      (next: boolean) => {
        if (!isControlled) setInternal(next);
        onChangeRef.current?.(next);
      },
      [isControlled],
    );
    const [message, setMessage] = useState('');
    const revealedRef = useRef(isRevealed);
    revealedRef.current = isRevealed;

    const ref = useRef<HTMLInputElement>(null);
    useImperativeHandle(forwardedRef, () => ref.current as HTMLInputElement);

    const { labelProps, inputProps, descriptionProps, errorMessageProps } =
      useTextField(
        {
          ...props,
          autoComplete,
          type: isRevealed ? 'text' : 'password',
        },
        ref,
      );

    // Hide before the form is submitted, so a password manager sees a
    // password field. Capture, so it runs before the form's own handler.
    useEffect(() => {
      const form = ref.current?.form;
      if (!form) return;
      const hide = () => {
        if (!revealedRef.current) return;
        // On the element itself, now: React would only re-render after the
        // form's own submit handler — and the browser — had read it.
        if (ref.current) ref.current.type = 'password';
        setRevealed(false);
      };
      form.addEventListener('submit', hide, true);
      return () => form.removeEventListener('submit', hide, true);
    }, [setRevealed]);

    const { hoverProps, isHovered } = useHover({ isDisabled });
    const { focusProps, isFocusVisible } = useFocusRing({ isTextInput: true });

    const domProps = omitProps(
      rest as Record<string, unknown>,
      [
        ...ARIA_TEXT_FIELD_NON_DOM_PROPS,
        'onRevealedChange',
      ] as unknown as string[],
    );

    /*
     * Changing an input's `type` resets its selection in Chromium: the caret
     * jumps to the start, and the next key typed lands in front of the
     * password. The selection is kept across the change and put back.
     */
    const selection = useRef<[number, number] | null>(null);
    const toggle = () => {
      const input = ref.current;
      selection.current =
        input && input.selectionStart !== null
          ? [input.selectionStart, input.selectionEnd ?? input.selectionStart]
          : null;
      const next = !isRevealed;
      setRevealed(next);
      setMessage(next ? shownMessage : hiddenMessage);
    };
    useLayoutEffect(() => {
      const input = ref.current;
      const kept = selection.current;
      if (!input || !kept) return;
      selection.current = null;
      // Not now: Chromium rebuilds the field's editor for the new type after
      // this commit and resets the selection then. On the next frame it holds.
      const frame = requestAnimationFrame(() =>
        input.setSelectionRange(kept[0], kept[1]),
      );
      return () => cancelAnimationFrame(frame);
    }, [isRevealed]);

    const box = (
      <div
        {...hoverProps}
        data-hovered={isHovered || undefined}
        data-focused={isFocusVisible || undefined}
        data-invalid={isInvalid || undefined}
        data-readonly={isReadOnly || undefined}
        data-disabled={isDisabled || undefined}
        className={[
          'ion-input',
          'ion-password-input',
          size !== 'md' ? `ion-input--${size}` : '',
          isInvalid ? 'ion-input--invalid' : '',
          isReadOnly ? 'ion-input--readonly' : '',
          isDisabled ? 'ion-input--disabled' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <input
          {...domProps}
          {...mergeProps(inputProps, focusProps)}
          // Last, so nothing passed in can turn them back on.
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          ref={ref}
          className="ion-input__field"
        />
        <RevealButton
          label={revealLabel}
          isPressed={isRevealed}
          isDisabled={isDisabled}
          controls={inputProps.id as string}
          onPress={toggle}
        />
        <span
          className="ion-password-input__status ion-visually-hidden"
          role="status"
          aria-live="polite"
        >
          {message}
        </span>
      </div>
    );

    const helper = isInvalid && errorMessage ? errorMessage : description;
    const helperProps =
      isInvalid && errorMessage ? errorMessageProps : descriptionProps;

    /*
     * Wrapped whenever an error message is passed, shown or not. A field that
     * only gained its wrapper when the error appeared was a different element
     * before and after — it remounted, and focus was lost as the user typed
     * the character that cleared the error.
     */
    if (!label && !helper && errorMessage === undefined) return box;

    return (
      <div
        className={[
          'ion-field',
          isInvalid ? 'ion-field--error' : '',
          wrapperClassName || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label && (
          <label {...labelProps} className="ion-field__label">
            {label}
          </label>
        )}
        {box}
        {helper && (
          <span {...helperProps} className="ion-field__helper">
            {helper as React.ReactNode}
          </span>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
