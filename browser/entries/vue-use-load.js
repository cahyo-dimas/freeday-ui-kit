// A screen built on useLoad: the filter changes from the test, the view renders from state.status.
import { createApp, defineComponent, h, ref, watch, onMounted } from 'vue';
import { useLoad } from '../../adapters/vue/useLoad.js';
import { controlledLoad } from './load-fetch.js';

const Screen = defineComponent({
  setup() {
    const filter = ref('a');
    const { state, load } = useLoad((signal) => controlledLoad(filter.value, signal));
    window.__setFilter = (v) => { filter.value = v; };
    onMounted(load);
    watch(filter, load);
    return () => {
      const s = state.value;
      if (s.status === 'loading') return h('p', { id: 'view' }, 'loading');
      if (s.status === 'error') return h('p', { id: 'view' }, `error, previous: ${s.previous}`);
      if (s.status === 'ready') return h('p', { id: 'view' }, s.data);
      return h('p', { id: 'view' }, 'idle');
    };
  },
});
createApp(Screen).mount('#app');
