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
  /** Both ends chosen, or both cleared: the only states worth reloading a list for (#063). */
  onSettled?: (value: DateRangeValue) => void;
  min?: string;
  max?: string;
  locale?: string;
  disabled?: boolean;
  /** Locked/view mode for both pickers, focusable, values shown, but can't be opened or changed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  /* Forwarded verbatim to BOTH pickers. Without these the range was the one picker in the kit
     whose calendar nav could not be named in the page's own language: FdyDatepicker takes them,
     FdyDateRange dropped them, so an Indonesian app got "Previous month" on the only date control
     it could not reach. Flat `xxxLabel` props, not a `labels` object, because that is the shape
     every other component in the kit already uses. Raised from keamanan-cluster (#095). */
  prevMonthLabel?: string;
  nextMonthLabel?: string;
  prevYearLabel?: string;
  nextYearLabel?: string;
  prevYearsLabel?: string;
  nextYearsLabel?: string;
  chooseMonthLabel?: string;
  chooseYearLabel?: string;
}

export function FdyDateRange(props: FdyDateRangeProps): JSX.Element {
  const commit = (next: DateRangeValue): void => {
    props.onChange(next);
    if (!next.start === !next.end) props.onSettled?.(next);
  };
  const onStart = (start: string): void => commit({ start, end: props.value.end });
  const onEnd = (end: string): void => commit({ start: props.value.start, end });

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
        prevMonthLabel={props.prevMonthLabel}
        nextMonthLabel={props.nextMonthLabel}
        prevYearLabel={props.prevYearLabel}
        nextYearLabel={props.nextYearLabel}
        prevYearsLabel={props.prevYearsLabel}
        nextYearsLabel={props.nextYearsLabel}
        chooseMonthLabel={props.chooseMonthLabel}
        chooseYearLabel={props.chooseYearLabel}
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
        prevMonthLabel={props.prevMonthLabel}
        nextMonthLabel={props.nextMonthLabel}
        prevYearLabel={props.prevYearLabel}
        nextYearLabel={props.nextYearLabel}
        prevYearsLabel={props.prevYearsLabel}
        nextYearsLabel={props.nextYearsLabel}
        chooseMonthLabel={props.chooseMonthLabel}
        chooseYearLabel={props.chooseYearLabel}
      />
    </div>
  );
}
