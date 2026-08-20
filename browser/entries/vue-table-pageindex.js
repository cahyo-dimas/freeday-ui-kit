// Mount the real FdyTable.vue in CLIENT mode with a CONTROLLED pageIndex, driven by a pager that
// lives OUTSIDE the table — the shape a responsive screen needs (table above md, card list below,
// one pager for both). Exposes the parent-held index + the rows the table processed, so the harness
// can assert the round-trip really happens instead of trusting the prop plumbing.
import { createApp, h, ref } from 'vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const COLUMNS = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'name', label: 'Name', filter: 'text' },
];
const ROWS = Array.from({ length: 7 }, (_, i) => ({ code: `C-${i + 1}`, name: `Row ${i + 1}` }));

const pageIndex = ref(0);
window.__pageIndex = 0;
window.__processed = [];

createApp({
  render: () =>
    h('div', [
      h(FdyTable, {
        columns: COLUMNS,
        rows: ROWS,
        rowKey: (r) => r.code,
        pageSize: 2,
        pageIndex: pageIndex.value,
        ariaLabel: 'Controlled table',
        'onUpdate:pageIndex': (i) => {
          pageIndex.value = i;
          window.__pageIndex = i;
        },
        onProcess: ({ rows }) => {
          window.__processed = rows.map((r) => r.code);
        },
      }),
      // The external pager: nothing but a button that moves the parent's index.
      h(
        'button',
        {
          id: 'ext-next',
          class: 'fdy-btn',
          onClick: () => {
            pageIndex.value = pageIndex.value + 1;
            window.__pageIndex = pageIndex.value;
          },
        },
        'Next (outside the table)',
      ),
    ]),
}).mount('#app');
