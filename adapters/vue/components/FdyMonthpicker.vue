<script lang="ts">
/* The one format this component speaks, re-exported from the shared core so the name has a single
   home. `FdyDatepicker` cannot use it: its `modelValue` holds `YYYY-MM-DD` or `YYYY-MM` depending
   on `mode`, and a `defineProps<{...}>` cannot carry a union discriminated by another prop. That
   is the whole reason this component exists. */
export type { FdyMonth } from '../../core/month-grid';
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, type ComputedRef, type Ref } from 'vue';
import { usePopover } from '../usePopover';
import {
  YEARS_PER_PAGE,
  addMonths,
  monthCells as buildMonthCells,
  monthFormatters,
  monthKeyIntent,
  pageLocale,
  parseISOMonth,
  startOfMonth,
  toISOMonth,
  yearCells as buildYearCells,
  yearKeyIntent,
  yearPageStart,
  yearRangeLabel,
  type FdyMonthCell,
  type FdyMonthFormatters,
  type FdyYearCell,
} from '../../core/month-grid.js';

// A controlled month picker over freeday's `.fdy-datepicker` / `.fdy-cal__*` classes (see
// src/components/datepicker.css). It renders the same trigger and the same popover the date picker
// does, and reuses `FdyDatepicker`'s own month and year grids through
// adapters/core/month-grid.js, so there is one copy of that logic rather than a fifth.
//
// It exists for its SIGNATURE. 3.8.0 answered "we need a month" with `mode="month"` on
// FdyDatepicker, which left `modelValue: string | null` carrying `YYYY-MM-DD` or `YYYY-MM`
// depending on a different prop. Here the value has one format, there is no mode to read, and the
// day grid is absent rather than merely unvisited.
//
// Month names come from `<html lang>` through Intl, which is the capability `<input type="month">`
// cannot offer: it names the month in the BROWSER's language.

/** Which grid is on screen. There is no level below months here: that is the component. */
type CalendarLevel = 'months' | 'years';

const props = defineProps<{
  /** The chosen month, ISO `YYYY-MM` (`'2026-10'`). `''`/`null` for empty. One format, always. */
  modelValue: string | null;
  /** Earliest selectable month, `YYYY-MM` (a full `YYYY-MM-DD` is read too, as its own month). */
  min?: string;
  /** Latest selectable month. A bound that falls inside a month leaves that month pickable. */
  max?: string;
  /** BCP-47 tag for the month names. Defaults to the page's `<html lang>`, then `en`. */
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Locked/view mode: stays focusable and shows its month, but can't be opened, cleared, or changed. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  /**
   * Let a `data-fdy-validate` form demand this control be filled. It renders `data-fdy-required`
   * on the root, and `freeday-form.js` refuses the submit, paints the message in the field and
   * focuses the trigger. Needed because the trigger is a `<button>`: `willValidate` is false, so
   * a plain `required` on it has never meant anything (#096). Override the message per control
   * with `data-fdy-msg-required`, which falls through onto the root.
   */
  required?: boolean;
  invalid?: boolean;
  describedby?: string;
  id?: string;
  ariaLabelledby?: string;
  /** Show a clear (×) button in the trigger when a month is set, so an optional month can be unset. Emits `''` via update:modelValue + change. Off by default. */
  clearable?: boolean;
  /** aria-label for the clear button (when `clearable`). Default 'Clear month'. */
  clearLabel?: string;
  /** aria-labels for the year arrows shown in the month grid. Defaults 'Previous year' / 'Next year'. */
  prevYearLabel?: string;
  nextYearLabel?: string;
  /** aria-label for the title button that drills from the month grid to the year grid. Default 'Choose year'. */
  chooseYearLabel?: string;
  /** aria-labels for the page arrows shown in the year grid. Defaults 'Previous years' / 'Next years'. */
  prevYearsLabel?: string;
  nextYearsLabel?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
}>();

const baseId: string = useId();
const triggerId: ComputedRef<string> = computed((): string => props.id ?? `${baseId}-trigger`);
const titleId: string = `${baseId}-title`;

const rootEl: Ref<HTMLDivElement | null> = ref(null);
const triggerEl: Ref<HTMLButtonElement | null> = ref(null);
const panelEl: Ref<HTMLDivElement | null> = ref(null);

const open: Ref<boolean> = ref(false);

// Render the panel in the top layer (popover) so it never gets clipped by a card or scroll
// container; positions against the trigger. Same plumbing every kit dropdown uses.
usePopover(panelEl, triggerEl, open);

/** Resolved once here so every formatter below reads the same tag. */
const activeLocale: ComputedRef<string> = computed((): string => props.locale ?? pageLocale());
const formatters: ComputedRef<FdyMonthFormatters> = computed(
  (): FdyMonthFormatters => monthFormatters(activeLocale.value),
);

const selectedDate: ComputedRef<Date | null> = computed((): Date | null => parseISOMonth(props.modelValue));
const minDate: ComputedRef<Date | null> = computed((): Date | null => parseISOMonth(props.min));
const maxDate: ComputedRef<Date | null> = computed((): Date | null => parseISOMonth(props.max));
const isDisabled: ComputedRef<boolean> = computed((): boolean => props.disabled === true);
const isReadonly: ComputedRef<boolean> = computed((): boolean => props.readonly === true);
const isInvalid: ComputedRef<boolean> = computed((): boolean => props.invalid === true);
const displayPlaceholder: ComputedRef<string> = computed((): string => props.placeholder ?? 'Select month');
const showClear: ComputedRef<boolean> = computed(
  (): boolean => props.clearable === true && selectedDate.value !== null && isDisabled.value === false && isReadonly.value === false,
);
const clearLabelText: ComputedRef<string> = computed((): string => props.clearLabel ?? 'Clear month');
const chooseYearLabelText: ComputedRef<string> = computed((): string => props.chooseYearLabel ?? 'Choose year');
const prevYearLabelText: ComputedRef<string> = computed((): string => props.prevYearLabel ?? 'Previous year');
const nextYearLabelText: ComputedRef<string> = computed((): string => props.nextYearLabel ?? 'Next year');
const prevYearsLabelText: ComputedRef<string> = computed((): string => props.prevYearsLabel ?? 'Previous years');
const nextYearsLabelText: ComputedRef<string> = computed((): string => props.nextYearsLabel ?? 'Next years');

/** The year the month grid shows, held as its January so the shared helpers can take a Date. */
const view: Ref<Date> = ref(startOfMonth(selectedDate.value ?? new Date()));
const level: Ref<CalendarLevel> = ref('months');
const focusMonth: Ref<number> = ref(0);
const focusYear: Ref<number> = ref(0);

/* The month named in the page's language, through the same formatter the cells use. This is the
   capability `<input type="month">` cannot be pushed into: it reads the browser. */
const displayValue: ComputedRef<string> = computed((): string => {
  if (selectedDate.value === null) return displayPlaceholder.value;
  return formatters.value.name.format(selectedDate.value);
});

const monthCells: ComputedRef<FdyMonthCell[]> = computed((): FdyMonthCell[] => buildMonthCells({
  year: view.value.getFullYear(),
  selected: selectedDate.value,
  min: minDate.value,
  max: maxDate.value,
  focusMonth: focusMonth.value,
  formatters: formatters.value,
}));

const yearPage: ComputedRef<number> = computed((): number => yearPageStart(focusYear.value));

const yearCells: ComputedRef<FdyYearCell[]> = computed((): FdyYearCell[] => buildYearCells({
  pageStart: yearPage.value,
  selected: selectedDate.value,
  min: minDate.value,
  max: maxDate.value,
  focusYear: focusYear.value,
}));

const yearRangeText: ComputedRef<string> = computed((): string => yearRangeLabel(yearPage.value));

function focusMonthCell(): void {
  const cell: HTMLElement | null = panelEl.value?.querySelector('.fdy-cal__month[tabindex="0"]') ?? null;
  cell?.focus();
}

function focusYearCell(): void {
  const cell: HTMLElement | null = panelEl.value?.querySelector('.fdy-cal__year[tabindex="0"]') ?? null;
  cell?.focus();
}

/** `index` is already 0-11: the wrap lives in `monthKeyIntent`, so it is applied in one place. */
function moveMonthFocus(index: number, yearDelta: number): void {
  if (yearDelta !== 0) view.value = addMonths(view.value, yearDelta * 12);
  focusMonth.value = index;
  void nextTick((): void => focusMonthCell());
}

/* A month is the ANSWER here. In FdyDatepicker the same click walks down into the month's days,
   which is the one thing the two components do differently with the shared grid. */
function pickMonth(index: number): void {
  const year: number = view.value.getFullYear();
  if (monthCells.value[index].disabled) return;
  const first: Date = new Date(year, index, 1);
  focusMonth.value = index;
  view.value = first;
  const iso: string = toISOMonth(first);
  emit('update:modelValue', iso);
  emit('change', iso);
  closePanel(true);
}

function openYearGrid(): void {
  focusYear.value = view.value.getFullYear();
  level.value = 'years';
  void nextTick((): void => focusYearCell());
}

function openMonthGrid(): void {
  focusMonth.value = view.value.getMonth();
  level.value = 'months';
  void nextTick((): void => focusMonthCell());
}

/* Picking a year is NAVIGATION and commits nothing: it drops to that year's months, where the
   answer is given. Without this level, reaching a month four years back is four arrow presses per
   year and no pointer route at all. */
function openYear(year: number): void {
  view.value = new Date(year, view.value.getMonth(), 1);
  openMonthGrid();
}

function moveYearFocus(year: number): void {
  focusYear.value = year;
  view.value = new Date(year, view.value.getMonth(), 1);
  void nextTick((): void => focusYearCell());
}

function onMonthKeydown(e: KeyboardEvent): void {
  const intent = monthKeyIntent(e.key, focusMonth.value);
  if (intent.action === 'none') return;
  e.preventDefault();
  if (intent.action === 'focus') moveMonthFocus(intent.index, intent.yearDelta);
  else if (intent.action === 'choose') pickMonth(intent.index);
  else closePanel(true);
}

function onYearKeydown(e: KeyboardEvent): void {
  const intent = yearKeyIntent(e.key, focusYear.value);
  if (intent.action === 'none') return;
  /* stopPropagation as well, matching FdyDatepicker's year grid: the panel is in the top layer and
     a bubbling Escape would otherwise be read a second time by whatever is behind it. */
  e.preventDefault();
  e.stopPropagation();
  if (intent.action === 'focus') moveYearFocus(intent.year);
  else if (intent.action === 'choose') openYear(intent.year);
  else closePanel(true);
}

// Clear (reset to empty). Emits '', parseISOMonth('') is null, so the placeholder shows again.
function clearValue(): void {
  emit('update:modelValue', '');
  emit('change', '');
  open.value = false;
  triggerEl.value?.focus();
}

function openPanel(): void {
  if (isDisabled.value || isReadonly.value || open.value) return;
  view.value = startOfMonth(selectedDate.value ?? view.value);
  /* Reopening starts on months. Without this a picker that drilled to the year grid and was
     dismissed would open on years next time, and a keyboard user would land on a grid that cannot
     answer. */
  level.value = 'months';
  focusMonth.value = view.value.getMonth();
  open.value = true;
  void nextTick((): void => focusMonthCell());
}

function closePanel(returnFocus: boolean): void {
  if (!open.value) return;
  open.value = false;
  if (returnFocus) triggerEl.value?.focus();
}

function toggle(): void {
  if (open.value) closePanel(false);
  else openPanel();
}

// Close when a pointer lands outside the whole control.
function onDocPointerDown(e: MouseEvent): void {
  const target: EventTarget | null = e.target;
  if (rootEl.value !== null && target instanceof Node && !rootEl.value.contains(target)) {
    closePanel(false);
  }
}

/* A null relatedTarget means focus fell to <body>, which is what happens when the element the user
 * just pressed is REMOVED by the click it triggered (drilling into the year grid replaces the grid,
 * and with it the cell that had focus). That is not focus leaving the control, and closing on it
 * made the panel vanish mid-navigation. A pointer that really lands outside is handled by the
 * mousedown listener, which is the reliable path for that case. */
function onFocusout(e: FocusEvent): void {
  const next: EventTarget | null = e.relatedTarget;
  if (next === null) return;
  if (rootEl.value !== null && !(next instanceof Node && rootEl.value.contains(next))) {
    closePanel(false);
  }
}

onMounted((): void => {
  document.addEventListener('mousedown', onDocPointerDown);
});
onBeforeUnmount((): void => {
  document.removeEventListener('mousedown', onDocPointerDown);
});
</script>

<template>
  <div ref="rootEl" class="fdy-datepicker" :class="{ 'fdy-datepicker--error': isInvalid }"
       :data-value="modelValue ?? ''" :data-fdy-required="required === true ? '' : undefined" @focusout="onFocusout">
    <button
      :id="triggerId"
      ref="triggerEl"
      type="button"
      class="fdy-datepicker__trigger"
      :class="{ 'is-open': open }"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-labelledby="ariaLabelledby"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-readonly="isReadonly ? 'true' : undefined"
      :aria-describedby="describedby"
      :disabled="isDisabled"
      @click="toggle"
    >
      <span class="fdy-datepicker__value" :class="{ 'fdy-datepicker__value--placeholder': selectedDate === null }">{{ displayValue }}</span>
      <span class="fdy-datepicker__icon" :class="{ 'is-hidden': showClear }" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"></rect>
          <path d="M16 2v4M8 2v4M3 10h18"></path>
        </svg>
      </span>
    </button>
    <button
      v-if="showClear"
      type="button"
      class="fdy-datepicker__clear"
      :aria-label="clearLabelText"
      @mousedown.prevent
      @click="clearValue"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12"></path>
      </svg>
    </button>

    <div ref="panelEl" class="fdy-datepicker__panel" role="dialog" aria-modal="false" popover="manual" :aria-labelledby="titleId" :hidden="!open">
      <!-- ONE head for both levels on purpose: swapping it with v-if destroys the very button the
           user just pressed, focus falls to <body>, and the panel's own focusout handler closes it.
           The labels and handlers switch; the elements do not. -->
      <div class="fdy-cal__head">
        <button
          type="button"
          class="fdy-cal__nav"
          :aria-label="level === 'years' ? prevYearsLabelText : prevYearLabelText"
          @click="level === 'years' ? moveYearFocus(focusYear - YEARS_PER_PAGE) : moveMonthFocus(focusMonth, -1)"
        >‹</button>
        <button
          :id="titleId"
          type="button"
          class="fdy-cal__title"
          :aria-label="level === 'years' ? undefined : chooseYearLabelText"
          @click="level === 'years' ? openMonthGrid() : openYearGrid()"
        >{{ level === 'years' ? yearRangeText : String(view.getFullYear()) }}</button>
        <button
          type="button"
          class="fdy-cal__nav"
          :aria-label="level === 'years' ? nextYearsLabelText : nextYearLabelText"
          @click="level === 'years' ? moveYearFocus(focusYear + YEARS_PER_PAGE) : moveMonthFocus(focusMonth, 1)"
        >›</button>
      </div>
      <div v-if="level === 'years'" class="fdy-cal__grid fdy-cal__grid--years" role="grid" :aria-labelledby="titleId" @keydown="onYearKeydown">
        <button
          v-for="cell in yearCells"
          :key="cell.year"
          type="button"
          class="fdy-cal__year"
          :class="{ 'is-today': cell.today, 'is-selected': cell.selected }"
          role="gridcell"
          :aria-label="String(cell.year)"
          :aria-selected="cell.selected ? 'true' : undefined"
          :disabled="cell.disabled"
          :tabindex="cell.focusable ? 0 : -1"
          @click="openYear(cell.year)"
        >{{ cell.year }}</button>
      </div>
      <div v-else class="fdy-cal__grid fdy-cal__grid--months" role="grid" :aria-labelledby="titleId" @keydown="onMonthKeydown">
        <button
          v-for="cell in monthCells"
          :key="cell.index"
          type="button"
          class="fdy-cal__month"
          :class="{ 'is-today': cell.today, 'is-selected': cell.selected }"
          role="gridcell"
          :aria-label="cell.ariaLabel"
          :aria-selected="cell.selected ? 'true' : undefined"
          :disabled="cell.disabled"
          :tabindex="cell.focusable ? 0 : -1"
          @click="pickMonth(cell.index)"
        >{{ cell.label }}</button>
      </div>
    </div>
  </div>
</template>
