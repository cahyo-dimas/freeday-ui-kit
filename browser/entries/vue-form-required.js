// A required FdyTimepicker inside a data-fdy-validate form. The point is the TYPED path: the
// `required` prop has to reach the root as `data-fdy-required`, and the wrapper's `data-value`
// mirror has to update reactively so the enhancer's MutationObserver sees it (#096).
//
// The form-level `data-fdy-text-required` is used rather than a per-control
// `data-fdy-msg-required`: an unknown attribute falls through to the root in Vue but NOT in
// React, so the form-level text is the one override that reads the same in every stack.
import { createApp, h, ref } from 'vue';
import FdyTimepicker from '../../adapters/vue/components/FdyTimepicker.vue';

const jam = ref('');
window.__valid = 0;
window.__invalid = 0;

createApp({
  render: () =>
    h('form', {
      id: 'form',
      'data-fdy-validate': '',
      'data-fdy-text-required': 'Wajib diisi.',
      onSubmit: (e) => e.preventDefault(),
    }, [
      h('div', { class: 'fdy-field' }, [
        h('span', { class: 'fdy-label' }, 'Jam mulai'),
        h(FdyTimepicker, {
          modelValue: jam.value,
          required: true,
          step: 30,
          min: '06:00',
          max: '08:00',
          ariaLabel: 'Jam mulai',
          'onUpdate:modelValue': (v) => { jam.value = v; },
        }),
      ]),
      h('button', { id: 'kirim', type: 'submit', class: 'fdy-btn' }, 'Simpan'),
    ]),
}).mount('#app');

const form = document.getElementById('form');
form.addEventListener('fdy-form-valid', () => { window.__valid += 1; });
form.addEventListener('fdy-form-invalid', () => { window.__invalid += 1; });
// Vue rendered this form AFTER the enhancer's DOMContentLoaded pass, which is the normal SPA case.
window.FreedayForm.initAll(document.getElementById('app'));
