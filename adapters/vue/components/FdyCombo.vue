<script setup lang="ts" generic="T extends string">
import { computed, onBeforeUnmount, onMounted, ref, useId, type ComputedRef, type Ref } from 'vue';
import { usePopover } from '../usePopover';

// A Vue-native binding over freeday's `.fdy-combo` classes. freeday ships the styled
// listbox (combo.css) plus a framework-agnostic enhancer (freeday-select.js) whose own
// header says: "In a Vue app you would bind your own state instead." Letting that enhancer
// own the DOM would fight Vue's rendering, so this component re-implements the WAI-ARIA
// APG "select-only combobox" interaction in Vue, giving a real `v-model` and a themed
// popup that replaces the native <select> whose open list is an unthemeable OS menu.
// Generic over the value type so a union like RangePreset binds through v-model unchanged.

interface ComboOption {
  value: T;
  label: string;
}

const props = defineProps<{
  modelValue: T;
  options: ReadonlyArray<ComboOption>;
  id?: string;
  ariaLabelledby?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedby?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: T];
  change: [value: T];
}>();

const baseId: string = useId();
const buttonId: ComputedRef<string> = computed((): string => props.id ?? `${baseId}-btn`);
const listboxId: string = `${baseId}-listbox`;
function optionId(index: number): string {
  return `${baseId}-opt-${index}`;
}

const rootEl: Ref<HTMLDivElement | null> = ref(null);
const buttonEl: Ref<HTMLButtonElement | null> = ref(null);
const listboxEl: Ref<HTMLUListElement | null> = ref(null);
const open: Ref<boolean> = ref(false);

// Render the listbox in the top layer (popover) so it escapes any ancestor overflow clip
// (a .fdy-card, a scroll container) and positions against the button.
usePopover(listboxEl, buttonEl, open);
const highlighted: Ref<number> = ref(-1);

const selectedIndex: ComputedRef<number> = computed((): number =>
  props.options.findIndex((o: ComboOption): boolean => o.value === props.modelValue),
);
const selectedLabel: ComputedRef<string> = computed((): string => {
  const opt: ComboOption | undefined = props.options[selectedIndex.value];
  return opt !== undefined ? opt.label : (props.placeholder ?? '');
});
const isPlaceholder: ComputedRef<boolean> = computed((): boolean => selectedIndex.value < 0);
const isDisabled: ComputedRef<boolean> = computed((): boolean => props.disabled === true);
const isInvalid: ComputedRef<boolean> = computed((): boolean => props.invalid === true);
const activeDescendant: ComputedRef<string | undefined> = computed((): string | undefined =>
  open.value && highlighted.value >= 0 ? optionId(highlighted.value) : undefined,
);

function setHighlight(index: number): void {
  const len: number = props.options.length;
  highlighted.value = len === 0 ? -1 : ((index % len) + len) % len;
}

function openList(): void {
  if (isDisabled.value || open.value) return;
  open.value = true;
  setHighlight(selectedIndex.value >= 0 ? selectedIndex.value : 0);
}

function closeList(focusButton: boolean): void {
  if (!open.value) return;
  open.value = false;
  highlighted.value = -1;
  if (focusButton) buttonEl.value?.focus();
}

function toggle(): void {
  if (open.value) closeList(false);
  else openList();
}

function choose(index: number): void {
  const opt: ComboOption | undefined = props.options[index];
  if (opt === undefined) return;
  if (opt.value !== props.modelValue) {
    emit('update:modelValue', opt.value);
    emit('change', opt.value);
  }
  closeList(true);
}

// Type-to-select: buffer keystrokes for 500ms and jump to the first matching label.
let typed: string = '';
let typedTimer: ReturnType<typeof setTimeout> | null = null;
function typeahead(char: string): void {
  typed += char.toLowerCase();
  if (typedTimer !== null) clearTimeout(typedTimer);
  typedTimer = setTimeout((): void => {
    typed = '';
  }, 500);
  const match: number = props.options.findIndex((o: ComboOption): boolean =>
    o.label.toLowerCase().startsWith(typed),
  );
  if (match >= 0) {
    if (!open.value) openList();
    setHighlight(match);
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (isDisabled.value) return;
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
        setHighlight(props.options.length - 1);
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
      if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        typeahead(e.key);
      }
  }
}

// Close when a pointer lands outside the whole combo.
function onDocPointerDown(e: MouseEvent): void {
  const target: EventTarget | null = e.target;
  if (rootEl.value !== null && target instanceof Node && !rootEl.value.contains(target)) {
    closeList(false);
  }
}

// Close when focus leaves the combo entirely (e.g. Shift+Tab off the button).
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
  if (typedTimer !== null) clearTimeout(typedTimer);
});
</script>

<template>
  <div
    ref="rootEl"
    class="fdy-combo"
    :class="{ 'fdy-combo--error': isInvalid }"
    :data-value="modelValue"
    @keydown="onKeydown"
    @focusout="onFocusout"
  >
    <button
      :id="buttonId"
      ref="buttonEl"
      type="button"
      class="fdy-combo__button"
      :class="{ 'is-open': open }"
      role="combobox"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      :aria-expanded="open"
      :aria-activedescendant="activeDescendant"
      :aria-labelledby="ariaLabelledby"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="describedby"
      :disabled="isDisabled"
      @click="toggle"
    >
      <span class="fdy-combo__value" :class="{ 'fdy-combo__value--placeholder': isPlaceholder }">{{ selectedLabel }}</span>
    </button>
    <ul :id="listboxId" ref="listboxEl" class="fdy-combo__listbox" role="listbox" popover="manual" :hidden="!open">
      <li
        v-for="(opt, i) in options"
        :id="optionId(i)"
        :key="opt.value"
        class="fdy-combo__option"
        :class="{ 'is-highlighted': i === highlighted }"
        role="option"
        :aria-selected="opt.value === modelValue"
        @click="choose(i)"
        @mousemove="setHighlight(i)"
      >
        <span class="fdy-combo__check">{{ opt.value === modelValue ? '✓' : '' }}</span>{{ opt.label }}
      </li>
    </ul>
  </div>
</template>
