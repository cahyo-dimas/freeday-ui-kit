// Mount the real FdyTable.vue with CONTROLLED selection over a paged, row-activatable table.
// Four behaviours only a real browser can prove: the row checkbox must not activate the row it sits
// in, select-all must tick the visible page rather than the whole set, keys picked on a page you
// leave must survive, and the header box must go `indeterminate` (a DOM property, invisible to
// markup assertions) when only some of the page is ticked.
import { createApp, h, ref } from 'vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const COLUMNS = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
];
const ROWS = Array.from({ length: 4 }, (_, i) => ({ code: `C-${i + 1}`, name: `Row ${i + 1}` }));

const selectedKeys = ref([]);
window.__selected = [];
// Stays null unless a row activation fires — which, with a checkbox click, is the bug.
window.__activated = null;

createApp({
  render: () =>
    h(FdyTable, {
      columns: COLUMNS,
      rows: ROWS,
      rowKey: (r) => r.code,
      pageSize: 2,
      selectable: true,
      selectedKeys: selectedKeys.value,
      rowActivatable: true,
      ariaLabel: 'Selectable table',
      'onUpdate:selectedKeys': (keys) => {
        selectedKeys.value = keys;
        window.__selected = keys.slice();
      },
      onRowActivate: (row) => {
        window.__activated = row.code;
      },
    }),
}).mount('#app');
