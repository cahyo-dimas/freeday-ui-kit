<script lang="ts">
export interface DateRangeValue {
  start: string | null;
  end: string | null;
}

/** `split`: two linked pickers. `single`: one field, one calendar, both ends picked in it. */
export type FdyDateRangeLayout = 'split' | 'single';
</script>

<script setup lang="ts">
import { computed, provide, type ComputedRef } from 'vue';
import FdyDatepicker from './FdyDatepicker.vue';
import { FDY_RANGE_FIELD, type FdyRangeFieldContext } from '../rangeField';

// A controlled date range, in one of two layouts that share the value and every prop below.
//
// `split` (the default) is freeday's `.fdy-daterange` (src/components/datepicker.css): two linked
// FdyDatepickers where the end can't precede the start (start.max = end, end.min = start). The
// vanilla enhancer's cross-calendar `.in-range` shading is not reproduced there (each picker is
// independent); the min/max linkage is what keeps the range valid.
//
// `single` is ONE FdyDatepicker that draws the range itself, told so through FDY_RANGE_FIELD rather
// than a prop of its own. The first day picked is the start, the second the end, and the value
// changes only when the range is whole, so `change` and `settled` arrive together.

const props = defineProps<{
  modelValue: DateRangeValue;
  /** `'split'` (default): two pickers. `'single'`: one field holding both dates. */
  layout?: FdyDateRangeLayout;
  /** The empty field's text under `layout="single"`. Default 'Select dates'. */
  placeholder?: string;
  /** Added to the accessible name of the range's first and last day under `layout="single"`, so
   *  an end is not told by colour alone. Defaults 'range start' / 'range end'. */
  rangeStartLabel?: string;
  rangeEndLabel?: string;
  min?: string;
  max?: string;
  locale?: string;
  disabled?: boolean;
  /** Locked/view mode for both pickers, focusable, values shown, but can't be opened or changed. */
  readonly?: boolean;
  invalid?: boolean;
  /** Both ends must be filled for a `data-fdy-validate` form to submit. Forwarded to BOTH pickers,
   *  each refusing on its own; the two share the field's one message slot (#114). */
  required?: boolean;
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
}>();

const emit = defineEmits<{
  'update:modelValue': [value: DateRangeValue];
  change: [value: DateRangeValue];
  /** Both ends chosen, or both cleared: the only states worth reloading a list for (#063). */
  settled: [value: DateRangeValue];
}>();

const startMax: ComputedRef<string | undefined> = computed((): string | undefined => props.modelValue.end ?? props.max);
const endMin: ComputedRef<string | undefined> = computed((): string | undefined => props.modelValue.start ?? props.min);

function isSettled(range: DateRangeValue): boolean {
  return !range.start === !range.end;
}
function commit(next: DateRangeValue): void {
  emit('update:modelValue', next);
  emit('change', next);
  if (isSettled(next)) emit('settled', next);
}
function setStart(start: string): void {
  commit({ start, end: props.modelValue.end });
}
function setEnd(end: string): void {
  commit({ start: props.modelValue.start, end });
}

const rangeField: FdyRangeFieldContext = {
  enabled: computed((): boolean => props.layout === 'single'),
  start: computed((): string | null => props.modelValue.start),
  end: computed((): string | null => props.modelValue.end),
  ariaLabel: computed((): string | undefined => props.ariaLabel),
  rangeStartLabel: computed((): string => props.rangeStartLabel ?? 'range start'),
  rangeEndLabel: computed((): string => props.rangeEndLabel ?? 'range end'),
  commit: (start: string, end: string): void => commit({ start, end }),
};
provide(FDY_RANGE_FIELD, rangeField);
</script>

<template>
  <FdyDatepicker
    v-if="layout === 'single'"
    :model-value="modelValue.start"
    :min="min"
    :max="max"
    :locale="locale"
    :disabled="disabled"
    :readonly="readonly"
    :invalid="invalid"
    :required="required"
    :describedby="describedby"
    :aria-labelledby="ariaLabelledby"
    :placeholder="placeholder ?? 'Select dates'"
    :prev-month-label="prevMonthLabel"
    :next-month-label="nextMonthLabel"
    :prev-year-label="prevYearLabel"
    :next-year-label="nextYearLabel"
    :prev-years-label="prevYearsLabel"
    :next-years-label="nextYearsLabel"
    :choose-month-label="chooseMonthLabel"
    :choose-year-label="chooseYearLabel"
  />
  <div v-else class="fdy-daterange" role="group" :aria-label="ariaLabel" :aria-labelledby="ariaLabelledby">
    <FdyDatepicker
      :model-value="modelValue.start"
      :min="min"
      :max="startMax"
      :locale="locale"
      :disabled="disabled"
      :readonly="readonly"
      :invalid="invalid"
      :required="required"
      :describedby="describedby"
      :placeholder="startPlaceholder ?? 'Dari'"
      :prev-month-label="prevMonthLabel"
      :next-month-label="nextMonthLabel"
      :prev-year-label="prevYearLabel"
      :next-year-label="nextYearLabel"
      :prev-years-label="prevYearsLabel"
      :next-years-label="nextYearsLabel"
      :choose-month-label="chooseMonthLabel"
      :choose-year-label="chooseYearLabel"
      @update:model-value="setStart"
    />
    <span class="fdy-daterange__sep" aria-hidden="true">–</span>
    <FdyDatepicker
      :model-value="modelValue.end"
      :min="endMin"
      :max="max"
      :locale="locale"
      :disabled="disabled"
      :readonly="readonly"
      :invalid="invalid"
      :required="required"
      :describedby="describedby"
      :placeholder="endPlaceholder ?? 'Sampai'"
      :prev-month-label="prevMonthLabel"
      :next-month-label="nextMonthLabel"
      :prev-year-label="prevYearLabel"
      :next-year-label="nextYearLabel"
      :prev-years-label="prevYearsLabel"
      :next-years-label="nextYearsLabel"
      :choose-month-label="chooseMonthLabel"
      :choose-year-label="chooseYearLabel"
      @update:model-value="setEnd"
    />
  </div>
</template>
