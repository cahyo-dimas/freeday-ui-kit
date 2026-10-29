// A keyed Vue list that cancels fdy-sort-change and reorders its own state, the shape every
// framework consumer has to use: the DOM is Vue's, so the kit must not be the one moving it.
import { createApp, h, ref } from 'vue';
import { useFreeday } from '../../adapters/vue/index.js';

const rows = ref([{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Bravo' }, { id: 'c', name: 'Charlie' }]);
window.vueOrder = () => rows.value.map((r) => r.id).join('');

createApp({
  setup() {
    const list = ref(null);
    useFreeday(list);
    return () => h('ul', {
      ref: list, id: 'vlist', class: 'fdy-list fdy-sortable', 'data-fdy-sortable': '',
      onFdySortChange: (e) => {
        e.preventDefault();
        const byId = new Map(rows.value.map((r) => [r.id, r]));
        rows.value = e.detail.order.map((k) => byId.get(k));
      },
    }, rows.value.map((r) => h('li', { key: r.id, class: 'fdy-list__row', 'data-key': r.id, 'data-label': r.name }, [
      h('button', { class: 'fdy-sortable__handle', type: 'button', id: 'v' + r.id }, '≡'), ' ' + r.name,
    ])));
  },
}).mount('#app');
