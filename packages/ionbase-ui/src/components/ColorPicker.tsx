'use client';

import React, { createContext, useContext, useRef, useState } from 'react';
import {
  FocusScope,
  VisuallyHidden,
  mergeProps,
  useButton,
  useColorArea,
  useColorField,
  useColorSlider,
  useFocusRing,
  useHover,
  useLocale,
  useOverlayTrigger,
  useRadio,
  useRadioGroup,
} from 'react-aria';
import {
  useColorAreaState,
  useColorFieldState,
  useColorSliderState,
  useOverlayTriggerState,
  useRadioGroupState,
} from 'react-stately';
import type { Color, RadioGroupState } from 'react-stately';
import { CalendarPopover } from './CalendarPopover.js';
import { toColor, toHex, type HexColor } from './hex-color.js';

export type ColorPickerSize = 'sm' | 'md' | 'lg';

/** A preset colour offered under the picker, and what to call it. */
export interface ColorPickerSwatch {
  /** `#RRGGBB`. */
  value: HexColor;
  /**
   * The swatch's name, read out in place of its colour — "Northwind blue".
   * Leave it out and React Aria names the colour in the reader's language:
   * "vibrant blue".
   */
  label?: string;
}

export interface ColorPickerLabels {
  /** The swatch button that opens the picker. Default "Choose a colour". */
  picker?: string;
  /** The group of preset swatches. Default "Suggested colours". */
  swatches?: string;
}

const DEFAULTS: Required<ColorPickerLabels> = {
  picker: 'Choose a colour',
  swatches: 'Suggested colours',
};

/*
 * Where the area and the hue slider start when nothing is chosen: white, at
 * the area's top-left corner. Nothing is emitted until the reader moves one.
 */
const EMPTY = toColor('#FFFFFF', 'empty')!;

export interface ColorPickerProps {
  /** Field label. Required for a usable control — see `a11y.requires`. */
  label?: React.ReactNode;
  /** Names the field when there is no visible `label`. */
  'aria-label'?: string;
  /** Helper text below the field — where the colour is used, and any rule it must meet. */
  description?: React.ReactNode;
  /** Replaces the helper text while the field is invalid. */
  errorMessage?: React.ReactNode;
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  /** Matches Input's `Size` variant: Small, Medium, Large. */
  size?: ColorPickerSize;
  /**
   * The colour as `#RRGGBB`. `null` means none is chosen. A malformed value
   * throws rather than rendering an empty field.
   */
  value?: HexColor | null;
  /** The initial colour, for an uncontrolled picker. */
  defaultValue?: HexColor;
  /**
   * Fires with `#RRGGBB` (upper case) on every change — each step of a drag
   * included — or `null` when the field is cleared.
   */
  onChange?: (value: HexColor | null) => void;
  /**
   * Fires once a change is finished: a drag let go, a key step, a swatch
   * picked, the hex typed and committed. Save or preview here.
   */
  onChangeEnd?: (value: HexColor | null) => void;
  /** Preset colours, offered under the picker as one radio group. */
  swatches?: ReadonlyArray<HexColor | ColorPickerSwatch>;
  /** Posts the hex under this name, for an uncontrolled form. */
  name?: string;
  /** The swatch button's name and the presets' group name. */
  labels?: ColorPickerLabels;
  className?: string;
  wrapperClassName?: string;
  id?: string;
}

/**
 * The saturation × brightness square. React Aria draws the gradient and
 * places the thumb; the thumb is filled with the colour itself.
 */
function ColorArea({
  value,
  onChange,
  onChangeEnd,
}: {
  value: Color;
  onChange: (c: Color) => void;
  onChangeEnd: (c: Color) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputXRef = useRef<HTMLInputElement>(null);
  const inputYRef = useRef<HTMLInputElement>(null);
  const state = useColorAreaState({
    value,
    xChannel: 'saturation',
    yChannel: 'brightness',
    onChange,
    onChangeEnd,
  });
  const { colorAreaProps, thumbProps, xInputProps, yInputProps } = useColorArea(
    { containerRef, inputXRef, inputYRef },
    state,
  );
  const { focusProps, isFocusVisible } = useFocusRing({ within: true });

  return (
    <div
      {...colorAreaProps}
      ref={containerRef}
      className="ion-color-picker__area"
    >
      <div
        {...mergeProps(thumbProps, focusProps)}
        className="ion-color-picker__thumb"
        data-focus-visible={isFocusVisible || undefined}
        data-dragging={state.isDragging || undefined}
        style={
          {
            ...thumbProps.style,
            '--ion-color-picker-thumb': state.getDisplayColor().toString('css'),
          } as React.CSSProperties
        }
      >
        <input {...xInputProps} ref={inputXRef} />
        <input {...yInputProps} ref={inputYRef} />
      </div>
    </div>
  );
}

/** The hue strip, a colour slider on the hue channel. */
function HueSlider({
  value,
  onChange,
  onChangeEnd,
}: {
  value: Color;
  onChange: (c: Color) => void;
  onChangeEnd: (c: Color) => void;
}) {
  const { locale } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const state = useColorSliderState({
    channel: 'hue',
    value,
    onChange,
    onChangeEnd,
    locale,
  });
  const { trackProps, thumbProps, inputProps } = useColorSlider(
    { channel: 'hue', trackRef, inputRef },
    state,
  );
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <div {...trackProps} ref={trackRef} className="ion-color-picker__hue">
      <div
        {...thumbProps}
        className="ion-color-picker__thumb ion-color-picker__thumb--hue"
        data-focus-visible={isFocusVisible || undefined}
        data-dragging={state.isDragging || undefined}
        style={
          {
            ...thumbProps.style,
            '--ion-color-picker-thumb': state.getDisplayColor().toString('css'),
          } as React.CSSProperties
        }
      >
        <input {...mergeProps(inputProps, focusProps)} ref={inputRef} />
      </div>
    </div>
  );
}

const SwatchContext = createContext<RadioGroupState | null>(null);

/** One preset: a radio, named by its label or its colour. */
function Swatch({ swatch }: { swatch: ColorPickerSwatch }) {
  const state = useContext(SwatchContext)!;
  const { locale } = useLocale();
  const ref = useRef<HTMLInputElement>(null);
  const color = toColor(swatch.value, 'swatches')!;
  const hex = toHex(color);
  const { inputProps, isSelected } = useRadio(
    { value: hex, 'aria-label': swatch.label ?? color.getColorName(locale) },
    state,
    ref,
  );
  const { focusProps, isFocusVisible } = useFocusRing();

  return (
    <label
      className="ion-color-picker__swatch"
      data-selected={isSelected || undefined}
      data-focus-visible={isFocusVisible || undefined}
      style={{ '--ion-color-picker-swatch': hex } as React.CSSProperties}
    >
      <VisuallyHidden>
        <input {...mergeProps(inputProps, focusProps)} ref={ref} />
      </VisuallyHidden>
    </label>
  );
}

function Swatches({
  label,
  swatches,
  selected,
  onPick,
}: {
  label: string;
  swatches: ColorPickerSwatch[];
  selected: HexColor | null;
  onPick: (hex: HexColor) => void;
}) {
  const state = useRadioGroupState({
    // Controlled by the picker's colour: a drag off a preset clears it.
    value: selected,
    onChange: (v) => v && onPick(v),
    orientation: 'horizontal',
  });
  const { radioGroupProps } = useRadioGroup(
    { 'aria-label': label, orientation: 'horizontal' },
    state,
  );
  return (
    <div {...radioGroupProps} className="ion-color-picker__swatches">
      <SwatchContext.Provider value={state}>
        {swatches.map((s) => (
          <Swatch key={s.value} swatch={s} />
        ))}
      </SwatchContext.Provider>
    </div>
  );
}

/**
 * ColorPicker — a colour chosen by a person: a brand accent, a label's
 * colour, a chart series. A hex field with a swatch button; the button opens
 * a saturation and brightness area, a hue strip and any preset swatches.
 *
 * THE FIELD FIRST
 *
 * Typing `#0B5FFF` is the fastest way to a known colour and the only one that
 * needs no pointer, so the field is always there and the popover is the
 * second way in. The two cannot disagree: they are one value.
 *
 * THE HUE IS KEPT
 *
 * Hex has no hue for a grey or for black. Dragged to the bottom of the area,
 * `#000000` would come back as hue 0 and the strip would jump to red. The
 * picker holds its own HSB colour and emits hex from it, taking a new value
 * from the caller only when its hex differs — so a round trip through the
 * caller's state loses nothing.
 *
 * WHAT IT DOES NOT DO
 *
 *   - No alpha. A transparent brand colour renders differently on every
 *     ground; ask for a solid one.
 *   - No contrast check: the picker cannot know what goes on the colour.
 *     When text will sit on it, check the pair and say so with `isInvalid`.
 */
export function ColorPicker({
  label,
  'aria-label': ariaLabel,
  description,
  errorMessage,
  isInvalid,
  isDisabled,
  isReadOnly,
  isRequired,
  size = 'md',
  value,
  defaultValue,
  onChange,
  onChangeEnd,
  swatches,
  name,
  labels,
  className,
  wrapperClassName,
  id,
}: ColorPickerProps) {
  const l = { ...DEFAULTS, ...labels };

  // Validated on every render, so a bad value throws where it was passed.
  const incoming = value === undefined ? undefined : toColor(value, 'value');
  const [color, setColor] = useState<Color | null>(
    () => incoming ?? toColor(defaultValue, 'defaultValue'),
  );
  // A new value from the caller replaces ours only when its hex differs — see
  // "The hue is kept".
  const current = color ? toHex(color) : null;
  if (incoming !== undefined && (incoming ? toHex(incoming) : null) !== current)
    setColor(incoming);

  const presets = (swatches ?? []).map((s) =>
    typeof s === 'string' ? { value: s } : s,
  );

  const emit = (next: Color | null) => {
    setColor(next);
    const hex = next ? toHex(next) : null;
    if (hex !== current) onChange?.(hex);
  };
  const end = (next: Color | null) => onChangeEnd?.(next ? toHex(next) : null);

  const fieldState = useColorFieldState({
    value: color,
    onChange: (c) => {
      const next = c ? c.toFormat('hsb') : null;
      emit(next);
      end(next);
    },
    isDisabled,
    isReadOnly,
    isRequired,
    // The field's validity is read from this state, not from the hook's
    // props: passed only to `useColorField`, `isInvalid` never reached
    // `aria-invalid`.
    isInvalid,
    validationBehavior: 'aria',
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    labelProps,
    inputProps,
    descriptionProps,
    errorMessageProps,
    isInvalid: failsValidation,
    validationErrors,
  } = useColorField(
    {
      label: typeof label === 'string' ? label : undefined,
      'aria-label': ariaLabel,
      isDisabled,
      isReadOnly,
      isRequired,
      isInvalid,
      name,
      description,
      errorMessage,
      validationBehavior: 'aria',
    },
    fieldState,
    inputRef,
  );

  const overlay = useOverlayTriggerState({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const { triggerProps, overlayProps } = useOverlayTrigger(
    { type: 'dialog' },
    overlay,
    buttonRef,
  );
  const { buttonProps } = useButton(
    { ...triggerProps, isDisabled: isDisabled || isReadOnly },
    buttonRef,
  );
  const { hoverProps, isHovered } = useHover({ isDisabled });

  const invalid = !!isInvalid || failsValidation;
  const error =
    errorMessage ??
    (validationErrors.length ? validationErrors.join(' ') : null);
  const helper = invalid && error ? error : description;

  const shown = color ?? EMPTY;
  // React Aria gives the input an id of its own and ignores ours; a caller's
  // `id` is what an error summary links to, so it goes back on, label too.
  const inputId = id ?? inputProps.id;

  return (
    <div
      className={[
        'ion-field',
        invalid ? 'ion-field--error' : '',
        wrapperClassName || '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && (
        <label {...labelProps} htmlFor={inputId} className="ion-field__label">
          {label}
        </label>
      )}

      <div
        {...hoverProps}
        ref={groupRef}
        className={[
          'ion-input',
          'ion-color-picker',
          size !== 'md' ? `ion-input--${size}` : '',
          invalid ? 'ion-input--invalid' : '',
          isDisabled ? 'ion-input--disabled' : '',
          isReadOnly ? 'ion-input--readonly' : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-hovered={isHovered || undefined}
        data-open={overlay.isOpen || undefined}
        data-invalid={invalid || undefined}
        data-disabled={isDisabled || undefined}
        data-readonly={isReadOnly || undefined}
      >
        <button
          {...buttonProps}
          ref={buttonRef}
          type="button"
          aria-label={l.picker}
          className="ion-color-picker__button"
        >
          <span
            className="ion-color-picker__chip"
            data-empty={color ? undefined : true}
            style={
              current
                ? ({
                    '--ion-color-picker-swatch': current,
                  } as React.CSSProperties)
                : undefined
            }
            aria-hidden="true"
          />
        </button>
        <input
          {...mergeProps(inputProps, {
            // React Aria commits on blur only; Enter is a commit in any
            // text field, and the value should not wait for Tab.
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter') fieldState.commit();
            },
          })}
          id={inputId}
          ref={inputRef}
          className="ion-input__field ion-color-picker__field"
        />
      </div>

      {overlay.isOpen && !isDisabled && !isReadOnly && (
        <CalendarPopover
          state={overlay}
          triggerRef={groupRef}
          dialogProps={{
            ...overlayProps,
            ...(labelProps.id
              ? { 'aria-labelledby': labelProps.id }
              : { 'aria-label': ariaLabel }),
          }}
          className="ion-color-picker__popover"
        >
          {/* Focus starts in the area: without this scope it lands on the
              dialog itself. Keeping it in, and giving it back to the swatch
              button on close, is the popover's. */}
          <FocusScope autoFocus>
            <div className="ion-color-picker__panel">
              <ColorArea value={shown} onChange={emit} onChangeEnd={end} />
              <HueSlider value={shown} onChange={emit} onChangeEnd={end} />
              {presets.length > 0 && (
                <Swatches
                  label={l.swatches}
                  swatches={presets}
                  selected={current}
                  onPick={(hex) => {
                    const next = toColor(hex, 'swatches');
                    emit(next);
                    end(next);
                  }}
                />
              )}
            </div>
          </FocusScope>
        </CalendarPopover>
      )}

      {helper && (
        <span
          {...(invalid && error ? errorMessageProps : descriptionProps)}
          className="ion-field__helper"
        >
          {helper}
        </span>
      )}
    </div>
  );
}

ColorPicker.displayName = 'ColorPicker';
