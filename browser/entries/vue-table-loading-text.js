// The loading row says what the app calls loading (butir 6 of 3.9.0). Two loading tables: the
// first carries `loadingText`, the second carries none and has to still read English, which is
// what keeps every already-shipped screen where it is.
import { createApp, h } from 'vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const rows = [{ id: 1, name: 'Row 1' }];
const columns = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];

createApp({
  render: () => [
    h('div', { id: 'given' }, [
      h(FdyTable, {
        rows,
        columns,
        rowKey: (r) => String(r.id),
        loading: true,
        loadingText: 'Memuat…',
      }),
    ]),
    h('div', { id: 'bare' }, [
      h(FdyTable, {
        rows,
        columns,
        rowKey: (r) => String(r.id),
        loading: true,
      }),
    ]),
  ],
}).mount('#app');
