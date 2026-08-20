// Mount the real FdyTable.vue with a control column that is NAMED but not LABELLED (#026):
// `labelHidden` must leave the text in the DOM for assistive tech while the cell reads as empty.
// Both header branches are present — a sortable column renders its label inside the sort button,
// a plain one does not — because the flag has to be spent in both.
import { createApp, h } from 'vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const COLUMNS = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'name', label: 'Name' },
  { key: 'act', label: 'Row actions', labelHidden: true },
  { key: 'act2', label: 'Sortable actions', labelHidden: true, sortable: true },
];
const ROWS = [{ code: 'C-1', name: 'Row 1' }];

createApp({
  render: () =>
    h(FdyTable, { columns: COLUMNS, rows: ROWS, rowKey: (r) => r.code, ariaLabel: 'Label hidden table' }),
}).mount('#app');
