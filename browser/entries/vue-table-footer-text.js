// The footer's strings, given by the app (butir 2). Two footers over one page state: the first
// carries all six props, the second carries none and has to still read English, which is what keeps
// every already-shipped screen where it is.
import { createApp, h, ref } from 'vue';
import FdyTableFooter from '../../adapters/vue/components/FdyTableFooter.vue';

const page = ref({ index: 2, size: 5, total: 25 });

createApp({
  render: () => [
    h('div', { id: 'given' }, [
      h(FdyTableFooter, {
        page: page.value,
        pageSizes: [5, 10, 25],
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
      h(FdyTableFooter, { page: page.value, pageSizes: [5, 10, 25] }),
    ]),
  ],
}).mount('#app');
