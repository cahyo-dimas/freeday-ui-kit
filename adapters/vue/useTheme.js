/* Freeday. Vue 3 theme preference (CATATAN-FREEDAY §23). A thin view over window.FreedayTheme,
 * which this file loads itself, so it needs no `import 'freeday'` first and a page still has one
 * preference if the root import is there too (the core registers once).
 *
 * Usage:
 *   const { theme, resolved, setTheme, toggleTheme } = useTheme();
 *   // <button @click="toggleTheme" :aria-label="resolved === 'dark' ? 'Light theme' : 'Dark theme'">
 *
 * Pass a template ref to also put the preference on that element, for a region whose markup fixes
 * its own data-theme. Every instance stays in step through the core's fdy-theme-change event.
 */
import { onBeforeUnmount, onMounted, readonly, ref } from 'vue';
import '../../dist/freeday-theme.js';

function core() {
  return typeof window === 'undefined' ? null : window.FreedayTheme;
}

export function useTheme(rootRef) {
  var api = core();
  var theme = ref(api ? api.get() : 'system');
  var resolved = ref(api ? api.resolved() : 'light');
  var detach = null;

  function sync(e) {
    theme.value = e.detail.theme;
    resolved.value = e.detail.resolved;
  }

  onMounted(function () {
    if (rootRef && rootRef.value) detach = api.attach(rootRef.value);
    theme.value = api.get();
    resolved.value = api.resolved();
    document.addEventListener('fdy-theme-change', sync);
  });
  onBeforeUnmount(function () {
    document.removeEventListener('fdy-theme-change', sync);
    if (detach) detach();
  });

  return {
    theme: readonly(theme),
    resolved: readonly(resolved),
    setTheme: function (next) { core().set(next); },
    toggleTheme: function () { core().toggle(); }
  };
}
