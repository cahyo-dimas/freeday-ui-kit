// A FdyModal the user may not dismiss (dismissible=false), opened from app state. window.__appOpen
// mirrors that state, so a spec can compare it with what the <dialog> itself reports.
import { createApp, h, ref } from 'vue';
import FdyModal from '../../adapters/vue/components/FdyModal.vue';

const open = ref(false);
window.__appOpen = false;
window.__show = () => { open.value = true; window.__appOpen = true; };

createApp({
  render: () => h('div', [
    h(FdyModal, {
      open: open.value,
      title: 'Saving',
      dismissible: false,
      onClose: () => { open.value = false; window.__appOpen = false; },
    }, { default: () => h('p', 'Working on it') }),
  ]),
}).mount('#app');
