// Two keyed Vue lists in one sortable group. The app cancels fdy-sort-change and moves the row
// between its own arrays from detail.fromList/fromOrder and detail.toList/order: the DOM is Vue's,
// and across two parents Vue replaces the element, so focus can only follow by data-key.
import { createApp, h, ref } from 'vue';
import { useFreeday } from '../../adapters/vue/index.js';

const LABELS = { todo: 'To do', done: 'Done' };
const lanes = ref({
  todo: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Bravo' }],
  done: [{ id: 'c', name: 'Charlie' }],
});
window.vueLanes = () => Object.keys(lanes.value).map((k) => k + ':' + lanes.value[k].map((r) => r.id).join('')).join(' ');

createApp({
  setup() {
    const root = ref(null);
    useFreeday(root);
    const onMove = (e) => {
      e.preventDefault();
      const d = e.detail;
      const byId = new Map([...lanes.value.todo, ...lanes.value.done].map((r) => [r.id, r]));
      lanes.value = { ...lanes.value, [d.fromList]: d.fromOrder.map((k) => byId.get(k)), [d.toList]: d.order.map((k) => byId.get(k)) };
    };
    return () => h('div', { ref: root, id: 'vboard', onFdySortChange: onMove }, Object.keys(lanes.value).map((lane) =>
      h('ul', { key: lane, id: 'v' + lane, class: 'fdy-list fdy-sortable', 'data-fdy-sortable': 'vboard', 'data-key': lane, 'data-label': LABELS[lane] },
        lanes.value[lane].map((r) => h('li', { key: r.id, class: 'fdy-list__row', 'data-key': r.id, 'data-label': r.name }, [
          h('button', { class: 'fdy-sortable__handle', type: 'button', id: 'v' + r.id }, '≡'), ' ' + r.name,
        ])))));
  },
}).mount('#app');
