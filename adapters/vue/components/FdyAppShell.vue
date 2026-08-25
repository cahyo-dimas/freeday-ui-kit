<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue';
import {
  NAV_QUERY,
  applyShellState,
  focusPanel,
  restoreFocus,
  trapTab,
} from '../../core/app-shell.js';

// A Vue wrapper over freeday's `.fdy-app` shell (src/components/app-shell.css) that ships the
// behaviour the CSS cannot: Escape, backdrop, focus into the panel and back, `inert`, and a Tab
// trap. The DOM work lives in adapters/core/app-shell.js so this component, its React twin and the
// Blazor bridge cannot drift into three different focus traps.
//
// ONE model: `navOpen` means "the nav is visible to the reader". The two state classes are the
// kit's business — above the nav breakpoint a hidden nav is `--nav-collapsed`, below it a visible
// nav is `--nav-open`, so an app never reasons about the viewport to answer a question about its
// own UI.
//
// Leave `navOpen` unbound and the component keeps its own: visible on a wide viewport, hidden on a
// narrow one, which is the right default and one an app cannot express in a single initial value.
// Bind it (`v-model:navOpen`) when the app wants to drive it — a menu item, a persisted preference.

const props = withDefaults(defineProps<{
  navOpen?: boolean;
  title?: string;
  toggleLabel?: string;
}>(), { navOpen: undefined, title: '', toggleLabel: 'Toggle navigation' });

const emit = defineEmits<{
  'update:navOpen': [boolean];
}>();

const root: Ref<HTMLElement | null> = ref(null);
const overlay: Ref<boolean> = ref(false);
const uncontrolled: Ref<boolean> = ref(true);
const restoreTo: Ref<Element | null> = ref(null);
let media: MediaQueryList | null = null;
/* Set while a viewport change is driving the state, so the watcher below reconciles `inert` and the
   classes but leaves FOCUS alone: a resize is not a reader asking to go somewhere. */
let fromResize: boolean = false;

const navVisible: ComputedRef<boolean> = computed((): boolean =>
  props.navOpen === undefined ? uncontrolled.value : props.navOpen,
);

const shellClass: ComputedRef<string> = computed((): string => {
  if (overlay.value) return navVisible.value ? 'fdy-app fdy-app--nav-open' : 'fdy-app';
  return navVisible.value ? 'fdy-app' : 'fdy-app fdy-app--nav-collapsed';
});

function setVisible(next: boolean): void {
  uncontrolled.value = next;
  emit('update:navOpen', next);
}

/* Focus is moved AFTER the class change has been rendered, or the panel is still off-canvas and
   the browser refuses to focus what it cannot lay out. */
watch([navVisible, overlay], ([visible, isOverlay]: [boolean, boolean]): void => {
  const el: HTMLElement | null = root.value;
  if (el === null) return;
  applyShellState(el, { navVisible: visible, overlay: isOverlay });
  if (fromResize) {
    fromResize = false;
    return;
  }
  if (!isOverlay) return;
  if (visible) restoreTo.value = focusPanel(el);
  else restoreFocus(el, restoreTo.value);
}, { flush: 'post' });

function onToggle(): void {
  setVisible(!navVisible.value);
}

function onBackdrop(): void {
  if (overlay.value && navVisible.value) setVisible(false);
}

/* Following a link in an overlay nav means "take me there" — the panel must not stay over the page
   it was just asked for. On a wide viewport the nav is a column and clicking it changes nothing. */
function onSidebarClick(e: MouseEvent): void {
  if (!overlay.value || !navVisible.value) return;
  const target: HTMLElement | null = e.target as HTMLElement | null;
  if (target !== null && target.closest('.fdy-nav__item') !== null) setVisible(false);
}

function onKeydown(e: KeyboardEvent): void {
  const el: HTMLElement | null = root.value;
  if (el === null || !overlay.value || !navVisible.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    setVisible(false);
    return;
  }
  trapTab(el, e);
}

/* Both directions matter, and they are not symmetrical.
   Narrowing with the nav visible would drop an overlay panel over a page nobody asked to leave, so
   the nav is hidden. Widening is harmless — a visible nav simply becomes the column again, and the
   watcher clears the `inert` the overlay had put on the content. */
function onMediaChange(): void {
  const nowOverlay: boolean = media !== null && !media.matches;
  if (nowOverlay === overlay.value) return;
  fromResize = true;
  overlay.value = nowOverlay;
  if (nowOverlay && navVisible.value) setVisible(false);
}

onMounted((): void => {
  media = window.matchMedia(NAV_QUERY);
  overlay.value = !media.matches;
  uncontrolled.value = media.matches;
  media.addEventListener('change', onMediaChange);
  document.addEventListener('keydown', onKeydown);
  const el: HTMLElement | null = root.value;
  if (el !== null) applyShellState(el, { navVisible: navVisible.value, overlay: overlay.value });
});

onBeforeUnmount((): void => {
  if (media !== null) media.removeEventListener('change', onMediaChange);
  document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div ref="root" :class="shellClass">
    <slot name="skip" />

    <aside class="fdy-app__sidebar" @click="onSidebarClick">
      <slot name="brand" />
      <slot name="nav" />
    </aside>

    <div class="fdy-app__content">
      <header class="fdy-app__topbar">
        <button
          class="fdy-app__navtoggle"
          type="button"
          :aria-label="toggleLabel"
          @click="onToggle"
        ><slot name="toggle-icon">&#9776;</slot></button>

        <h1 class="fdy-app__title">
          <slot name="title">{{ title }}</slot>
        </h1>

        <slot name="topbar" />
      </header>

      <main class="fdy-app__main">
        <slot />
      </main>
    </div>

    <div class="fdy-app__backdrop" @click="onBackdrop" />
  </div>
</template>
