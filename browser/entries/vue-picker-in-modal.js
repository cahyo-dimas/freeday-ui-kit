// A required FdyTimepicker and an FdyDatepicker inside an OPEN FdyModal, at phone width.
//
// The risk this exists for: FdyModal is a native <dialog> opened with showModal(), so it lives in
// the top layer, and the pickers' panels are `popover="manual"`, which also goes to the top layer.
// A panel painted BEHIND the dialog is not a cosmetic bug — the control becomes unusable, which is
// the exact class of fault keamanan-cluster kept hitting on a real phone. `browser/over-dialog.mjs`
// covers a toast and a checkbox over a modal; no picker had ever been checked there (#096).
import { createApp, h, ref } from 'vue';
import FdyModal from '../../adapters/vue/components/FdyModal.vue';
import FdyTimepicker from '../../adapters/vue/components/FdyTimepicker.vue';
import FdyDatepicker from '../../adapters/vue/components/FdyDatepicker.vue';

const jam = ref('');
const tanggal = ref('');
window.__valid = 0;
window.__invalid = 0;

createApp({
  render: () =>
    h(FdyModal, { open: true, title: 'Tambah shift', size: 'sm', closeLabel: 'Tutup' }, {
      default: () => [
        h('form', {
          id: 'form',
          'data-fdy-validate': '',
          'data-fdy-text-required': 'Wajib diisi.',
          onSubmit: (e) => e.preventDefault(),
        }, [
          h('div', { class: 'fdy-field fdy-field--full' }, [
            h('span', { class: 'fdy-label', id: 'jam-label' }, 'Mulai'),
            h(FdyTimepicker, {
              modelValue: jam.value,
              required: true,
              step: 15,
              ariaLabelledby: 'jam-label',
              'onUpdate:modelValue': (v) => { jam.value = v; },
            }),
          ]),
          h('div', { class: 'fdy-field fdy-field--full' }, [
            h('span', { class: 'fdy-label', id: 'tgl-label' }, 'Berlaku dari'),
            h(FdyDatepicker, {
              modelValue: tanggal.value,
              ariaLabelledby: 'tgl-label',
              'onUpdate:modelValue': (v) => { tanggal.value = v; },
            }),
          ]),
          h('button', { id: 'kirim', type: 'submit', class: 'fdy-btn' }, 'Simpan'),
        ]),
      ],
    }),
}).mount('#app');

const tunggu = () => {
  const form = document.getElementById('form');
  if (form === null) { requestAnimationFrame(tunggu); return; }
  form.addEventListener('fdy-form-valid', () => { window.__valid += 1; });
  form.addEventListener('fdy-form-invalid', () => { window.__invalid += 1; });
  window.FreedayForm.initAll(document.getElementById('app'));
};
tunggu();
