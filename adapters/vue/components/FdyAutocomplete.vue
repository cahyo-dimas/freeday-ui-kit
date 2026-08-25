<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch, type ComputedRef, type Ref } from 'vue';
import { usePopover } from '../usePopover';

// A controlled Vue port of freeday's autocomplete (src/freeday-autocomplete.js +
// autocomplete.css): a WAI-ARIA APG *editable* combobox, a text input filters a listbox of
// options as you type; picking one fills the input. A real `v-model` in place of the enhancer's
// DOM mutation, so Vue owns the input. Filtering mirrors the enhancer exactly (case-insensitive
// substring on the trimmed query); pass server-filtered `options` and it stays a no-op re-filter.
// `select` is emitted only on commit (the enhancer's fdy-autocomplete-select event).

const props = defineProps<{
  modelValue: string;
  options: ReadonlyArray<string>;
  emptyText?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  disabled?: boolean;
  /** Locked/view mode: the input is not editable and the list won't open, but it stays focusable and shows its value. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  select: [value: string];
}>();

const baseId: string = useId();
const inputId: ComputedRef<string> = computed((): string => props.id ?? `${baseId}-input`);
const listboxId: string = `${baseId}-listbox`;
function optionId(index: number): string {
  return `${baseId}-opt-${index}`;
}

const rootEl: Ref<HTMLDivElement | null> = ref(null);
const inputEl: Ref<HTMLInputElement | null> = ref(null);
const listboxEl: Ref<HTMLUListElement | null> = ref(null);
const open: Ref<boolean> = ref(false);
const active: Ref<number> = ref(-1);

// Render the listbox in the top layer so it escapes any ancestor overflow clip.
usePopover(listboxEl, inputEl, open);

const isDisabled: ComputedRef<boolean> = computed((): boolean => props.disabled === true);
const isReadonly: ComputedRef<boolean> = computed((): boolean => props.readonly === true);
const isInvalid: ComputedRef<boolean> = computed((): boolean => props.invalid === true);

const filtered: ComputedRef<string[]> = computed((): string[] => {
  const q: string = props.modelValue.trim().toLowerCase();
  return q === '' ? props.options.slice() : props.options.filter((o: string): boolean => o.toLowerCase().includes(q));
});

const activeDescendant: ComputedRef<string | undefined> = computed((): string | undefined =>
  open.value && active.value >= 0 && active.value < filtered.value.length ? optionId(active.value) : undefined,
);

function openList(): void {
  if (!isDisabled.value && !isReadonly.value) open.value = true;
}
function closeList(): void {
  open.value = false;
  active.value = -1;
}
function choose(label: string): void {
  emit('update:modelValue', label);
  emit('select', label);
  closeList();
  inputEl.value?.focus();
}
function onInput(e: Event): void {
  const target: HTMLInputElement = e.target as HTMLInputElement;
  emit('update:modelValue', target.value);
  active.value = -1;
  openList();
}

function onKeydown(e: KeyboardEvent): void {
  if (isDisabled.value || isReadonly.value) return;
  const len: number = filtered.value.length;
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (!open.value) { openList(); active.value = len > 0 ? 0 : -1; }
      else active.value = active.value + 1 < len ? active.value + 1 : 0;
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (!open.value) { openList(); active.value = len - 1; }
      else active.value = active.value - 1 >= 0 ? active.value - 1 : len - 1;
      break;
    case 'Enter':
      if (open.value && active.value >= 0 && active.value < len) { e.preventDefault(); choose(filtered.value[active.value]); }
      break;
    case 'Escape':
      if (open.value) { e.preventDefault(); closeList(); }
      break;
    case 'Tab':
      if (open.value) closeList();
      break;
    default:
      break;
  }
}

// Close when a pointer lands outside the whole component.
function onDocPointerDown(e: MouseEvent): void {
  const target: EventTarget | null = e.target;
  if (rootEl.value !== null && target instanceof Node && !rootEl.value.contains(target)) closeList();
}
onMounted((): void => {
  document.addEventListener('mousedown', onDocPointerDown);
});
onBeforeUnmount((): void => {
  document.removeEventListener('mousedown', onDocPointerDown);
});

// Keep the highlighted option in view.
watch(active, async (i: number): Promise<void> => {
  if (!open.value || i < 0) return;
  await nextTick();
  const items: NodeListOf<Element> | undefined = listboxEl.value?.querySelectorAll('[role="option"]');
  const el: Element | undefined = items?.[i];
  if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' });
});
</script>

<template>
  <div ref="rootEl" class="fdy-autocomplete" @keydown="onKeydown">
    <input
      :id="inputId"
      ref="inputEl"
      :class="isInvalid ? 'fdy-input fdy-input--error' : 'fdy-input'"
      type="text"
      role="combobox"
      :aria-expanded="open"
      aria-autocomplete="list"
      :aria-controls="listboxId"
      :aria-activedescendant="activeDescendant"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="describedby"
      autocomplete="off"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :readonly="isReadonly"
      :value="modelValue"
      @input="onInput"
      @focus="openList"
    >
    <ul
      :id="listboxId"
      ref="listboxEl"
      class="fdy-autocomplete__listbox"
      role="listbox"
      :aria-label="ariaLabel"
      popover="manual"
      :hidden="!open"
    >
      <li
        v-for="(opt, i) in filtered"
        :id="optionId(i)"
        :key="opt"
        :class="i === active ? 'fdy-autocomplete__option is-highlighted' : 'fdy-autocomplete__option'"
        role="option"
        :aria-selected="opt === modelValue"
        @mousedown.prevent
        @mousemove="active = i"
        @click="choose(opt)"
      >{{ opt }}</li>
      <li v-if="filtered.length === 0" class="fdy-autocomplete__empty">{{ emptyText ?? 'No results' }}</li>
    </ul>
  </div>
</template>
