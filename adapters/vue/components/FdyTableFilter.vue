<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue';
import { usePopover } from '../usePopover';
import { isFilterActive } from '../../core/table-model.js';
import type { FdyColumnFilter, FdyColumnFilterType } from '../../core/table-model';

// Internal to FdyTable: one column's header funnel button + its type-aware filter popover
// (text / enum / number / date) over freeday's `.fdy-table__filterbtn` + `.fdy-filter*` classes.
// Reuses usePopover so the panel escapes the table's `overflow:hidden` via the top layer. Purely
// controlled — it renders the current `filter` and emits the next one (or null to clear); the
// parent owns where that goes (client state or an `update:filters` emit). Not exported.

const props = defineProps<{
  label: string;
  type: FdyColumnFilterType;
  filter: FdyColumnFilter | undefined;
  /** Distinct values for an enum filter (computed by the parent over the full row set). */
  options: ReadonlyArray<string>;
}>();

const emit = defineEmits<{
  /** The next filter for this column, or null to clear it. */
  change: [filter: FdyColumnFilter | null];
}>();

const rootEl: Ref<HTMLSpanElement | null> = ref(null);
const triggerEl: Ref<HTMLButtonElement | null> = ref(null);
const panelEl: Ref<HTMLDivElement | null> = ref(null);
const open: Ref<boolean> = ref(false);

usePopover(panelEl, triggerEl, open);

const active: ComputedRef<boolean> = computed((): boolean => isFilterActive(props.filter));

// Typed reads of the current filter for the inputs (fall back to the empty shape per type).
const textValue: ComputedRef<string> = computed((): string =>
  props.filter?.type === 'text' ? props.filter.text : '',
);
const enumValues: ComputedRef<ReadonlyArray<string>> = computed((): ReadonlyArray<string> =>
  props.filter?.type === 'enum' ? props.filter.values : [],
);
const numMin: ComputedRef<string> = computed((): string =>
  props.filter?.type === 'number' && props.filter.min !== null ? String(props.filter.min) : '',
);
const numMax: ComputedRef<string> = computed((): string =>
  props.filter?.type === 'number' && props.filter.max !== null ? String(props.filter.max) : '',
);
const dateFrom: ComputedRef<string> = computed((): string =>
  props.filter?.type === 'date' && props.filter.from !== null ? props.filter.from : '',
);
const dateTo: ComputedRef<string> = computed((): string =>
  props.filter?.type === 'date' && props.filter.to !== null ? props.filter.to : '',
);

function apply(next: FdyColumnFilter): void {
  emit('change', isFilterActive(next) ? next : null);
}
function parseNum(v: string): number | null {
  const t: string = v.trim();
  if (t === '') return null;
  const n: number = Number(t);
  return Number.isNaN(n) ? null : n;
}
function onText(e: Event): void {
  apply({ type: 'text', text: (e.target as HTMLInputElement).value });
}
function onEnumToggle(value: string, checked: boolean): void {
  const set: string[] = enumValues.value.filter((v: string): boolean => v !== value);
  if (checked) set.push(value);
  apply({ type: 'enum', values: set });
}
function onNumber(which: 'min' | 'max', e: Event): void {
  const v: number | null = parseNum((e.target as HTMLInputElement).value);
  apply({
    type: 'number',
    min: which === 'min' ? v : parseNum(numMin.value),
    max: which === 'max' ? v : parseNum(numMax.value),
  });
}
function onDate(which: 'from' | 'to', e: Event): void {
  const v: string = (e.target as HTMLInputElement).value;
  const val: string | null = v === '' ? null : v;
  apply({
    type: 'date',
    from: which === 'from' ? val : (dateFrom.value || null),
    to: which === 'to' ? val : (dateTo.value || null),
  });
}

function toggle(): void {
  open.value = !open.value;
}
function close(returnFocus: boolean): void {
  open.value = false;
  if (returnFocus) triggerEl.value?.focus();
}
function reset(): void {
  emit('change', null);
  close(true);
}

// Dismiss on outside pointer or Escape while open.
function onDocPointerDown(e: MouseEvent): void {
  const t: EventTarget | null = e.target;
  if (rootEl.value !== null && t instanceof Node && !rootEl.value.contains(t) && !panelEl.value?.contains(t)) {
    close(false);
  }
}
function onDocKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && open.value) close(true);
}
watch(open, (isOpen: boolean): void => {
  if (isOpen) {
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('keydown', onDocKeydown);
  } else {
    document.removeEventListener('mousedown', onDocPointerDown);
    document.removeEventListener('keydown', onDocKeydown);
  }
});
onBeforeUnmount((): void => {
  document.removeEventListener('mousedown', onDocPointerDown);
  document.removeEventListener('keydown', onDocKeydown);
});
</script>

<template>
  <span ref="rootEl" class="fdy-table__filterwrap">
    <button
      ref="triggerEl"
      type="button"
      :class="active ? 'fdy-table__filterbtn is-active' : 'fdy-table__filterbtn'"
      aria-haspopup="dialog"
      :aria-pressed="active"
      :aria-expanded="open"
      :aria-label="`Filter ${label}`"
      @click.stop="toggle"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 5h18l-7 8v5l-4 2v-7z" />
      </svg>
    </button>

    <div ref="panelEl" class="fdy-filter" popover="manual" :hidden="!open" role="dialog" :aria-label="`Filter ${label}`">
      <template v-if="type === 'text'">
        <div class="fdy-filter__title">Contains text</div>
        <input class="fdy-input" type="search" placeholder="Contains…" :value="textValue" @input="onText" />
      </template>

      <template v-else-if="type === 'enum'">
        <div class="fdy-filter__title">Show values</div>
        <div class="fdy-filter__list">
          <label v-for="val in options" :key="val" class="fdy-filter__check">
            <input
              type="checkbox"
              class="fdy-checkbox"
              :checked="enumValues.includes(val)"
              @change="onEnumToggle(val, ($event.target as HTMLInputElement).checked)"
            />
            {{ val }}
          </label>
        </div>
      </template>

      <template v-else-if="type === 'number'">
        <div class="fdy-filter__title">Value range</div>
        <div class="fdy-filter__range">
          <input class="fdy-input" type="text" inputmode="numeric" placeholder="Min" :value="numMin" @input="onNumber('min', $event)" />
          <span aria-hidden="true">–</span>
          <input class="fdy-input" type="text" inputmode="numeric" placeholder="Max" :value="numMax" @input="onNumber('max', $event)" />
        </div>
      </template>

      <template v-else-if="type === 'date'">
        <div class="fdy-filter__title">Date range</div>
        <div class="fdy-filter__range">
          <input class="fdy-input" type="date" aria-label="From" :value="dateFrom" @input="onDate('from', $event)" />
          <span aria-hidden="true">–</span>
          <input class="fdy-input" type="date" aria-label="To" :value="dateTo" @input="onDate('to', $event)" />
        </div>
      </template>

      <div class="fdy-filter__foot">
        <button type="button" class="fdy-btn fdy-btn--ghost fdy-btn--sm" @click="reset">Reset</button>
        <button type="button" class="fdy-btn fdy-btn--sm" @click="close(true)">Close</button>
      </div>
    </div>
  </span>
</template>
