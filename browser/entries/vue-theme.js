// Two toggles and one region with its own data-theme, all through useTheme(). The fixture loads
// this entry WITHOUT dist/freeday.js, so it also proves the composable brings its own core.
import { createApp, h, ref } from 'vue';
import { useTheme } from '../../adapters/vue/index.js';

const Toggle = {
  props: { id: { type: String, required: true } },
  setup(props) {
    const t = useTheme();
    return () => h('button', { id: props.id, type: 'button', onClick: t.toggleTheme }, `${t.theme.value}/${t.resolved.value}`);
  },
};
const Region = {
  setup() {
    const root = ref(null);
    const t = useTheme(root);
    return () => h('section', { ref: root, id: 'region', 'data-theme': 'dark' }, t.resolved.value);
  },
};

const showRegion = ref(true);
window.hideRegion = () => { window.regionEl = document.getElementById('region'); showRegion.value = false; return true; };

createApp({
  setup() {
    return () => h('div', [h(Toggle, { id: 'a' }), h(Toggle, { id: 'b' }), showRegion.value ? h(Region) : null]);
  },
}).mount('#app');
window.mounted = true;
