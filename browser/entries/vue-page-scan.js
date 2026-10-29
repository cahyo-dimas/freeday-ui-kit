// useFreeday() on the whole page, the scope CATATAN-FREEDAY §14 measured as thirty times slower.
// Holds a rota matrix shaped like keamanan-cluster's (38 rows x 4 shifts, two removable chips per
// cell), the kit's own FdyDrawer and FdyChart, and a subtree the app marks data-fdy-ignore.
import { createApp, h, ref, nextTick } from 'vue';
import { useFreeday, FdyDrawer, FdyChart } from '../../adapters/vue/index.js';

const ROWS = 38, SHIFTS = 4;
const tick = ref(0);
const drawerOpen = ref(false);
window.openDrawer = () => { drawerOpen.value = true; return true; };
let api = null;
window.__drawerClosed = 0;

const Page = {
  setup() {
    const root = ref(null);
    api = useFreeday(root);
    return () => h('div', { ref: root }, [
      h('table', {}, h('tbody', {}, Array.from({ length: ROWS }, (_, r) =>
        h('tr', { key: r }, Array.from({ length: SHIFTS }, (_, s) =>
          h('td', { key: s }, h('span', { class: 'fdy-chips', onFdyChipRemove: (e) => e.preventDefault() },
            [0, 1].map((c) => h('span', { class: 'fdy-chip', key: c }, [
              `P${r}-${s}-${c}-${tick.value % 2}`,
              h('button', { class: 'fdy-chip__remove', type: 'button', 'aria-label': 'Hapus' }, '×'),
            ]))))))))),
      h('div', { id: 'ignored', 'data-fdy-ignore': '' },
        h('span', { class: 'fdy-chip' }, ['Ani',
          h('button', { id: 'ignoredRm', class: 'fdy-chip__remove', type: 'button', 'aria-label': 'Hapus Ani' }, '×')])),
      h(FdyChart, { id: 'chart', type: 'bar', values: [3, 5, 2], labels: ['a', 'b', 'c'] }),
      h(FdyDrawer, { id: 'drawer', open: drawerOpen.value, title: 'Panel', dismissible: false,
        onClose: () => { window.__drawerClosed++; } }, () => h('p', {}, 'isi')),
    ]);
  },
};

createApp({ render: () => h(Page) }).mount('#app');

window.measure = async (n) => {
  const t0 = performance.now();
  for (let i = 0; i < n; i++) api.rehydrate();
  const perRehydrate = (performance.now() - t0) / n;
  const t1 = performance.now();
  for (let i = 0; i < n; i++) { tick.value++; await nextTick(); await nextTick(); }
  return { perRehydrate, perUpdate: (performance.now() - t1) / n,
           buttons: document.querySelectorAll('.fdy-chip__remove').length };
};
