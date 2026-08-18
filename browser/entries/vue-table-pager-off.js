// Server mode + pager={false}: the app owns the page AND the control. Before this the table drew its
// own footer regardless, so a responsive list that renders one pager for both breakpoints showed two.
import { createApp, h, ref } from 'vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const rows = Array.from({ length: 7 }, (_u, i) => ({ id: i + 1, name: 'Row ' + (i + 1) }));
const columns = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];
const page = ref({ index: 0, size: 3, total: 7 });

createApp({
  render: () => [
    h(FdyTable, { rows: rows.slice(0, 3), columns, page: page.value, pager: false, rowKey: (r) => String(r.id) }),
    h(FdyTable, { rows: rows.slice(0, 3), columns, page: page.value, rowKey: (r) => String(r.id) }),
  ],
}).mount('#app');
