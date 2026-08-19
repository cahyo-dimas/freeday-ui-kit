// Mount the real FdyCfl.vue with `multiple`, exposing the committed value on window.__val.
// Guards note 019: the enhancer has had data-fdy-cfl-multiple all along and the typed wrappers
// could only ever produce one row. Bundled to an IIFE by browser/harness.mjs.
import { createApp, h, ref } from 'vue';
import FdyCfl from '../../adapters/vue/components/FdyCfl.vue';

const ROWS = [
  { code: 'EX-1', name: 'Taxi' },
  { code: 'EX-2', name: 'Hotel' },
  { code: 'EX-3', name: 'Meals' },
];

const value = ref(null);
window.__val = null;

createApp({
  render: () =>
    h(FdyCfl, {
      modelValue: value.value,
      multiple: true,
      fetchPage: () => Promise.resolve({ rows: ROWS, hasMore: false }),
      columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }],
      display: (row) => row.code,
      rowKey: (row) => row.code,
      ariaLabelledby: 'lbl',
      'onUpdate:modelValue': (v) => {
        value.value = v;
        window.__val = v === null ? null : v.map((r) => r.code);
      },
    }),
}).mount('#app');
