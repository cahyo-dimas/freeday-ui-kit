// The footer's rows-per-page control (note 008). Two tables from one page state: server mode, where
// the pick must travel out through update:page, and client mode, where the table applies it itself.
import { createApp, h, ref } from 'vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const rows = Array.from({ length: 25 }, (_u, i) => ({ id: i + 1, name: 'Row ' + (i + 1) }));
const columns = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];
const page = ref({ index: 2, size: 5, total: 25 });

window.__page = () => JSON.stringify(page.value);

createApp({
  render: () => [
    h(FdyTable, {
      rows: rows.slice(10, 15),
      columns,
      page: page.value,
      pageSizes: [5, 10, 25],
      rowKey: (r) => String(r.id),
      'onUpdate:page': (next) => { page.value = next; },
    }),
    h(FdyTable, {
      rows,
      columns,
      pageSize: 5,
      pageSizes: [5, 10, 25],
      rowKey: (r) => String(r.id),
    }),
  ],
}).mount('#app');
