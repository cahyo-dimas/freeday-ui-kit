// Mount the real FdyDateRange.vue and record every change and every settle, so the harness can
// tell a half-picked range from a finished one (#063).
import { createApp, h, ref } from 'vue';
import FdyDateRange from '../../adapters/vue/components/FdyDateRange.vue';

const value = ref({ start: null, end: null });
window.__changes = [];
window.__settled = [];

createApp({
  render: () =>
    h(FdyDateRange, {
      modelValue: value.value,
      locale: 'en-GB',
      ariaLabel: 'Period',
      'onUpdate:modelValue': (v) => { value.value = v; },
      onChange: (v) => window.__changes.push(v),
      onSettled: (v) => window.__settled.push(v),
    }),
}).mount('#app');
