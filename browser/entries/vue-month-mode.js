// Mount two real FdyDatepicker.vue instances: one in month mode, one with no mode at all. No
// `locale` is passed to either, so the month names the harness reads can only have come from the
// page's <html lang>, which is the claim note 008 §8 is about.
import { createApp, h, ref } from 'vue';
import FdyDatepicker from '../../adapters/vue/components/FdyDatepicker.vue';

const month = ref('2026-10');
const day = ref('2026-10-21');
window.__month = month.value;
window.__day = day.value;

createApp({
  render: () => [
    h('div', { id: 'mp' }, [
      h(FdyDatepicker, {
        modelValue: month.value,
        mode: 'month',
        ariaLabelledby: 'lbl-month',
        'onUpdate:modelValue': (v) => { month.value = v; window.__month = v; },
      }),
    ]),
    h('div', { id: 'dp' }, [
      h(FdyDatepicker, {
        modelValue: day.value,
        ariaLabelledby: 'lbl-day',
        'onUpdate:modelValue': (v) => { day.value = v; window.__day = v; },
      }),
    ]),
  ],
}).mount('#app');
