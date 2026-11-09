// A seeded FdyAutocomplete carrying attributes it declares no prop for (#115): they belong on the
// <input>, except class and style, which size the control and stay on the root.
import { createApp, h, ref } from 'vue';
import FdyAutocomplete from '../../adapters/vue/components/FdyAutocomplete.vue';

const satuan = ref('buah');
window.blurs = 0;
window.setValue = (v) => { satuan.value = v; };
window.isOpen = () => document.getElementById('ac').getAttribute('aria-expanded') === 'true';
window.shownOptions = () => [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim());
window.emptyShown = () => document.querySelector('.fdy-autocomplete__empty') !== null;

createApp({
  render: () =>
    h('form', { id: 'form', 'data-fdy-validate': '', onSubmit: (e) => e.preventDefault() }, [
      h('div', { class: 'fdy-field' }, [
        h('label', { class: 'fdy-label', for: 'ac' }, 'Satuan'),
        h(FdyAutocomplete, {
          id: 'ac', modelValue: satuan.value, options: ['buah', 'galon', 'pcs'], required: true,
          class: 'sizer', style: { width: '200px' },
          maxlength: 20, inputmode: 'text', name: 'satuan', type: 'number', role: 'textbox',
          'data-fdy-msg-required': 'Satuan wajib diisi.',
          onBlur: () => { window.blurs += 1; },
          'onUpdate:modelValue': (v) => { satuan.value = v; },
        }),
      ]),
      h('button', { id: 'kirim', type: 'submit', class: 'fdy-btn' }, 'Simpan'),
    ]),
}).mount('#app');
window.FreedayForm.initAll(document.getElementById('app'));
window.mounted = true;
