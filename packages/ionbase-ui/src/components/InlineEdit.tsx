'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Textarea } from './Textarea.js';
import { Tooltip } from './Tooltip.js';

export type InlineEditSize = 'sm' | 'md';

export interface InlineEditProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'children' | 'defaultValue' | 'onChange'
> {
  /**
   * What the value is — "Purpose", "Agent name". Required: it names the
   * field while editing, and the edit button is "Edit" plus it.
   */
  label: string;
  /** The saved value, when the caller keeps it. */
  value?: string;
  /** The starting value, when the component keeps it. */
  defaultValue?: string;
  /**
   * Called with the new value on Save. Return a promise to show "Saving…"
   * while it runs; if it rejects, the editor stays open with the error's
   * message, and what was typed is kept.
   */
  onSave?: (value: string) => void | Promise<void>;
  /** Called when editing is cancelled — Cancel, or Escape. */
  onCancel?: () => void;
  /**
   * Checked on Save, before `onSave`. Return the message to show, or nothing
   * when the value is fine.
   */
  validate?: (value: string) => string | undefined | null;
  /** Shown, in secondary text, when there is no value — "Add a purpose". */
  placeholder?: string;
  /** A Textarea instead of an Input. Enter adds a line; ⌘/Ctrl+Enter saves. */
  isMultiline?: boolean;
  /**
   * The field's size: `sm` in a dense row, `md` beside body text. The value
   * itself inherits the text around it.
   */
  size?: InlineEditSize;
  /** Shows the value with no way to edit it. */
  isReadOnly?: boolean;
  /** The edit button's name. Defaults to "Edit" and the label. */
  editLabel?: string;
  saveLabel?: string;
  savingLabel?: string;
  cancelLabel?: string;
  /** Announced after a save. Defaults to the label and "saved". */
  savedMessage?: string;
  /** Shown when `onSave` rejects without a message of its own. */
  errorFallback?: string;
}

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M18.5288 2C19.4495 2.00018 20.3325 2.3663 20.9835 3.0174C21.6343 3.66851 22.0002 4.55155 22 5.47213C21.9998 6.33527 21.6784 7.16585 21.1015 7.80255L20.9826 7.92685L19.0819 9.82671C19.0584 9.85709 19.0343 9.8876 19.0065 9.91548C18.9785 9.94335 18.948 9.96745 18.9176 9.99095L8.84839 20.0628C8.53234 20.3778 8.14338 20.6113 7.71647 20.7411L3.75873 21.9414L3.75606 21.9423C3.52056 22.013 3.2701 22.0182 3.03164 21.9583C2.79312 21.8983 2.57455 21.7751 2.40042 21.6014C2.22628 21.4275 2.10218 21.2087 2.04175 20.9702C1.98149 20.7318 1.98657 20.4813 2.05685 20.2457L2.05862 20.2422L3.25891 16.2854L3.25979 16.2826C3.39085 15.8554 3.62515 15.4664 3.94161 15.1507L14.0082 5.08061C14.0315 5.05047 14.0569 5.02128 14.0845 4.99361C14.1122 4.96594 14.1414 4.94062 14.1715 4.91725L16.0732 3.01651C16.7244 2.36554 17.6081 1.99989 18.5288 2ZM5.22535 16.4389C5.12001 16.5441 5.04171 16.6739 4.99807 16.8163L4.04459 19.9536L7.18735 19.0011L7.29122 18.9629C7.39265 18.9179 7.48561 18.8544 7.56465 18.7755L17.0719 9.26651L14.7335 6.92809L5.22535 16.4389ZM18.5288 3.81818C18.0905 3.81814 17.6696 3.99224 17.3595 4.30203L16.019 5.64258L18.3575 7.981L19.6971 6.64134L19.8072 6.51971C20.0482 6.22566 20.1816 5.8556 20.1818 5.47213C20.1819 5.03366 20.0071 4.61304 19.6971 4.30291C19.3872 3.99293 18.9671 3.81836 18.5288 3.81818Z"
    />
  </svg>
);

/**
 * InlineEdit — a value that becomes a field where it stands: an agent's
 * purpose under its name, a row's label. Edit, change, Save or Cancel.
 *
 * THE VALUE IS TEXT, AND EDIT IS A BUTTON. In view mode the value is plain
 * text, read as text; beside it is one tab stop, "Edit purpose". Clicking the
 * text also opens the editor, for a pointer. A value that is itself a button
 * would be read as "Edit purpose, button" with the purpose lost.
 *
 * FOCUS GOES IN, THEN BACK. Opening the editor focuses the field with its
 * text selected; Save and Cancel return focus to the Edit button, not to the
 * top of the page. Escape cancels from anywhere in the editor, and goes no
 * further — a dialog it sits in does not close as well.
 *
 * NOTHING TYPED IS LOST. An invalid value, or a save that fails, keeps the
 * editor open with the message as the field's error and what was typed still
 * in it. While a save runs the field is read-only and Save says "Saving…";
 * neither is disabled, so focus stays where it was.
 *
 * SAVED IS SAID. A status region, always mounted, announces "Purpose saved" —
 * the editor closing is not, on its own, news to a screen reader.
 */
export const InlineEdit = forwardRef<HTMLDivElement, InlineEditProps>(
  (
    {
      label,
      value,
      defaultValue = '',
      onSave,
      onCancel,
      validate,
      placeholder,
      isMultiline = false,
      size = 'md',
      isReadOnly = false,
      editLabel = `Edit ${label}`,
      saveLabel = 'Save',
      savingLabel = 'Saving…',
      cancelLabel = 'Cancel',
      savedMessage = `${label} saved`,
      errorFallback = 'That didn’t save. Try again.',
      className,
      ...rest
    },
    ref,
  ) => {
    const [internal, setInternal] = useState(defaultValue);
    const current = value ?? internal;
    const [isEditing, setEditing] = useState(false);
    const [draft, setDraft] = useState(current);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setPending] = useState(false);
    const [announcement, setAnnouncement] = useState('');

    const editRef = useRef<HTMLButtonElement>(null);
    const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
    const returnFocus = useRef(false);

    /*
     * On the next frame, not in the commit. Focusing fires the field's and the
     * Tooltip's own focus handlers, which update state; after a keyboard
     * update React runs effects while it is still committing, and a render
     * started from inside one throws "Should not already be working".
     */
    useEffect(() => {
      const frame = requestAnimationFrame(() => {
        if (isEditing) {
          focusField();
          fieldRef.current?.select();
        } else if (returnFocus.current) {
          returnFocus.current = false;
          editRef.current?.focus();
        }
      });
      return () => cancelAnimationFrame(frame);
    }, [isEditing]);

    // Back to the field after an error — on the next frame, for the reason above.
    const focusField = () =>
      requestAnimationFrame(() => fieldRef.current?.focus());

    const start = () => {
      if (isReadOnly) return;
      setDraft(current);
      setError(null);
      setAnnouncement('');
      setEditing(true);
    };

    const close = () => {
      returnFocus.current = true;
      setEditing(false);
    };

    const cancel = () => {
      if (isPending) return;
      close();
      onCancel?.();
    };

    const save = async () => {
      if (isPending) return;
      if (draft === current) return close();
      const invalid = validate?.(draft);
      if (invalid) {
        setError(invalid);
        focusField();
        return;
      }
      const saved = () => {
        if (value === undefined) setInternal(draft);
        setError(null);
        close();
        setAnnouncement(savedMessage);
      };
      const failed = (e: unknown) => {
        setError((e instanceof Error && e.message) || errorFallback);
        focusField();
      };
      let result: void | Promise<void>;
      try {
        result = onSave?.(draft);
      } catch (e) {
        return failed(e);
      }
      // A synchronous save closes at once: no "Saving…" flash, and no await
      // resuming in a microtask after the event that caused it.
      if (!(result instanceof Promise)) return saved();
      setPending(true);
      try {
        await result;
        saved();
      } catch (e) {
        failed(e);
      } finally {
        setPending(false);
      }
    };

    // Escape from the field or either button — and no further.
    const onEditorKeyDown = (e: React.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      cancel();
    };

    // React Aria stops a field's key events at the field, so the editor's
    // Escape handler never hears them: Escape is handled here as well.
    const onFieldKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') return onEditorKeyDown(e);
      if (e.key !== 'Enter') return;
      if (isMultiline && !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      void save();
    };

    const fieldProps = {
      'aria-label': label,
      value: draft,
      onChange: (next: string) => {
        setDraft(next);
        if (error) setError(null);
      },
      isInvalid: !!error,
      // Always passed, so the field keeps its wrapper and is never remounted.
      errorMessage: error ?? '',
      isReadOnly: isPending,
      size,
      onKeyDown: onFieldKeyDown,
      className: 'ion-inline-edit__field',
    };

    return (
      <div
        {...rest}
        ref={ref}
        data-editing={isEditing || undefined}
        className={[
          'ion-inline-edit',
          `ion-inline-edit--${size}`,
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="ion-visually-hidden" role="status">
          {announcement}
        </span>

        {isEditing ? (
          <div className="ion-inline-edit__editor" onKeyDown={onEditorKeyDown}>
            {isMultiline ? (
              <Textarea {...fieldProps} ref={fieldRef} rows={3} />
            ) : (
              <Input {...fieldProps} ref={fieldRef} />
            )}
            <div className="ion-inline-edit__actions">
              <Button
                size="sm"
                variant="primary-brand"
                onPress={() => void save()}
              >
                {isPending ? savingLabel : saveLabel}
              </Button>
              <Button size="sm" variant="tertiary" onPress={cancel}>
                {cancelLabel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="ion-inline-edit__view">
            {/* For a pointer only: the Edit button is the keyboard's way in. */}
            <span
              className="ion-inline-edit__value"
              data-empty={current ? undefined : ''}
              onClick={start}
            >
              {current || placeholder}
            </span>
            {!isReadOnly && (
              <Tooltip label={editLabel} ref={editRef}>
                <Button
                  size="sm"
                  variant="tertiary"
                  aria-label={editLabel}
                  className="ion-inline-edit__edit"
                  startIcon={<PencilIcon />}
                  onPress={start}
                />
              </Tooltip>
            )}
          </div>
        )}
      </div>
    );
  },
);

InlineEdit.displayName = 'InlineEdit';
