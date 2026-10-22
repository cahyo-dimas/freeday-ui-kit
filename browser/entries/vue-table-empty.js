// FdyTable's empty slot is told whether the filters emptied it (#069). Controlled filters start
// on a value nothing matches; the slot's own Clear button must bring the rows back.
import { createApp, h, ref } from 'vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const filters = ref({ name: { type: 'text', text: 'zzz' } });
const rows = ref([{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }]);
window.__setRows = (r) => { rows.value = r; };

createApp({
  render: () =>
    h(FdyTable, {
      rows: rows.value,
      rowKey: (r) => r.id,
      columns: [{ key: 'name', label: 'Name', filter: 'text' }],
      filters: filters.value,
      'onUpdate:filters': (f) => { filters.value = f; },
    }, {
      empty: ({ filtered, clearFilters }) => filtered
        ? h('button', { id: 'clear', type: 'button', onClick: clearFilters }, 'Clear filters')
        : h('span', { id: 'nothing' }, 'Nothing here yet'),
    }),
}).mount('#app');
