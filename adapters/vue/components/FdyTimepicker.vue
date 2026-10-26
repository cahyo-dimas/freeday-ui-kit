<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, type ComputedRef, type Ref } from 'vue';
import { usePopover } from '../usePopover';

// A Vue-native binding over freeday's `.fdy-timepicker` classes (src/components/timepicker.css).
// The kit also ships a framework-agnostic enhancer (freeday-timepicker.js), but letting it own the
// DOM would fight Vue's rendering and leave no `v-model` — the same reason FdyCombo re-implements
// the listbox rather than wrapping freeday-select.js. Charts delegate to their renderer; form
// controls do not.
//
// `<input type="time">` is what this replaces, and the reason is not theming alone: the native
// picker is drawn by the OPERATING SYSTEM, so iOS shows a scroll wheel, Android a clock dial and
// desktop a stepper, each with its own width and value format, and no CSS reaches any of them. A
// phone and a browser at the same width therefore disagree about a screen that is otherwise
// identical. Raised from keamanan-cluster, whose shift form was audited on an iPhone 7 (#094).
//
// Deliberate difference from the enhancer: focus stays on the TRIGGER with `aria-activedescendant`
// on it, which is what FdyCombo, FdyDatepicker and FdyAutocomplete do, rather than moving focus
// into the panel as the raw path does. Both are valid APG listbox patterns; one family, one model.

const props = defineProps<{
  /** `HH:MM`, 24-hour. `''`/`null` for empty. A loose `H:MM` is normalised for matching. */
  modelValue: string | null;
  /** Minutes between options. Default 30. */
  step?: number;
  /** `HH:MM` bounds, inclusive. Default `00:00` to `23:59`. */
  min?: string;
  max?: string;
  id?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  /** Shown when there is no value. Default `--:--`, the same as the raw path. */
  placeholder?: string;
  disabled?: boolean;
  /** Locked/view mode: stays focusable and shows its time, but can't be opened or changed. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
}>();

const SHAPE: RegExp = /^\d{1,2}:\d{2}$/;

function toMinutes(time: string): number {
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function fromMinutes(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
/** `7:0` is not a time; `7:00` is the same time as `07:00`. Anything else answers `''`. */
function normalise(time: string | null): string {
  if (time === null || !SHAPE.test(time)) return '';
  const total: number = toMinutes(time);
  return total >= 0 && total <= 23 * 60 + 59 ? fromMinutes(total) : '';
}
function bound(time: string | undefined, fallback: number): number {
  return time !== undefined && SHAPE.test(time) ? toMinutes(time) : fallback;
}

const baseId: string = useId();
const triggerId: ComputedRef<string> = computed((): string => props.id ?? `${baseId}-trigger`);
const panelId: string = `${baseId}-panel`;
function optionId(index: number): string {
  return `${baseId}-opt-${index}`;
}

const rootEl: Ref<HTMLDivElement | null> = ref(null);
const triggerEl: Ref<HTMLButtonElement | null> = ref(null);
const panelEl: Ref<HTMLUListElement | null> = ref(null);
const open: Ref<boolean> = ref(false);

// Lift the panel into the top layer so it escapes an ancestor overflow clip. A shift form is a
// modal, and a time list long enough to scroll is exactly the panel a card would cut off.
usePopover(panelEl, triggerEl, open);
const highlighted: Ref<number> = ref(-1);

const times: ComputedRef<ReadonlyArray<string>> = computed((): ReadonlyArray<string> => {
  const stride: number = Math.max(1, Math.trunc(props.step ?? 30));
  const from: number = bound(props.min, 0);
  const to: number = bound(props.max, 23 * 60 + 59);
  const out: string[] = [];
  for (let m = from; m <= to; m += stride) out.push(fromMinutes(m));
  return out;
});

const value: ComputedRef<string> = computed((): string => normalise(props.modelValue));
const selectedIndex: ComputedRef<number> = computed((): number => times.value.indexOf(value.value));
const shown: ComputedRef<string> = computed((): string =>
  value.value !== '' ? value.value : (props.placeholder ?? '--:--'),
);
const isPlaceholder: ComputedRef<boolean> = computed((): boolean => value.value === '');
const isDisabled: ComputedRef<boolean> = computed((): boolean => props.disabled === true);
const isReadonly: ComputedRef<boolean> = computed((): boolean => props.readonly === true);
const isInvalid: ComputedRef<boolean> = computed((): boolean => props.invalid === true);
const activeDescendant: ComputedRef<string | undefined> = computed((): string | undefined =>
  open.value && highlighted.value >= 0 ? optionId(highlighted.value) : undefined,
);

/* The panel is `max-height:15rem` and scrolls: a highlight the reader cannot see is no highlight,
   and with 48 half-hour options most of the list is out of view. */
function revealHighlight(): void {
  void nextTick((): void => {
    const list: HTMLUListElement | null = panelEl.value;
    if (list === null || highlighted.value < 0) return;
    const opt: Element | undefined = list.children[highlighted.value];
    if (opt instanceof HTMLElement) opt.scrollIntoView({ block: 'nearest' });
  });
}

/* Clamped, not cyclic: FdyCombo wraps because its lists are short and a wrap is a quick way back
   to the top. Here ArrowUp at 00:00 landing on 23:30 reads as a glitch. Matches the raw path. */
function setHighlight(index: number): void {
  const last: number = times.value.length - 1;
  highlighted.value = last < 0 ? -1 : Math.min(last, Math.max(0, index));
  revealHighlight();
}

function openList(): void {
  if (isDisabled.value || isReadonly.value || open.value) return;
  open.value = true;
  setHighlight(selectedIndex.value >= 0 ? selectedIndex.value : 0);
}

function closeList(focusTrigger: boolean): void {
  if (!open.value) return;
  open.value = false;
  highlighted.value = -1;
  if (focusTrigger) triggerEl.value?.focus();
}

function toggle(): void {
  if (open.value) closeList(false);
  else openList();
}

function choose(index: number): void {
  const next: string | undefined = times.value[index];
  if (next === undefined) return;
  if (next !== value.value) {
    emit('update:modelValue', next);
    emit('change', next);
  }
  closeList(true);
}

function onKeydown(e: KeyboardEvent): void {
  if (isDisabled.value || isReadonly.value) return;
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (open.value) setHighlight(highlighted.value + 1);
      else openList();
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (open.value) setHighlight(highlighted.value - 1);
      else openList();
      break;
    case 'Home':
      if (open.value) {
        e.preventDefault();
        setHighlight(0);
      }
      break;
    case 'End':
      if (open.value) {
        e.preventDefault();
        setHighlight(times.value.length - 1);
      }
      break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (open.value && highlighted.value >= 0) choose(highlighted.value);
      else openList();
      break;
    case 'Escape':
      if (open.value) {
        e.preventDefault();
        closeList(true);
      }
      break;
    case 'Tab':
      if (open.value) closeList(false);
      break;
    default:
      break;
  }
}

function onDocPointerDown(e: MouseEvent): void {
  const target: EventTarget | null = e.target;
  if (rootEl.value !== null && target instanceof Node && !rootEl.value.contains(target)) {
    closeList(false);
  }
}

function onFocusout(e: FocusEvent): void {
  const next: EventTarget | null = e.relatedTarget;
  if (rootEl.value !== null && !(next instanceof Node && rootEl.value.contains(next))) {
    closeList(false);
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
  <div
    ref="rootEl"
    class="fdy-timepicker"
    :class="{ 'fdy-timepicker--error': isInvalid }"
    :data-value="value"
    @keydown="onKeydown"
    @focusout="onFocusout"
  >
    <button
      :id="triggerId"
      ref="triggerEl"
      type="button"
      class="fdy-timepicker__trigger"
      :class="{ 'is-open': open }"
      aria-haspopup="listbox"
      :aria-controls="panelId"
      :aria-expanded="open"
      :aria-activedescendant="activeDescendant"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-readonly="isReadonly ? 'true' : undefined"
      :aria-describedby="describedby"
      :disabled="isDisabled"
      @click="toggle"
    >
      <span class="fdy-timepicker__value" :class="{ 'fdy-timepicker__value--placeholder': isPlaceholder }">{{ shown }}</span>
      <span class="fdy-timepicker__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v5l3 2"></path>
        </svg>
      </span>
    </button>
    <ul :id="panelId" ref="panelEl" class="fdy-timepicker__panel" role="listbox"
        :aria-label="ariaLabel" popover="manual" :hidden="!open">
      <!-- @mousedown.prevent keeps focus on the trigger: an <li> isn't focusable, so a plain
           mousedown moves focus out of the control, fires @focusout and closes the panel before
           the click lands — mouse-select would silently do nothing. Same as FdyCombo. -->
      <li
        v-for="(t, i) in times"
        :id="optionId(i)"
        :key="t"
        class="fdy-timepicker__opt"
        :class="{ 'is-active': i === highlighted }"
        role="option"
        :aria-selected="t === value"
        @mousedown.prevent
        @click="choose(i)"
        @mousemove="setHighlight(i)"
      >{{ t }}</li>
    </ul>
  </div>
</template>
