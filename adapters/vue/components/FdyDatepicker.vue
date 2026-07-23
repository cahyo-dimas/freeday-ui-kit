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
  invalid?: boolean;
  describedby?: string;
  id?: string;
  ariaLabelledby?: string;
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
const isInvalid: ComputedRef<boolean> = computed((): boolean => props.invalid === true);
const displayPlaceholder: ComputedRef<string> = computed((): string => props.placeholder ?? 'Pilih tanggal');

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

function pick(d: Date): void {
  if (isDayDisabled(d)) return;
  const day: Date = startOfDay(d);
  focusDate.value = day;
  const iso: string = toISO(day);
  emit('update:modelValue', iso);
  emit('change', iso);
  closePanel(true);
}

function openPanel(): void {
  if (isDisabled.value || open.value) return;
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
function onFocusout(e: FocusEvent): void {
  const next: EventTarget | null = e.relatedTarget;
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
      :aria-describedby="describedby"
      :disabled="isDisabled"
      @click="toggle"
    >
      <span class="fdy-datepicker__value" :class="{ 'fdy-datepicker__value--placeholder': selectedDate === null }">{{ displayValue }}</span>
      <span class="fdy-datepicker__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"></rect>
          <path d="M16 2v4M8 2v4M3 10h18"></path>
        </svg>
      </span>
    </button>

    <div ref="panelEl" class="fdy-datepicker__panel" role="dialog" aria-modal="false" popover="manual" :aria-labelledby="titleId" :hidden="!open">
      <div class="fdy-cal__head">
        <button type="button" class="fdy-cal__nav" aria-label="Bulan sebelumnya" @click="view = addMonths(view, -1)">‹</button>
        <div :id="titleId" class="fdy-cal__title">{{ monthFmt.format(view) }}</div>
        <button type="button" class="fdy-cal__nav" aria-label="Bulan berikutnya" @click="view = addMonths(view, 1)">›</button>
      </div>
      <div class="fdy-cal__grid" role="grid" :aria-labelledby="titleId" @keydown="onGridKeydown">
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
