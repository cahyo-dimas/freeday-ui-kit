// Mount the real FdyAppShell.tsx and expose the same probe the vanilla and Vue fixtures expose, so
// adapter.mjs can hold all three to one contract. Left UNCONTROLLED on purpose: the component's own
// default — a column on a wide viewport, hidden on a narrow one — is the case an app cannot express
// as a single initial value.
import { createRoot } from 'react-dom/client';
import { FdyAppShell } from '../../adapters/react/components/FdyAppShell';

createRoot(document.getElementById('app')!).render(
  <FdyAppShell
    title="Invoices"
    brand={<a className="fdy-app__brand" href="#" id="brand">Acme</a>}
    nav={
      <nav className="fdy-nav">
        <a className="fdy-nav__item" href="#one" id="nav-one">One</a>
        <a className="fdy-nav__item" href="#two" id="nav-two">Two</a>
      </nav>
    }
  >
    <button className="fdy-btn" id="in-content" type="button">Behind the backdrop</button>
  </FdyAppShell>,
);

(window as unknown as Record<string, unknown>).state = (): unknown => {
  const app = document.querySelector('.fdy-app') as HTMLElement;
  const toggle = document.querySelector('.fdy-app__navtoggle') as HTMLElement;
  return {
    open: app.classList.contains('fdy-app--nav-open'),
    collapsed: app.classList.contains('fdy-app--nav-collapsed'),
    expanded: toggle.getAttribute('aria-expanded'),
    sidebarInert: (document.querySelector('.fdy-app__sidebar') as HTMLElement).hasAttribute('inert'),
    contentInert: (document.querySelector('.fdy-app__content') as HTMLElement).hasAttribute('inert'),
    focused: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  };
};
