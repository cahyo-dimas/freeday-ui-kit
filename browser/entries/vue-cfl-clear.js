// Mount the real FdyCfl.vue with a value already picked and `clearable`, exposing the bound value on
// window.__val. Guards the asymmetry note 001 §3 found: modelValue accepts `Row | null`, but before
// this the component could only ever emit a Row — so an optional foreign key could be set and never
// unset. Bundled to an IIFE by browser/harness.mjs.
import { createApp, h, ref } from 'vue';
import FdyCfl from '../../adapters/vue/components/FdyCfl.vue';

const ROWS = [
  { code: 'WF-1', name: 'Standard approval' },
  { code: 'WF-2', name: 'Fast track' },
];

const value = ref(ROWS[0]);
window.__val = 'WF-1';

createApp({
  render: () =>
    h(FdyCfl, {
      modelValue: value.value,
      clearable: true,
      fetchPage: () => Promise.resolve({ rows: ROWS, hasMore: false }),
      columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }],
      display: (row) => row.code,
      rowKey: (row) => row.code,
      ariaLabelledby: 'lbl',
      'onUpdate:modelValue': (v) => {
        value.value = v;
        window.__val = v === null ? null : v.code;
      },
    }),
}).mount('#app');
