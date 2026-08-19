<script lang="ts">
export interface CascadeNode {
  label: string;
  value: string;
  /** Present = branch (drills in); absent = leaf (selectable). */
  children?: ReadonlyArray<CascadeNode>;
}

// Depth-first search for the stack of nodes leading to a leaf value.
function pathTo(nodes: ReadonlyArray<CascadeNode>, value: string, trail: CascadeNode[]): CascadeNode[] | null {
  for (const node of nodes) {
    const here: CascadeNode[] = trail.concat([node]);
    if (node.children === undefined && node.value === value) return here;
    if (node.children !== undefined) {
      const found: CascadeNode[] | null = pathTo(node.children, value, here);
      if (found !== null) return found;
    }
  }
  return null;
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch, type ComputedRef, type Ref } from 'vue';
import { usePopover } from '../usePopover';

// A controlled Vue port of freeday's cascade select (src/freeday-cascade.js + cascade.css):
// a hierarchical drill-down picker showing one level at a time — branches drill in, a back
// control ascends, a leaf selects and the value is the leaf's value (the display is the full
// path). The enhancer's data model is a hidden nested <ul>; here it is a typed tree, which is
// what a framework app actually has. A real `v-model` in place of the DOM mutation.

const props = defineProps<{
  /** The selected LEAF value ('' = nothing selected). */
  modelValue: string;
  options: ReadonlyArray<CascadeNode>;
  /** Path separator in the display, default " / " (matches the enhancer). */
  separator?: string;
  /** aria-label for the button that goes up one level. Default 'Back one level'. */
  backLabel?: string;
  placeholder?: string;
  /** Accessible name for the trigger + listbox (the enhancer's data-label). */
  label?: string;
  id?: string;
  ariaLabelledby?: string;
  disabled?: boolean;
  /** Locked/view mode: stays focusable and shows its value, but can't be opened or changed. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  /** Fired when a leaf is picked; `labels` is the full path (root → leaf). */
  change: [value: string, labels: string[]];
}>();

const baseId: string = useId();
const triggerId: ComputedRef<string> = computed((): string => props.id ?? `${baseId}-trigger`);
const listId: string = `${baseId}-list`;
function optionId(index: number): string {
  return `${baseId}-opt-${index}`;
}

const rootEl: Ref<HTMLDivElement | null> = ref(null);
const triggerEl: Ref<HTMLButtonElement | null> = ref(null);
const panelEl: Ref<HTMLDivElement | null> = ref(null);
const listEl: Ref<HTMLUListElement | null> = ref(null);

const open: Ref<boolean> = ref(false);
const stack: Ref<CascadeNode[]> = ref([]) as Ref<CascadeNode[]>;
const active: Ref<number> = ref(-1);

usePopover(panelEl, triggerEl, open);

const sep: ComputedRef<string> = computed((): string => props.separator ?? ' / ');
const name: ComputedRef<string> = computed((): string => props.label ?? 'Select');
const isDisabled: ComputedRef<boolean> = computed((): boolean => props.disabled === true);
const isReadonly: ComputedRef<boolean> = computed((): boolean => props.readonly === true);
const isInvalid: ComputedRef<boolean> = computed((): boolean => props.invalid === true);

const current: ComputedRef<ReadonlyArray<CascadeNode>> = computed((): ReadonlyArray<CascadeNode> =>
  stack.value.length === 0 ? props.options : (stack.value[stack.value.length - 1].children ?? []),
);
const selectedTrail: ComputedRef<CascadeNode[] | null> = computed((): CascadeNode[] | null =>
  props.modelValue === '' ? null : pathTo(props.options, props.modelValue, []),
);
const isPlaceholder: ComputedRef<boolean> = computed((): boolean => selectedTrail.value === null);
const displayValue: ComputedRef<string> = computed((): string =>
  selectedTrail.value !== null
    ? selectedTrail.value.map((n: CascadeNode): string => n.label).join(sep.value)
    : (props.placeholder ?? 'Select…'),
);
const crumb: ComputedRef<string> = computed((): string =>
  stack.value.length > 0 ? stack.value.map((n: CascadeNode): string => n.label).join(sep.value) : name.value,
);
const activeDescendant: ComputedRef<string | undefined> = computed((): string | undefined =>
  active.value >= 0 ? optionId(active.value) : undefined,
);

function openPanel(): void {
  if (isDisabled.value || isReadonly.value) return;
  // Re-open at the selected leaf's level for quick re-selection (matches the enhancer).
  const trail: CascadeNode[] | null = selectedTrail.value;
  stack.value = trail !== null && trail.length > 1 ? trail.slice(0, -1) : [];
  active.value = 0;
  open.value = true;
}
function closePanel(returnFocus: boolean): void {
  open.value = false;
  active.value = -1;
  if (returnFocus) triggerEl.value?.focus();
}
function drill(index: number): void {
  const node: CascadeNode | undefined = current.value[index];
  if (node === undefined || node.children === undefined) return;
  stack.value = stack.value.concat([node]);
  active.value = 0;
}
function ascend(): void {
  if (stack.value.length === 0) return;
  stack.value = stack.value.slice(0, -1);
  active.value = 0;
}
function activate(index: number): void {
  const node: CascadeNode | undefined = current.value[index];
  if (node === undefined) return;
  if (node.children !== undefined) { drill(index); return; }
  const labels: string[] = stack.value.map((n: CascadeNode): string => n.label).concat([node.label]);
  emit('update:modelValue', node.value);
  emit('change', node.value, labels);
  closePanel(true);
}

function onListKeydown(e: KeyboardEvent): void {
  const len: number = current.value.length;
  switch (e.key) {
    case 'ArrowDown': e.preventDefault(); active.value = Math.min(len - 1, active.value + 1); break;
    case 'ArrowUp': e.preventDefault(); active.value = Math.max(0, active.value - 1); break;
    case 'Home': e.preventDefault(); active.value = 0; break;
    case 'End': e.preventDefault(); active.value = len - 1; break;
    case 'ArrowRight':
    case 'Enter':
    case ' ': e.preventDefault(); if (active.value >= 0) activate(active.value); break;
    case 'ArrowLeft':
    case 'Backspace': e.preventDefault(); ascend(); break;
    case 'Escape': e.preventDefault(); closePanel(true); break;
    case 'Tab': closePanel(false); break;
    default: break;
  }
}
function onTriggerKeydown(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(); }
}

// Move focus into the list when the panel opens (the enhancer does list.focus()).
watch(open, async (isOpen: boolean): Promise<void> => {
  if (!isOpen) return;
  await nextTick();
  listEl.value?.focus();
});

// Keep the active option in view.
watch([active, stack], async (): Promise<void> => {
  if (!open.value || active.value < 0) return;
  await nextTick();
  const items: NodeListOf<Element> | undefined = listEl.value?.querySelectorAll('[role="option"]');
  const el: Element | undefined = items?.[active.value];
  if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' });
});

// Close when a pointer lands outside the whole component.
function onDocPointerDown(e: MouseEvent): void {
  const target: EventTarget | null = e.target;
  if (rootEl.value !== null && target instanceof Node && !rootEl.value.contains(target)) closePanel(false);
}
onMounted((): void => {
  document.addEventListener('mousedown', onDocPointerDown);
});
onBeforeUnmount((): void => {
  document.removeEventListener('mousedown', onDocPointerDown);
});
</script>

<template>
  <div ref="rootEl" :class="isInvalid ? 'fdy-cascade fdy-cascade--error' : 'fdy-cascade'">
    <button
      :id="triggerId"
      ref="triggerEl"
      type="button"
      :class="open ? 'fdy-cascade__trigger is-open' : 'fdy-cascade__trigger'"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="ariaLabelledby === undefined ? name : undefined"
      :aria-labelledby="ariaLabelledby"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-readonly="isReadonly ? 'true' : undefined"
      :aria-describedby="describedby"
      :disabled="isDisabled"
      @click="open ? closePanel(true) : openPanel()"
      @keydown="onTriggerKeydown"
    >
      <span :class="isPlaceholder ? 'fdy-cascade__value fdy-cascade__value--placeholder' : 'fdy-cascade__value'">{{ displayValue }}</span>
    </button>

    <div ref="panelEl" class="fdy-cascade__panel" popover="manual" :hidden="!open">
      <div class="fdy-cascade__head">
        <button
          type="button"
          class="fdy-cascade__back"
          :aria-label="backLabel ?? 'Back one level'"
          :hidden="stack.length === 0"
          @click="ascend(); listEl?.focus()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <span class="fdy-cascade__crumb" aria-live="polite">{{ crumb }}</span>
      </div>
      <ul
        :id="listId"
        ref="listEl"
        class="fdy-cascade__list"
        role="listbox"
        :aria-label="name"
        tabindex="-1"
        :aria-activedescendant="activeDescendant"
        @keydown="onListKeydown"
      >
        <li
          v-for="(node, i) in current"
          :id="optionId(i)"
          :key="node.value"
          role="option"
          :class="i === active ? 'fdy-cascade__opt is-active' : 'fdy-cascade__opt'"
          :aria-selected="node.children === undefined && node.value === modelValue"
          :aria-label="node.children !== undefined ? `${node.label}, submenu` : undefined"
          @mousemove="active = i"
          @click="activate(i)"
        >
          <span class="fdy-cascade__opt-label">{{ node.label }}</span>
          <span v-if="node.children !== undefined" class="fdy-cascade__opt-arrow" aria-hidden="true" />
        </li>
      </ul>
    </div>
  </div>
</template>
