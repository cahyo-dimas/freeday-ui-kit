// Mount FdyMonthpicker next to the `mode="month"` FdyDatepicker it replaces, twice: once plain and
// once bounded. No `locale` is passed to any of them, so the month names the harness reads can only
// have come from the page's <html lang>.
import { createApp, h, ref } from 'vue';
import FdyMonthpicker from '../../adapters/vue/components/FdyMonthpicker.vue';
import FdyDatepicker from '../../adapters/vue/components/FdyDatepicker.vue';

const month = ref('2026-10');
const dep = ref('2026-10');
const bound = ref('2026-10');
const depBound = ref('2026-10');
window.__month = month.value;
window.__dep = dep.value;
window.__bound = bound.value;
window.__depBound = depBound.value;

createApp({
  render: () => [
    h('div', { id: 'mp' }, [
      h(FdyMonthpicker, {
        modelValue: month.value,
        ariaLabelledby: 'lbl-month',
        'onUpdate:modelValue': (v) => { month.value = v; window.__month = v; },
      }),
    ]),
    h('div', { id: 'dep' }, [
      h(FdyDatepicker, {
        modelValue: dep.value,
        mode: 'month',
        ariaLabelledby: 'lbl-dep',
        'onUpdate:modelValue': (v) => { dep.value = v; window.__dep = v; },
      }),
    ]),
    h('div', { id: 'mp-bound' }, [
      h(FdyMonthpicker, {
        modelValue: bound.value,
        min: '2026-03',
        max: '2026-10',
        ariaLabelledby: 'lbl-month',
        'onUpdate:modelValue': (v) => { bound.value = v; window.__bound = v; },
      }),
    ]),
    h('div', { id: 'dep-bound' }, [
      h(FdyDatepicker, {
        modelValue: depBound.value,
        mode: 'month',
        min: '2026-03',
        max: '2026-10',
        ariaLabelledby: 'lbl-dep',
        'onUpdate:modelValue': (v) => { depBound.value = v; window.__depBound = v; },
      }),
    ]),
  ],
}).mount('#app');
