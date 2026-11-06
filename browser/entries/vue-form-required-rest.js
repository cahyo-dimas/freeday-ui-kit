// FdyAutocomplete, FdyCfl and FdyDateRange, all required, inside a data-fdy-validate form (#114).
// The point is the TYPED path: each `required` prop has to reach the element its mechanism reads
// (the autocomplete's input, the cfl's group, both range ends), and the mirrors have to follow the
// framework's state rather than a value captured once.
import { createApp, h, ref } from 'vue';
import FdyAutocomplete from '../../adapters/vue/components/FdyAutocomplete.vue';
import FdyCfl from '../../adapters/vue/components/FdyCfl.vue';
import FdyDateRange from '../../adapters/vue/components/FdyDateRange.vue';

const satuan = ref('');
const pelanggan = ref(null);
const periode = ref({ start: null, end: null });
const required = ref(true);
const ROWS = [{ code: 'C-1001' }];

window.counts = { valid: 0, invalid: 0 };
window.lastInvalid = 0;
window.fill = () => {
  satuan.value = 'pcs';
  pelanggan.value = ROWS[0];
  periode.value = { start: '2026-11-02', end: '2026-11-09' };
};
window.setRequired = (next) => { required.value = next; };

createApp({
  render: () =>
    h('form', { id: 'form', 'data-fdy-validate': '', onSubmit: (e) => e.preventDefault() }, [
      h('div', { class: 'fdy-field' }, [
        h('label', { class: 'fdy-label', for: 'ac' }, 'Satuan'),
        h(FdyAutocomplete, {
          id: 'ac', modelValue: satuan.value, options: ['pcs', 'galon'], required: required.value,
          'onUpdate:modelValue': (v) => { satuan.value = v; },
        }),
      ]),
      h('div', { class: 'fdy-field' }, [
        h('span', { class: 'fdy-label', id: 'cust-l' }, 'Pelanggan'),
        h(FdyCfl, {
          modelValue: pelanggan.value, required: required.value, ariaLabelledby: 'cust-l',
          fetchPage: () => Promise.resolve({ rows: ROWS, hasMore: false }),
          columns: [{ key: 'code', label: 'Kode' }],
          display: (r) => r.code, rowKey: (r) => r.code,
          'onUpdate:modelValue': (v) => { pelanggan.value = v; },
        }),
      ]),
      h('div', { class: 'fdy-field' }, [
        h('span', { class: 'fdy-label' }, 'Periode'),
        h(FdyDateRange, {
          modelValue: periode.value, required: required.value, ariaLabel: 'Periode',
          'onUpdate:modelValue': (v) => { periode.value = v; },
        }),
      ]),
      h('button', { id: 'kirim', type: 'submit', class: 'fdy-btn' }, 'Simpan'),
    ]),
}).mount('#app');

const form = document.getElementById('form');
form.addEventListener('fdy-form-valid', () => { window.counts.valid += 1; });
form.addEventListener('fdy-form-invalid', (e) => { window.counts.invalid += 1; window.lastInvalid = e.detail.invalid.length; });
window.FreedayForm.initAll(document.getElementById('app'));
window.mounted = true;
