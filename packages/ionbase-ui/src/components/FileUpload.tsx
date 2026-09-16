'use client';

import React, { useCallback, useId, useRef, useState } from 'react';

export type FileUploadSize = 'sm' | 'md';

/** A file the control refused, and the reason, so the caller can say so. */
export interface RejectedFile {
  file: File;
  reason: 'type' | 'size' | 'count';
  message: string;
}

export interface FileUploadProps {
  /** Field label. Also the accessible name of the file input. */
  label?: React.ReactNode;
  /** Helper text below the control. */
  description?: React.ReactNode;
  /** Replaces the helper text when `isInvalid` is set. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  /** Matches the Figma `Size` variant when drawn. Height of the drop target. */
  size?: FileUploadSize;
  /** Native `accept` — a comma-separated list of extensions or MIME types. */
  accept?: string;
  /** Allow more than one file. */
  multiple?: boolean;
  /** Reject anything larger, in bytes. */
  maxSize?: number;
  /** Reject once this many files are held. Only meaningful with `multiple`. */
  maxFiles?: number;
  /**
   * The files held. Pass it to control the list; omit and the component keeps
   * its own. A controlled list is the usual case, because the caller is the
   * only thing that knows which uploads have since succeeded or failed.
   */
  files?: readonly File[];
  /** Fires with the full list after every add or remove, never with a delta. */
  onChange?: (files: File[]) => void;
  /** Fires with anything refused by `accept`, `maxSize` or `maxFiles`. */
  onReject?: (rejected: RejectedFile[]) => void;
  /** Call-to-action inside the drop target. */
  prompt?: React.ReactNode;
  /** Second line inside the drop target — the constraints, in words. */
  hint?: React.ReactNode;
  /** Accessible label for each file's remove button. Receives the file name. */
  removeLabel?: (name: string) => string;
  className?: string;
  wrapperClassName?: string;
  id?: string;
  name?: string;
}

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const RemoveIcon = () => (
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

/**
 * Bytes as a person would say them.
 *
 * Decimal units, not binary: a disk sold as 500 GB and a browser reporting a
 * file size both mean powers of 1000, and showing "476 MiB" for a 500 MB file
 * is correct arithmetic and a confusing answer.
 */
const formatBytes = (bytes: number): string => {
  if (bytes < 1000) return `${bytes} B`;
  const units = ['kB', 'MB', 'GB', 'TB'];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
};

/**
 * Does a file match an `accept` list?
 *
 * The browser enforces `accept` in its own picker but NOT on drop, and not at
 * all if the user switches the picker's filter to "All files" — which every
 * platform picker offers. So the check is repeated here. Treating the native
 * attribute as a guarantee is the standard way a drop zone ends up holding a
 * .exe someone dragged into it.
 */
const matchesAccept = (file: File, accept?: string): boolean => {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept.split(',').some((raw) => {
    const token = raw.trim().toLowerCase();
    if (!token) return false;
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
};

/**
 * FileUpload — a drop target wrapped around a real `<input type="file">`.
 *
 * NO FIGMA COUNTERPART YET. Measurements come from `Input` and `EmptyState`
 * rather than being invented: the border, radius and disabled treatment are
 * Input's; the centred icon-over-text stack is EmptyState's.
 *
 * THE INPUT IS THE CONTROL. THE DROP ZONE IS DECORATION.
 *
 * The usual build of this component is a `<div>` with drag handlers and a
 * click that calls `input.click()`. That version cannot be reached by keyboard,
 * has no accessible name, does not participate in a form, and does not work in
 * any environment without a pointer — which includes switch access, voice
 * control and most screen-reader browse modes.
 *
 * Here the file input is a real, focusable, labelled control that is visually
 * hidden but NOT `display: none` — it keeps its place in the tab order and its
 * label. Drag-and-drop is layered on top as an enhancement, and every path it
 * offers is also reachable without it. That ordering is the whole component.
 *
 * VALIDATION IS ADVISORY, NOT SECURITY. `accept` and `maxSize` are checked here
 * so the user finds out immediately instead of after an upload. A server that
 * trusts either one is trusting a value the client chose.
 */
export function FileUpload({
  label,
  description,
  errorMessage,
  isInvalid,
  isDisabled: isDisabledProp,
  size = 'md',
  accept,
  multiple,
  maxSize,
  maxFiles,
  files: controlledFiles,
  onChange,
  onReject,
  prompt,
  hint,
  removeLabel = (name) => `Remove ${name}`,
  className,
  wrapperClassName,
  id: providedId,
  name: inputName,
}: FileUploadProps) {
  /* No `disabled` alias to resolve: FileUpload is new, so it never had one. */
  const isDisabled = isDisabledProp ?? false;

  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helperId = `${id}-helper`;
  const hintId = `${id}-hint`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolled, setUncontrolled] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  /*
   * A depth counter, not a boolean. `dragleave` fires every time the pointer
   * crosses into a CHILD element, so a boolean flickers off whenever the
   * cursor passes over the icon or the prompt text. Counting enter/leave pairs
   * is the only version that survives having children.
   */
  const dragDepth = useRef(0);

  const files = controlledFiles ? [...controlledFiles] : uncontrolled;

  const commit = useCallback(
    (next: File[]) => {
      if (!controlledFiles) setUncontrolled(next);
      onChange?.(next);
    },
    [controlledFiles, onChange],
  );

  const add = useCallback(
    (incoming: File[]) => {
      if (isDisabled || incoming.length === 0) return;

      const accepted: File[] = [];
      const rejected: RejectedFile[] = [];
      /*
       * Room is counted against what is already held, so dropping four files
       * onto a control holding two with maxFiles=3 accepts one and reports
       * three — rather than accepting all four or refusing the lot.
       */
      let room = multiple ? (maxFiles ?? Infinity) - files.length : 1;

      for (const file of incoming) {
        if (!matchesAccept(file, accept)) {
          rejected.push({
            file,
            reason: 'type',
            message: `${file.name} is not an accepted file type.`,
          });
        } else if (maxSize !== undefined && file.size > maxSize) {
          rejected.push({
            file,
            reason: 'size',
            message: `${file.name} is ${formatBytes(file.size)}, over the ${formatBytes(maxSize)} limit.`,
          });
        } else if (room <= 0) {
          rejected.push({
            file,
            reason: 'count',
            message: multiple
              ? `${file.name} was not added — at most ${maxFiles} files.`
              : `${file.name} was not added — only one file is allowed.`,
          });
        } else {
          accepted.push(file);
          room -= 1;
        }
      }

      if (accepted.length)
        commit(multiple ? [...files, ...accepted] : accepted);
      if (rejected.length) onReject?.(rejected);
    },
    [accept, commit, files, isDisabled, maxFiles, maxSize, multiple, onReject],
  );

  const remove = (index: number) => {
    commit(files.filter((_, i) => i !== index));
    /*
     * Clearing the input's own value matters: a browser fires no `change` when
     * the same file is picked twice in a row, so removing a file and picking it
     * again would silently do nothing.
     */
    if (inputRef.current) inputRef.current.value = '';
  };

  const helper = isInvalid && errorMessage ? errorMessage : description;

  const zoneClassNames = [
    'ion-file-upload',
    size !== 'md' ? `ion-file-upload--${size}` : '',
    isDragging ? 'ion-file-upload--dragging' : '',
    isInvalid ? 'ion-file-upload--invalid' : '',
    isDisabled ? 'ion-file-upload--disabled' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const zone = (
    <div
      className={zoneClassNames}
      data-dragging={isDragging || undefined}
      data-invalid={isInvalid || undefined}
      data-disabled={isDisabled || undefined}
      onDragEnter={(e) => {
        if (isDisabled) return;
        e.preventDefault();
        dragDepth.current += 1;
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        if (isDisabled) return;
        // Without this the browser navigates to the dropped file. There is no
        // other reason for a dragover handler that only calls preventDefault.
        e.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
      }}
      onDrop={(e) => {
        if (isDisabled) return;
        e.preventDefault();
        dragDepth.current = 0;
        setIsDragging(false);
        add(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        type="file"
        id={id}
        name={inputName}
        className="ion-file-upload__input"
        accept={accept}
        multiple={multiple}
        disabled={isDisabled}
        aria-describedby={
          [hint ? hintId : null, helper ? helperId : null]
            .filter(Boolean)
            .join(' ') || undefined
        }
        aria-invalid={isInvalid || undefined}
        onChange={(e) => {
          add(Array.from(e.target.files ?? []));
          // Same reason as remove(): re-picking an identical file must fire.
          e.target.value = '';
        }}
      />
      {/*
        The label is the whole surface, which is what makes clicking anywhere on
        the zone open the picker — no onClick, no ref.click(), and it keeps
        working when scripting is unavailable.
      */}
      {/*
        A SECOND label on the same input, deliberately. HTML allows any number,
        and the accessible name is their concatenation in DOM order — so the
        field label names the control and this one adds the instruction, which
        is what a sighted user reads too. The alternative, an onClick that calls
        input.click(), is the version that stops working without scripting.
      */}
      <label htmlFor={id} className="ion-file-upload__target">
        <span className="ion-file-upload__icon" aria-hidden="true">
          <UploadIcon />
        </span>
        <span className="ion-file-upload__prompt">
          {prompt ??
            (multiple
              ? 'Choose files or drag them here'
              : 'Choose a file or drag it here')}
        </span>
        {hint && (
          <span id={hintId} className="ion-file-upload__hint">
            {hint}
          </span>
        )}
      </label>
    </div>
  );

  const list = files.length > 0 && (
    <ul className="ion-file-upload__list">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${file.size}-${index}`}
          className="ion-file-upload__file"
        >
          <span className="ion-file-upload__name">{file.name}</span>
          <span className="ion-file-upload__size">
            {formatBytes(file.size)}
          </span>
          <button
            type="button"
            className="ion-file-upload__remove"
            aria-label={removeLabel(file.name)}
            disabled={isDisabled}
            onClick={() => remove(index)}
          >
            <RemoveIcon />
          </button>
        </li>
      ))}
    </ul>
  );

  /*
   * The count, announced. A file added by drop produces no focus change and no
   * visible change anywhere near the user's attention, so without this a screen
   * reader user gets no confirmation that the drop did anything at all. Polite,
   * and the count rather than the names: reading six filenames over an
   * assertive interruption is worse than saying how many there now are.
   */
  const status = (
    <span className="ion-visually-hidden" role="status" aria-live="polite">
      {files.length === 0
        ? ''
        : `${files.length} file${files.length === 1 ? '' : 's'} selected`}
    </span>
  );

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
        <label htmlFor={id} className="ion-field__label">
          {label}
        </label>
      )}
      {zone}
      {list}
      {status}
      {helper && (
        <span id={helperId} className="ion-field__helper">
          {helper}
        </span>
      )}
    </div>
  );
}

FileUpload.displayName = 'FileUpload';
