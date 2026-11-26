// Mount the real FdyCfl.vue over a fetchPage the TEST resolves, one call at a time, so a spec can
// order responses on purpose. Each row is named after the query and page that produced it.
import { createApp, h, ref } from 'vue';
import FdyCfl from '../../adapters/vue/components/FdyCfl.vue';
import { controlledFetch } from './cfl-async-fetch.js';

const value = ref(null);
createApp({
  render: () =>
    h(FdyCfl, {
      modelValue: value.value,
      fetchPage: controlledFetch,
      columns: [{ key: 'name', label: 'Name' }],
      display: (row) => row.name,
      rowKey: (row) => row.name,
      ariaLabelledby: 'lbl',
      'onUpdate:modelValue': (v) => { value.value = v; },
    }),
}).mount('#app');
