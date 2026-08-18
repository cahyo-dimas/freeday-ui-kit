<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, type ComputedRef, type Ref } from 'vue';
import { usePopover } from '../usePopover';

// A Vue-native binding over freeday's `.fdy-datepicker` / `.fdy-cal__*` classes
// (see src/components/datepicker.css). freeday ships the styled trigger+popover
// pair plus a framework-agnostic enhancer (freeday-datepicker.js) whose own
// header says the DOM it builds is meant for markup it owns wholesale. Letting
// that enhancer manage the DOM would fight Vue's rendering, so this component
// re-implements its single-date calendar behavior (month grid, keyboard nav,
// min/max clamping, Intl locale formatting) in Vue, giving a real `v-model`
// over the same kit classes. Open/close (outside-click + focusout) mirrors the
// already-approved FdyCombo.vue pattern. Range mode is out of scope (v1 = single date).

interface DayCell {
  date: Date;
  iso: string;
  label: number;
  ariaLabel: string;
  outside: boolean;
  today: boolean;
  selected: boolean;
  disabled: boolean;
  focusable: boolean;
}

const props = defineProps<{
  modelValue: string | null;
  min?: string;
  max?: string;
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Locked/view mode: stays focusable and shows its date, but can't be opened, cleared, or changed. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
  id?: string;
  ariaLabelledby?: string;
  /** Show a clear (×) button in the trigger when a date is set, so an optional date can be unset. Emits `''` via update:modelValue + change. Off by default. */
  clearable?: boolean;
  /** aria-label for the previous-month nav button. Default 'Previous month' — override for non-English UIs (month/weekday names already follow `locale`). */
  prevMonthLabel?: string;
  /** aria-label for the next-month nav button. Default 'Next month'. */
  nextMonthLabel?: string;
  /** aria-label for the clear button (when `clearable`). Default 'Clear date'. */
  clearLabel?: string;
  /** aria-label for the title button that drills to the month grid. Default 'Choose month'. */
  chooseMonthLabel?: string;
  /** aria-labels for the year arrows shown in the month grid. Defaults 'Previous year' / 'Next year'. */
  prevYearLabel?: string;
  nextYearLabel?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
}>();

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseISO(s: string | null | undefined): Date | null {
  if (s === null || s === undefined || s === '') return null;
  const parts: string[] = s.split('-');
  if (parts.length !== 3) return null;
  const y: number = Number(parts[0]);
  const m: number = Number(parts[1]);
  const day: number = Number(parts[2]);
  const d: Date = new Date(y, m - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function sameDay(a: Date | null, b: Date | null): boolean {
  return a !== null && b !== null && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number): Date {
  const x: Date = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number): Date {
  const x: Date = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

const baseId: string = useId();
const triggerId: ComputedRef<string> = computed((): string => props.id ?? `${baseId}-trigger`);
const titleId: string = `${baseId}-title`;

const rootEl: Ref<HTMLDivElement | null> = ref(null);
const triggerEl: Ref<HTMLButtonElement | null> = ref(null);
const panelEl: Ref<HTMLDivElement | null> = ref(null);
const dayRefs: Record<string, HTMLButtonElement | null> = {};

const open: Ref<boolean> = ref(false);

// Render the calendar panel in the top layer (popover) so it never gets clipped by a card or
// scroll container; positions against the trigger.
usePopover(panelEl, triggerEl, open);

const selectedDate: ComputedRef<Date | null> = computed((): Date | null => parseISO(props.modelValue));
const minDate: ComputedRef<Date | null> = computed((): Date | null => parseISO(props.min));
const maxDate: ComputedRef<Date | null> = computed((): Date | null => parseISO(props.max));
const isDisabled: ComputedRef<boolean> = computed((): boolean => props.disabled === true);
const isReadonly: ComputedRef<boolean> = computed((): boolean => props.readonly === true);
const isInvalid: ComputedRef<boolean> = computed((): boolean => props.invalid === true);
const displayPlaceholder: ComputedRef<string> = computed((): string => props.placeholder ?? 'Select date');
const showClear: ComputedRef<boolean> = computed(
  (): boolean => props.clearable === true && selectedDate.value !== null && isDisabled.value === false && isReadonly.value === false,
);
const prevMonthLabelText: ComputedRef<string> = computed((): string => props.prevMonthLabel ?? 'Previous month');
const nextMonthLabelText: ComputedRef<string> = computed((): string => props.nextMonthLabel ?? 'Next month');
const clearLabelText: ComputedRef<string> = computed((): string => props.clearLabel ?? 'Clear date');
const chooseMonthLabelText: ComputedRef<string> = computed((): string => props.chooseMonthLabel ?? 'Choose month');
const prevYearLabelText: ComputedRef<string> = computed((): string => props.prevYearLabel ?? 'Previous year');
const nextYearLabelText: ComputedRef<string> = computed((): string => props.nextYearLabel ?? 'Next year');

const view: Ref<Date> = ref(startOfMonth(selectedDate.value ?? new Date()));
const focusDate: Ref<Date> = ref(selectedDate.value ?? new Date());

// Keep the roving-tabindex cell inside the visible month so the grid stays keyboard-reachable
// after navigating with Home/End/PageUp/PageDown (mirrors freeday-datepicker.js's clamp).
const effectiveFocusDate: ComputedRef<Date> = computed((): Date => {
  const f: Date = focusDate.value;
  if (f.getMonth() === view.value.getMonth() && f.getFullYear() === view.value.getFullYear()) return f;
  const daysInMonth: number = new Date(view.value.getFullYear(), view.value.getMonth() + 1, 0).getDate();
  return new Date(view.value.getFullYear(), view.value.getMonth(), Math.min(f.getDate(), daysInMonth));
});

/* 'days' | 'months' — the calendar drills one level up instead of growing furniture beside the title.
   Before this the only pointer route to another month was one click per month: August 2026 to March
   2022 is fifty-three of them, and the Shift+PageUp jump had no affordance at all. */
const mode: Ref<'days' | 'months'> = ref('days');
const focusMonth: Ref<number> = ref(0);

const monthCellFmt: ComputedRef<Intl.DateTimeFormat> = computed(
  (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { month: 'short' }),
);
const monthNameFmt: ComputedRef<Intl.DateTimeFormat> = computed(
  (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { month: 'long', year: 'numeric' }),
);

interface MonthCell {
  index: number;
  label: string;
  ariaLabel: string;
  selected: boolean;
  today: boolean;
  disabled: boolean;
  focusable: boolean;
}

/** A month is only unreachable when the WHOLE month falls outside min/max. Checked against the
 *  bounds directly, not by testing both ends with isDayDisabled: a range that sits INSIDE one month
 *  disables both ends while the middle is perfectly selectable. */
function isMonthDisabled(year: number, month: number): boolean {
  const first: Date = new Date(year, month, 1);
  const last: Date = new Date(year, month + 1, 0);
  if (minDate.value !== null && startOfDay(last).getTime() < startOfDay(minDate.value).getTime()) return true;
  if (maxDate.value !== null && startOfDay(first).getTime() > startOfDay(maxDate.value).getTime()) return true;
  return false;
}

const monthCells: ComputedRef<MonthCell[]> = computed((): MonthCell[] => {
  const year: number = view.value.getFullYear();
  const today: Date = new Date();
  const sel: Date | null = selectedDate.value;
  return Array.from({ length: 12 }, (_unused: unknown, index: number): MonthCell => {
    const cellDate: Date = new Date(year, index, 1);
    return {
      index,
      label: monthCellFmt.value.format(cellDate),
      ariaLabel: monthNameFmt.value.format(cellDate),
      selected: sel !== null && sel.getFullYear() === year && sel.getMonth() === index,
      today: today.getFullYear() === year && today.getMonth() === index,
      disabled: isMonthDisabled(year, index),
      focusable: index === focusMonth.value,
    };
  });
});

const monthFmt: ComputedRef<Intl.DateTimeFormat> = computed(
  (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { month: 'long', year: 'numeric' }),
);
const valueFmt: ComputedRef<Intl.DateTimeFormat> = computed(
  (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { day: '2-digit', month: 'short', year: 'numeric' }),
);
const dayLabelFmt: ComputedRef<Intl.DateTimeFormat> = computed(
  (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
);
const dowFmt: ComputedRef<Intl.DateTimeFormat> = computed(
  (): Intl.DateTimeFormat => new Intl.DateTimeFormat(props.locale, { weekday: 'short' }),
);

const displayValue: ComputedRef<string> = computed((): string =>
  selectedDate.value !== null ? valueFmt.value.format(selectedDate.value) : displayPlaceholder.value,
);

const weekdayHeaders: ComputedRef<string[]> = computed((): string[] => {
  const monday: Date = new Date(2024, 0, 1); // a known Monday
  return Array.from({ length: 7 }, (_unused: unknown, i: number): string => dowFmt.value.format(addDays(monday, i)));
});

function isDayDisabled(d: Date): boolean {
  if (minDate.value !== null && startOfDay(d).getTime() < startOfDay(minDate.value).getTime()) return true;
  if (maxDate.value !== null && startOfDay(d).getTime() > startOfDay(maxDate.value).getTime()) return true;
  return false;
}

const gridCells: ComputedRef<DayCell[]> = computed((): DayCell[] => {
  const first: Date = new Date(view.value.getFullYear(), view.value.getMonth(), 1);
  const offset: number = (first.getDay() + 6) % 7; // Monday-first
  const startCell: Date = addDays(first, -offset);
  const today: Date = new Date();
  const focus: Date = effectiveFocusDate.value;
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d: Date = addDays(startCell, i);
    cells.push({
      date: d,
      iso: toISO(d),
      label: d.getDate(),
      ariaLabel: dayLabelFmt.value.format(d),
      outside: d.getMonth() !== view.value.getMonth(),
      today: sameDay(d, today),
      selected: sameDay(d, selectedDate.value),
      disabled: isDayDisabled(d),
      focusable: sameDay(d, focus),
    });
  }
  return cells;
});

function setDayRef(iso: string, el: Element | null): void {
  dayRefs[iso] = el as HTMLButtonElement | null;
}

function focusCell(): void {
  dayRefs[toISO(effectiveFocusDate.value)]?.focus();
}

function moveFocus(next: Date): void {
  focusDate.value = next;
  view.value = new Date(next.getFullYear(), next.getMonth(), 1);
  void nextTick((): void => focusCell());
}

function openMonthGrid(): void {
  focusMonth.value = view.value.getMonth();
  mode.value = 'months';
  void nextTick((): void => focusMonthCell());
}

function focusMonthCell(): void {
  const cell: HTMLElement | null = panelEl.value?.querySelector('.fdy-cal__month[tabindex="0"]') ?? null;
  cell?.focus();
}

/* Picking a month is NAVIGATION, not selection: it drops back to the day grid with the roving cell
   clamped into the new month, so nothing is committed until a day is chosen. */
function openMonth(index: number): void {
  const year: number = view.value.getFullYear();
  const daysInMonth: number = new Date(year, index + 1, 0).getDate();
  const day: number = Math.min(focusDate.value.getDate(), daysInMonth);
  view.value = new Date(year, index, 1);
  focusDate.value = new Date(year, index, day);
  mode.value = 'days';
  void nextTick((): void => focusCell());
}

function moveMonthFocus(index: number, yearDelta: number): void {
  if (yearDelta !== 0) view.value = addMonths(view.value, yearDelta * 12);
  focusMonth.value = (index + 12) % 12;
  void nextTick((): void => focusMonthCell());
}

function onMonthKeydown(e: KeyboardEvent): void {
  let handled: boolean = true;
  switch (e.key) {
    case 'ArrowLeft': moveMonthFocus(focusMonth.value - 1, 0); break;
    case 'ArrowRight': moveMonthFocus(focusMonth.value + 1, 0); break;
    case 'ArrowUp': moveMonthFocus(focusMonth.value - 3, 0); break;
    case 'ArrowDown': moveMonthFocus(focusMonth.value + 3, 0); break;
    case 'Home': moveMonthFocus(0, 0); break;
    case 'End': moveMonthFocus(11, 0); break;
    case 'PageUp': moveMonthFocus(focusMonth.value, -1); break;
    case 'PageDown': moveMonthFocus(focusMonth.value, 1); break;
    case 'Enter':
    case ' ': openMonth(focusMonth.value); break;
    case 'Escape': closePanel(true); break;
    default: handled = false;
  }
  if (handled) e.preventDefault();
}

function pick(d: Date): void {
  if (isDayDisabled(d)) return;
  const day: Date = startOfDay(d);
  focusDate.value = day;
  const iso: string = toISO(day);
  emit('update:modelValue', iso);
  emit('change', iso);
  closePanel(true);
}

// Clear (reset to empty). Emits '' — parseISO('') is null, so the placeholder shows again.
function clearValue(): void {
  emit('update:modelValue', '');
  emit('change', '');
  open.value = false;
  triggerEl.value?.focus();
}

function openPanel(): void {
  if (isDisabled.value || isReadonly.value || open.value) return;
  focusDate.value = selectedDate.value ?? focusDate.value ?? new Date();
  view.value = new Date(focusDate.value.getFullYear(), focusDate.value.getMonth(), 1);
  open.value = true;
  void nextTick((): void => focusCell());
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

function onGridKeydown(e: KeyboardEvent): void {
  const f: Date = effectiveFocusDate.value;
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      moveFocus(addDays(f, -1));
      break;
    case 'ArrowRight':
      e.preventDefault();
      moveFocus(addDays(f, 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      moveFocus(addDays(f, -7));
      break;
    case 'ArrowDown':
      e.preventDefault();
      moveFocus(addDays(f, 7));
      break;
    case 'Home':
      e.preventDefault();
      moveFocus(addDays(f, -((f.getDay() + 6) % 7)));
      break;
    case 'End':
      e.preventDefault();
      moveFocus(addDays(f, 6 - ((f.getDay() + 6) % 7)));
      break;
    case 'PageUp':
      e.preventDefault();
      moveFocus(addMonths(f, e.shiftKey ? -12 : -1));
      break;
    case 'PageDown':
      e.preventDefault();
      moveFocus(addMonths(f, e.shiftKey ? 12 : 1));
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      pick(f);
      break;
    case 'Escape':
      e.preventDefault();
      closePanel(true);
      break;
    default:
      break;
  }
}

// Close when a pointer lands outside the whole control.
function onDocPointerDown(e: MouseEvent): void {
  const target: EventTarget | null = e.target;
  if (rootEl.value !== null && target instanceof Node && !rootEl.value.contains(target)) {
    closePanel(false);
  }
}

// Close when focus leaves the control entirely (e.g. Shift+Tab off the trigger).
/* A null relatedTarget means focus fell to <body> — which is what happens when the element the
 * user just pressed is REMOVED by the click it triggered (drilling into the month grid replaces
 * the grid, and with it the cell that had focus). That is not focus leaving the control, and
 * closing on it made the panel vanish mid-navigation. A pointer that really lands outside is
 * handled by the mousedown listener, which is the reliable path for that case. */
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
  <div ref="rootEl" class="fdy-datepicker" :class="{ 'fdy-datepicker--error': isInvalid }" @focusout="onFocusout">
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
      <!-- ONE head for both modes on purpose: swapping it with v-if destroys the very button the user
           just pressed, focus falls to <body>, and the panel's own focusout handler closes it. The
           labels and handlers switch; the elements do not. -->
      <div class="fdy-cal__head">
        <button
          type="button"
          class="fdy-cal__nav"
          :aria-label="mode === 'months' ? prevYearLabelText : prevMonthLabelText"
          @click="mode === 'months' ? moveMonthFocus(focusMonth, -1) : (view = addMonths(view, -1))"
        >‹</button>
        <button
          :id="titleId"
          type="button"
          class="fdy-cal__title"
          :aria-label="mode === 'months' ? undefined : chooseMonthLabelText"
          @click="mode === 'months' ? (mode = 'days') : openMonthGrid()"
        >{{ mode === 'months' ? String(view.getFullYear()) : monthFmt.format(view) }}</button>
        <button
          type="button"
          class="fdy-cal__nav"
          :aria-label="mode === 'months' ? nextYearLabelText : nextMonthLabelText"
          @click="mode === 'months' ? moveMonthFocus(focusMonth, 1) : (view = addMonths(view, 1))"
        >›</button>
      </div>
      <div v-if="mode === 'months'" class="fdy-cal__grid fdy-cal__grid--months" role="grid" :aria-labelledby="titleId" @keydown="onMonthKeydown">
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
          @click="openMonth(cell.index)"
        >{{ cell.label }}</button>
      </div>
      <div v-else class="fdy-cal__grid" role="grid" :aria-labelledby="titleId" @keydown="onGridKeydown">
        <div v-for="w in weekdayHeaders" :key="w" class="fdy-cal__dow" role="columnheader" :aria-label="w">{{ w }}</div>
        <button
          v-for="cell in gridCells"
          :key="cell.iso"
          :ref="(el) => setDayRef(cell.iso, el as Element | null)"
          type="button"
          class="fdy-cal__day"
          :class="{ 'is-outside': cell.outside, 'is-today': cell.today, 'is-selected': cell.selected }"
          role="gridcell"
          :aria-label="cell.ariaLabel"
          :aria-selected="cell.selected ? 'true' : undefined"
          :disabled="cell.disabled"
          :tabindex="cell.focusable ? 0 : -1"
          @click="pick(cell.date)"
        >{{ cell.label }}</button>
      </div>
    </div>
  </div>
</template>
