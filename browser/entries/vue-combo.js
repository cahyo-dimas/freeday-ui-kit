// Mount the real FdyCombo.vue with a v-model, exposing the bound value on window.__val
// so the harness can assert a mouse-select actually updated it. Bundled to an IIFE by
// browser/harness.mjs (Vue runtime inlined).
import { createApp, h, ref } from 'vue';
import FdyCombo from '../../adapters/vue/components/FdyCombo.vue';

const OPTIONS = [
  { value: 'button', label: 'Button' },
  { value: 'badge', label: 'Badge' },
  { value: 'alert', label: 'Alert' },
];

const value = ref('button');
window.__val = 'button';

createApp({
  render: () =>
    h(FdyCombo, {
      modelValue: value.value,
      options: OPTIONS,
      ariaLabelledby: 'lbl',
      'onUpdate:modelValue': (v) => {
        value.value = v;
        window.__val = v;
      },
    }),
}).mount('#app');
