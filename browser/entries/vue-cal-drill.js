// Mount the real FdyDatepicker.vue and expose the bound value, so the harness can drive the month
// drill with trusted clicks (note 004 §1: reaching March 2022 from August 2026 was 53 clicks).
import { createApp, h, ref } from 'vue';
import FdyDatepicker from '../../adapters/vue/components/FdyDatepicker.vue';

const value = ref('2026-08-14');
window.__val = value.value;

createApp({
  render: () =>
    h(FdyDatepicker, {
      modelValue: value.value,
      locale: 'en-GB',
      ariaLabelledby: 'lbl',
      'onUpdate:modelValue': (v) => { value.value = v; window.__val = v; },
    }),
}).mount('#app');
