<script lang="ts">
export interface DateRangeValue {
  start: string | null;
  end: string | null;
}
</script>

<script setup lang="ts">
import { computed, type ComputedRef } from 'vue';
import FdyDatepicker from './FdyDatepicker.vue';

// A controlled date range over freeday's `.fdy-daterange` layout (src/components/datepicker.css):
// two linked FdyDatepickers where the end can't precede the start (start.max = end, end.min =
// start). A real `v-model:DateRangeValue` that composes the single-date picker rather than
// re-implementing the calendar. The vanilla enhancer's cross-calendar `.in-range` day shading is
// not reproduced (each picker is independent), the min/max linkage is what keeps the range valid.

const props = defineProps<{
  modelValue: DateRangeValue;
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
}>();

const emit = defineEmits<{
  'update:modelValue': [value: DateRangeValue];
  change: [value: DateRangeValue];
}>();

const startMax: ComputedRef<string | undefined> = computed((): string | undefined => props.modelValue.end ?? props.max);
const endMin: ComputedRef<string | undefined> = computed((): string | undefined => props.modelValue.start ?? props.min);

function setStart(start: string): void {
  const next: DateRangeValue = { start, end: props.modelValue.end };
  emit('update:modelValue', next);
  emit('change', next);
}
function setEnd(end: string): void {
  const next: DateRangeValue = { start: props.modelValue.start, end };
  emit('update:modelValue', next);
  emit('change', next);
}
</script>

<template>
  <div class="fdy-daterange" role="group" :aria-label="ariaLabel" :aria-labelledby="ariaLabelledby">
    <FdyDatepicker
      :model-value="modelValue.start"
      :min="min"
      :max="startMax"
      :locale="locale"
      :disabled="disabled"
      :readonly="readonly"
      :invalid="invalid"
      :describedby="describedby"
      :placeholder="startPlaceholder ?? 'Dari'"
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
      :describedby="describedby"
      :placeholder="endPlaceholder ?? 'Sampai'"
      @update:model-value="setEnd"
    />
  </div>
</template>
