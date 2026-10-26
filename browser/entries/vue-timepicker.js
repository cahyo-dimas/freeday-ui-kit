// Mount the real FdyTimepicker.vue and record every change, so the harness can assert what the
// binding received and not merely what the trigger shows (#094).
import { createApp, h, ref } from 'vue';
import FdyTimepicker from '../../adapters/vue/components/FdyTimepicker.vue';

const value = ref('');
window.__changes = [];

createApp({
  render: () => [
    // Bounded and stepped, so the option count is a fact the test can compute: 06:00..08:00 every
    // 15 minutes is nine options, and an off-by-one in the generator shows up as eight or ten.
    h('div', { id: 'bounded' }, [
      h(FdyTimepicker, {
        modelValue: value.value,
        step: 15,
        min: '06:00',
        max: '08:00',
        ariaLabel: 'Jam mulai',
        'onUpdate:modelValue': (v) => { value.value = v; },
        onChange: (v) => window.__changes.push(v),
      }),
    ]),
    // Locked: focusable and showing its time, but the list must not open.
    h('div', { id: 'locked' }, [
      h(FdyTimepicker, { modelValue: '07:30', readonly: true, ariaLabel: 'Terkunci' }),
    ]),
  ],
}).mount('#app');
