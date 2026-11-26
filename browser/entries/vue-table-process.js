// A server-paged FdyTable whose parent keeps the processed rows in state, with `columns` and `page`
// written inline in the render function: new objects every parent render, as a template literal is.
import { createApp, h, ref } from 'vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const ROWS = [{ code: 'A' }, { code: 'B' }, { code: 'C' }];
window.__processCalls = 0;
const cards = ref([]);

createApp({
  render: () => h('div', [
    h(FdyTable, {
      rows: ROWS,
      columns: [{ key: 'code', label: 'Code' }],
      rowKey: (r) => r.code,
      page: { index: 0, size: 10, total: 3 },
      onProcess: (r) => { window.__processCalls += 1; cards.value = r.rows; },
    }),
    h('p', { id: 'cards' }, String(cards.value.length)),
  ]),
}).mount('#app');
