// The table hands the footer its strings (butir 1 of 3.9.0). Two tables over one page state: the
// first carries all six footer strings, the second carries none and has to still read English,
// which is what keeps every already-shipped screen where it is.
import { createApp, h, ref } from 'vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const rows = Array.from({ length: 25 }, (_u, i) => ({ id: i + 1, name: 'Row ' + (i + 1) }));
const columns = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];
const page = ref({ index: 2, size: 5, total: 25 });

createApp({
  render: () => [
    h('div', { id: 'given' }, [
      h(FdyTable, {
        rows: rows.slice(10, 15),
        columns,
        page: page.value,
        pageSizes: [5, 10, 25],
        rowKey: (r) => String(r.id),
        // `{total}` twice on purpose: the substitution replaces every occurrence, as textOf() does.
        infoText: 'Menampilkan {from}-{to} dari {total} ({total})',
        pageSizeLabel: 'Baris',
        paginationLabel: 'Paginasi',
        prevLabel: 'Halaman sebelumnya',
        nextLabel: 'Halaman berikutnya',
        pageLabel: 'Ke halaman {n}',
        'onUpdate:page': (next) => { page.value = next; },
      }),
    ]),
    h('div', { id: 'bare' }, [
      h(FdyTable, {
        rows: rows.slice(10, 15),
        columns,
        page: page.value,
        pageSizes: [5, 10, 25],
        rowKey: (r) => String(r.id),
      }),
    ]),
  ],
}).mount('#app');
