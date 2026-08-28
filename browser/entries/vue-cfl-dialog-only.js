// Mount the real FdyCfl.vue with `dialogOnly`, opened from a trigger that is NOT the component's
// own field. Guards note #054: the enhancer has had [data-fdy-cfl-open] all along, and the typed
// wrappers were a field plus a dialog with no way in. Bundled to an IIFE by browser/harness.mjs.
import { createApp, h, ref } from 'vue';
import FdyCfl from '../../adapters/vue/components/FdyCfl.vue';

const ROWS = [
  { code: 'CC-1', name: 'Production' },
  { code: 'CC-2', name: 'Logistics' },
];

const value = ref(null);
const picker = ref(null);
const locked = ref(null);
window.__val = null;

const cfl = (extra) => ({
  modelValue: value.value,
  dialogOnly: true,
  fetchPage: () => Promise.resolve({ rows: ROWS, hasMore: false }),
  columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }],
  display: (row) => row.code,
  rowKey: (row) => row.code,
  'onUpdate:modelValue': (v) => {
    value.value = v;
    window.__val = v === null ? null : v.code;
  },
  ...extra,
});

createApp({
  render: () => [
    // A chip, not a field: 12px of text on a 420px panel is the case that made the note.
    h('button', { id: 'chip', class: 'fdy-chip', type: 'button', onClick: () => picker.value?.open() }, 'Cost centre'),
    /* Deliberately BETWEEN the two chips: a host that generated a box would be a flex item here,
       and the gap between the chips would measure twice what the fixture asks for. */
    h(FdyCfl, { ...cfl({}), ref: picker }),
    h('button', { id: 'chip-locked', class: 'fdy-chip', type: 'button', onClick: () => locked.value?.open() }, 'Locked'),
    h(FdyCfl, { ...cfl({ disabled: true }), ref: locked }),
  ],
}).mount('#app');
