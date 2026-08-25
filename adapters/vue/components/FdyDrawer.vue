<script setup lang="ts">
import { computed, onMounted, useId, watch, type ComputedRef, type Ref, ref } from 'vue';

// A controlled Vue wrapper over freeday's `.fdy-drawer` native <dialog> side panel
// (src/components/drawer.css). Same controlled contract and glue as FdyModal — showModal()/close()
// guarded, @cancel.prevent so Esc routes through app state, backdrop-click via `event.target ===
// dialogEl`, applied to a drawer that anchors left (default) or right. Native <dialog> supplies the
// focus trap, focus restore, top-layer stacking and inert background; `dismissible` (default true)
// gates Esc + backdrop dismissal.

// dismissible MUST go through withDefaults: Vue's boolean-cast gives an omitted Boolean prop
// `false`, not `undefined`, so a bare `props.dismissible !== false` would make an un-annotated
// drawer non-dismissible (no Esc, no backdrop, no close button), the opposite of the default.
const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  side?: 'left' | 'right';
  dismissible?: boolean;
}>(), { dismissible: true });

const emit = defineEmits<{
  close: [];
}>();

const dialogEl: Ref<HTMLDialogElement | null> = ref(null);
const titleId: string = `${useId()}-title`;
const dismissible: ComputedRef<boolean> = computed((): boolean => props.dismissible !== false);
const drawerClass: ComputedRef<string> = computed((): string =>
  props.side === 'right' ? 'fdy-drawer fdy-drawer--right' : 'fdy-drawer',
);

function sync(open: boolean): void {
  const el: HTMLDialogElement | null = dialogEl.value;
  if (el === null) return;
  if (open && !el.open) el.showModal();
  else if (!open && el.open) el.close();
}
watch((): boolean => props.open, sync, { flush: 'post' });
onMounted((): void => sync(props.open));

function onCancel(): void {
  if (dismissible.value) emit('close');
}
function onClick(e: MouseEvent): void {
  if (dismissible.value && e.target === dialogEl.value) emit('close');
}
</script>

<template>
  <dialog
    ref="dialogEl"
    :class="drawerClass"
    :aria-labelledby="titleId"
    @cancel.prevent="onCancel"
    @click="onClick"
  >
    <div class="fdy-drawer__header">
      <h3 :id="titleId" class="fdy-drawer__title">
        <slot name="title">{{ title }}</slot>
      </h3>
      <button v-if="dismissible" class="fdy-drawer__close" type="button" aria-label="Close" @click="$emit('close')">&times;</button>
    </div>

    <div class="fdy-drawer__body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="fdy-drawer__footer">
      <slot name="footer" />
    </div>
  </dialog>
</template>
