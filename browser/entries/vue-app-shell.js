// Mount the real FdyAppShell.vue and expose the same probe the vanilla fixture exposes, so
// browser/adapter.mjs can hold the typed wrapper to the behaviour the enhancer already passes.
// Left UNBOUND (`navOpen` not passed) on purpose: the component's own default — visible on a wide
// viewport, hidden on a narrow one — is the case an app cannot express as one initial value.
import { createApp, h } from 'vue';
import FdyAppShell from '../../adapters/vue/components/FdyAppShell.vue';

createApp({
  render: () =>
    h(FdyAppShell, { title: 'Invoices' }, {
      brand: () => h('a', { class: 'fdy-app__brand', href: '#', id: 'brand' }, 'Acme'),
      nav: () => h('nav', { class: 'fdy-nav' }, [
        h('a', { class: 'fdy-nav__item', href: '#one', id: 'nav-one' }, 'One'),
        h('a', { class: 'fdy-nav__item', href: '#two', id: 'nav-two' }, 'Two'),
      ]),
      default: () => h('button', { class: 'fdy-btn', id: 'in-content', type: 'button' }, 'Behind the backdrop'),
    }),
}).mount('#app');

window.state = () => {
  const app = document.querySelector('.fdy-app');
  const toggle = document.querySelector('.fdy-app__navtoggle');
  return {
    open: app.classList.contains('fdy-app--nav-open'),
    collapsed: app.classList.contains('fdy-app--nav-collapsed'),
    expanded: toggle.getAttribute('aria-expanded'),
    sidebarInert: document.querySelector('.fdy-app__sidebar').hasAttribute('inert'),
    contentInert: document.querySelector('.fdy-app__content').hasAttribute('inert'),
    focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  };
};
