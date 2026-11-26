// A parent calls useFreeday(root); a CHILD component renders a data-fdy-validate form behind its own
// state. The parent never re-renders when the child does, which is the shape of CATATAN-FREEDAY §29.
import { createApp, defineComponent, h, ref } from 'vue';
import { useFreeday } from '../../adapters/vue/useFreeday.js';

const Child = defineComponent({
  setup() {
    const show = ref(false);
    return () => h('div', [
      h('button', { id: 'show', type: 'button', onClick: () => { show.value = true; } }, 'Show'),
      show.value
        ? h('form', { id: 'form', 'data-fdy-validate': '', novalidate: '', onSubmit: (e) => e.preventDefault() }, [
          h('div', { class: 'fdy-field' }, [
            h('label', { for: 'name', class: 'fdy-label' }, 'Name'),
            h('input', { id: 'name', class: 'fdy-input', required: '' }),
          ]),
          h('button', { id: 'send', type: 'submit', class: 'fdy-btn' }, 'Send'),
        ])
        : null,
    ]);
  },
});

const Parent = defineComponent({
  setup() {
    const root = ref(null);
    useFreeday(root);
    return () => h('div', { ref: root }, [h(Child)]);
  },
});

createApp(Parent).mount('#app');
