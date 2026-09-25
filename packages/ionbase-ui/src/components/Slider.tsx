'use client';

import React, { useId, useRef } from 'react';
import {
  mergeProps,
  useFocusRing,
  useLocale,
  useNumberFormatter,
  useSlider,
  useSliderThumb,
  VisuallyHidden,
} from 'react-aria';
import { useSliderState, type SliderState } from 'react-stately';

/** One value, or a `[low, high]` pair for a range. */
export type SliderValue = number | readonly [number, number];

/** Widens a literal: a `defaultValue={20}` slider reports `number`, not `20`. */
type Widen<V extends SliderValue> = V extends number
  ? number
  : readonly [number, number];

export interface SliderProps<V extends SliderValue = number> {
  /** Visible label. Names the group, and every thumb through it. */
  label?: React.ReactNode;
  /** Only when there is no visible label. */
  'aria-label'?: string;
  /** Helper text under the track, linked to every thumb. */
  description?: React.ReactNode;
  /**
   * A number for one thumb, `[low, high]` for two. The shape of `value` or
   * `defaultValue` decides which slider this is.
   */
  value?: V;
  defaultValue?: V;
  /** Fires on every step of a drag or key press. */
  onChange?: (value: Widen<V>) => void;
  /**
   * Fires once, when a drag ends or a key is released. Use this, not
   * `onChange`, for anything that fetches or saves.
   */
  onChangeEnd?: (value: Widen<V>) => void;
  /** Default 0. */
  minValue?: number;
  /** Default 100. */
  maxValue?: number;
  /** Default 1. Page Up and Page Down move by a tenth of the range. */
  step?: number;
  /**
   * How values are shown and announced — `{ style: 'percent' }`,
   * `{ style: 'unit', unit: 'second' }`, currency. In the user's locale.
   */
  formatOptions?: Intl.NumberFormatOptions;
  /**
   * A range's two thumbs, named. Each is read before the label — "Minimum
   * Duration". Pass translations here.
   */
  thumbLabels?: readonly [string, string];
  /** The current value beside the label. On by default. */
  showValue?: boolean;
  isDisabled?: boolean;
  /**
   * The form field name. A range submits two fields, so it takes a pair.
   */
  name?: V extends number ? string : readonly [string, string];
  id?: string;
  className?: string;
}

const DEFAULT_THUMB_LABELS = ['Minimum', 'Maximum'] as const;

function Thumb({
  state,
  index,
  trackRef,
  name,
  label,
  describedBy,
}: {
  state: SliderState;
  index: number;
  trackRef: React.RefObject<HTMLDivElement | null>;
  name?: string;
  label?: string;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Disabled comes from the slider's state; the thumb reads it there.
  const { thumbProps, inputProps, isDragging } = useSliderThumb(
    {
      index,
      trackRef,
      inputRef,
      name,
      'aria-label': label,
      'aria-describedby': describedBy,
    },
    state,
  );
  const { focusProps, isFocusVisible } = useFocusRing();
  return (
    <div
      {...thumbProps}
      className="ion-slider__thumb"
      data-dragging={isDragging || undefined}
      data-focus-visible={isFocusVisible || undefined}
    >
      <VisuallyHidden>
        <input ref={inputRef} {...mergeProps(inputProps, focusProps)} />
      </VisuallyHidden>
    </div>
  );
}

/**
 * Slider — a value, or a range, picked along a track.
 *
 * WHEN A SLIDER, AND WHEN NOT
 *
 * For a rough value in a known range, where where-it-sits matters more than
 * the exact number: a threshold, a zoom, a "between 30s and 2m" filter. When
 * the number itself matters — a price, a budget — NumberInput: dragging to
 * exactly 4,250 is a test of hand steadiness.
 *
 * HOW IT IS BUILT
 *
 *   - Each thumb is a real `<input type="range">`, visually hidden, so the
 *     platform's slider keyboard and screen-reader model come for free:
 *     arrows step, Page Up/Down jump a tenth, Home/End go to the bounds.
 *     `aria-valuetext` carries the formatted value, so "45%" is read, not
 *     "0.45".
 *   - A range's thumbs cannot cross: each one's bounds are the other's value.
 *   - Pressing the track moves the nearest thumb there.
 *   - Every thumb's hit area is 24px square — WCAG 2.5.8 — around a 20px knob,
 *     and the track is 24px tall for the same reason, around a 4px rail.
 *   - In a right-to-left locale the track runs right to left, keys included.
 */
export function Slider<V extends SliderValue = number>({
  label,
  'aria-label': ariaLabel,
  description,
  value,
  defaultValue,
  onChange,
  onChangeEnd,
  minValue = 0,
  maxValue = 100,
  step = 1,
  formatOptions,
  thumbLabels = DEFAULT_THUMB_LABELS,
  showValue = true,
  isDisabled,
  name,
  id,
  className,
}: SliderProps<V>) {
  const isRange = Array.isArray(value ?? defaultValue);
  const toArray = (v: SliderValue | undefined) =>
    v === undefined ? undefined : typeof v === 'number' ? [v] : [...v];
  const fromArray = (v: number[]) =>
    (isRange ? [v[0], v[1]] : v[0]) as Widen<V>;

  const trackRef = useRef<HTMLDivElement>(null);
  const numberFormatter = useNumberFormatter(formatOptions);
  const { direction } = useLocale();
  const helperId = useId();

  const hookProps = {
    label,
    'aria-label': ariaLabel,
    id,
    value: toArray(value),
    defaultValue: toArray(defaultValue) ?? (isRange ? undefined : [minValue]),
    onChange: onChange ? (v: number[]) => onChange(fromArray(v)) : undefined,
    onChangeEnd: onChangeEnd
      ? (v: number[]) => onChangeEnd(fromArray(v))
      : undefined,
    minValue,
    maxValue,
    step,
    isDisabled,
  };
  const state = useSliderState({ ...hookProps, numberFormatter });
  const { groupProps, trackProps, labelProps, outputProps } = useSlider(
    hookProps,
    state,
    trackRef,
  );

  /*
   * The fill is placed with physical `left` because the thumbs are: React
   * Aria positions them from the left and flips the percentage in RTL. A
   * logical `inset-inline-start` here would flip it a second time.
   */
  const pcts = state.values.map((_, i) => state.getThumbPercent(i));
  let from = isRange ? pcts[0] : 0;
  let to = isRange ? pcts[1] : pcts[0];
  if (direction === 'rtl') [from, to] = [1 - to, 1 - from];

  const shown = isRange
    ? `${state.getThumbValueLabel(0)} – ${state.getThumbValueLabel(1)}`
    : state.getThumbValueLabel(0);
  const names = (
    typeof name === 'string' ? [name] : (name as readonly string[] | undefined)
  ) as readonly string[] | undefined;

  return (
    <div
      {...groupProps}
      className={['ion-slider', className || ''].filter(Boolean).join(' ')}
      data-disabled={isDisabled || undefined}
    >
      {(label || showValue) && (
        <div className="ion-slider__header">
          {label && (
            <label {...labelProps} className="ion-slider__label">
              {label}
            </label>
          )}
          {showValue && (
            <output {...outputProps} className="ion-slider__value">
              {shown}
            </output>
          )}
        </div>
      )}
      <div
        {...trackProps}
        ref={trackRef}
        className="ion-slider__track"
        style={
          {
            '--ion-slider-from': `${from * 100}%`,
            '--ion-slider-to': `${to * 100}%`,
          } as React.CSSProperties
        }
      >
        <div className="ion-slider__rail" aria-hidden="true" />
        <div className="ion-slider__fill" aria-hidden="true" />
        {state.values.map((_, i) => (
          <Thumb
            key={i}
            state={state}
            index={i}
            trackRef={trackRef}
            name={names?.[i]}
            label={isRange ? thumbLabels[i] : undefined}
            describedBy={description ? helperId : undefined}
          />
        ))}
      </div>
      {description && (
        <span id={helperId} className="ion-slider__helper">
          {description}
        </span>
      )}
    </div>
  );
}

Slider.displayName = 'Slider';
