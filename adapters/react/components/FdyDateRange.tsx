import type { JSX } from 'react';
import { FdyDatepicker } from './FdyDatepicker';

// A controlled date range over freeday's `.fdy-daterange` layout (src/components/datepicker.css):
// two linked FdyDatepickers where the end can't precede the start (start.max = end, end.min = start).
// `value` + `onChange` in place of Vue's `v-model`; this composes the single-date picker rather than
// re-implementing the calendar. Note: the vanilla enhancer's cross-calendar `.in-range` day shading
// is not reproduced (each picker is independent), the min/max linkage is what keeps the range valid.

export interface DateRangeValue {
  start: string | null;
  end: string | null;
}

export interface FdyDateRangeProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  min?: string;
  max?: string;
  locale?: string;
  disabled?: boolean;
  /** Locked/view mode for both pickers — focusable, values shown, but can't be opened or changed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
}

export function FdyDateRange(props: FdyDateRangeProps): JSX.Element {
  const onStart = (start: string): void => props.onChange({ start, end: props.value.end });
  const onEnd = (end: string): void => props.onChange({ start: props.value.start, end });

  return (
    <div
      className="fdy-daterange"
      role="group"
      aria-label={props.ariaLabel}
      aria-labelledby={props.ariaLabelledby}
    >
      <FdyDatepicker
        value={props.value.start}
        onChange={onStart}
        min={props.min}
        max={props.value.end ?? props.max}
        locale={props.locale}
        disabled={props.disabled}
        readonly={props.readonly}
        invalid={props.invalid}
        describedby={props.describedby}
        placeholder={props.startPlaceholder ?? 'Dari'}
      />
      <span className="fdy-daterange__sep" aria-hidden="true">–</span>
      <FdyDatepicker
        value={props.value.end}
        onChange={onEnd}
        min={props.value.start ?? props.min}
        max={props.max}
        locale={props.locale}
        disabled={props.disabled}
        readonly={props.readonly}
        invalid={props.invalid}
        describedby={props.describedby}
        placeholder={props.endPlaceholder ?? 'Sampai'}
      />
    </div>
  );
}
