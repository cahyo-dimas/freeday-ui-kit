// useFreeday(ref) with the ref bound, with the ref never bound, and with no argument at all.
// Each case mounts as its own app, so a warning can be pinned to the case that caused it.
import { createApp, h, ref } from 'vue';
import { useFreeday } from '../../adapters/vue/index.js';

const tick = ref(0);
window.bump = () => { tick.value++; return true; };

const chip = (id) => h('span', { class: 'fdy-chips' },
  h('span', { class: 'fdy-chip' }, [`Ani ${tick.value}`,
    h('button', { id, class: 'fdy-chip__remove', type: 'button', 'aria-label': 'Hapus Ani' }, '×')]));

const cases = {
  bound: { setup() { const root = ref(null); useFreeday(root); return () => h('section', { ref: root }, chip('rmBound')); } },
  forgotten: { setup() { const root = ref(null); useFreeday(root); return () => h('section', {}, chip('rmForgotten')); } },
  whole: { setup() { useFreeday(); return () => h('section', {}, chip('rmWhole')); } },
};

window.mountCase = (name) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  createApp(cases[name]).mount(host);
  return true;
};
