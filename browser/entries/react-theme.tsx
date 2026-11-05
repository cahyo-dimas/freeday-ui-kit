// React twin of vue-theme.js, held to the same expectations, and likewise loaded without
// dist/freeday.js.
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useTheme } from '../../adapters/react/index.js';

declare global {
  interface Window {
    hideRegion: () => boolean;
    regionEl: HTMLElement | null;
    mounted: boolean;
  }
}

function Toggle({ id }: { id: string }) {
  const t = useTheme();
  return <button id={id} type="button" onClick={t.toggleTheme}>{`${t.theme}/${t.resolved}`}</button>;
}
function Region() {
  const root = useRef<HTMLElement | null>(null);
  const t = useTheme(root);
  return <section ref={root} id="region" data-theme="dark">{t.resolved}</section>;
}

let hide: () => void = () => {};
function App() {
  const [show, setShow] = useState<boolean>(true);
  hide = () => setShow(false);
  return <div><Toggle id="a" /><Toggle id="b" />{show ? <Region /> : null}</div>;
}

window.hideRegion = () => { window.regionEl = document.getElementById('region'); flushSync(() => hide()); return true; };
flushSync(() => createRoot(document.getElementById('app') as HTMLElement).render(<App />));
window.mounted = true;
