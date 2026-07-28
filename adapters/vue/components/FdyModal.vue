<script setup lang="ts">
import { computed, onMounted, useId, watch, type ComputedRef, type Ref, ref } from 'vue';

// A controlled Vue wrapper over freeday's `.fdy-modal` native <dialog> (src/components/modal.css).
// The kit styles the dialog but nothing drives it; every consumer re-derives the same imperative
// glue to reconcile a reactive `open` boolean with a DOM element whose open/close is a method call.
// This writes that glue once: showModal()/close() guarded against the already-open/closed cases
// (showModal() on an open dialog throws), @cancel.prevent so Esc routes through app state instead of
// closing the DOM behind its back, and backdrop-click detection via `event.target === dialogEl`.
// Native <dialog> already provides the focus trap, focus restore, top-layer stacking and inert
// background — the wrapper only avoids breaking them. `dismissible` (default true) gates Esc + backdrop.

const props = defineProps<{
  open: boolean;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'wide';
  dismissible?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dialogEl: Ref<HTMLDialogElement | null> = ref(null);
const titleId: string = `${useId()}-title`;
const dismissible: ComputedRef<boolean> = computed((): boolean => props.dismissible !== false);
const modalClass: ComputedRef<string> = computed((): string =>
  props.size !== undefined ? `fdy-modal fdy-modal--${props.size}` : 'fdy-modal',
);

// Reconcile the reactive `open` with the dialog's method-driven state. Both guards matter:
// showModal() on an already-open dialog throws; close() on a closed one is a no-op but kept symmetric.
function sync(open: boolean): void {
  const el: HTMLDialogElement | null = dialogEl.value;
  if (el === null) return;
  if (open && !el.open) el.showModal();
  else if (!open && el.open) el.close();
}
watch((): boolean => props.open, sync, { flush: 'post' });
onMounted((): void => sync(props.open));

// Esc fires `cancel`; .prevent stops the native close so app state stays the single source of truth.
function onCancel(): void {
  if (dismissible.value) emit('close');
}
// The ::backdrop is not a separate element — a click whose target is the dialog box itself (not its
// content) is a backdrop click.
function onClick(e: MouseEvent): void {
  if (dismissible.value && e.target === dialogEl.value) emit('close');
}
</script>

<template>
  <dialog
    ref="dialogEl"
    :class="modalClass"
    :aria-labelledby="titleId"
    @cancel.prevent="onCancel"
    @click="onClick"
  >
    <div class="fdy-modal__header">
      <h3 :id="titleId" class="fdy-modal__title">
        <slot name="title">{{ title }}</slot>
      </h3>
      <button v-if="dismissible" class="fdy-modal__close" type="button" aria-label="Close" @click="$emit('close')">&times;</button>
    </div>

    <div class="fdy-modal__body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="fdy-modal__footer">
      <slot name="footer" />
    </div>
  </dialog>
</template>
