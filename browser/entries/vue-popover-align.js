// Two faults of the typed popover path on one page (browser/typed-popover.mjs reads both).
//
// The bar reproduces the shape #079 was reported from: a control parked against the page's right
// gutter, so its left edge moves whenever the viewport narrows. FdyCombo's listbox is
// `position:absolute; top:calc(100% + …)` until usePopover overwrites it, which is the condition
// the spec measures.
//
// The table is the case Part B is about: FdyTableFilter hangs a 200px panel off a funnel in a
// column header. The last column is right-aligned (an amount column, the usual one), so its funnel
// sits against the table's right edge and a left-aligned panel runs past the page.
import { createApp, h, ref } from 'vue';
import FdyCombo from '../../adapters/vue/components/FdyCombo.vue';
import FdyTable from '../../adapters/vue/components/FdyTable.vue';

const OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
];

const ROWS = [
  { id: 1, name: 'Alpha', city: 'Jakarta', amount: 1200 },
  { id: 2, name: 'Beta', city: 'Bandung', amount: 980 },
];

const COLUMNS = [
  { key: 'name', label: 'Name', filter: 'text' },
  { key: 'city', label: 'City' },
  { key: 'amount', label: 'Amount', align: 'right', filter: 'text' },
];

const status = ref('draft');

createApp({
  render: () => [
    h('div', { class: 'bar' }, [
      h('span', { id: 'lbl', class: 'bar__title' }, 'Orders'),
      h('div', { class: 'bar__combo' }, [
        h(FdyCombo, {
          modelValue: status.value,
          options: OPTIONS,
          ariaLabelledby: 'lbl',
          'onUpdate:modelValue': (v) => { status.value = v; },
        }),
      ]),
    ]),
    h('div', { class: 'page' }, [
      h(FdyTable, { rows: ROWS, columns: COLUMNS, rowKey: (r) => String(r.id), ariaLabel: 'Orders' }),
    ]),
  ],
}).mount('#app');
