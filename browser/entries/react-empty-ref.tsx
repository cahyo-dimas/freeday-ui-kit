// React twin of vue-empty-ref.js, held to the same expectations.
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useFreeday } from '../../adapters/react/index.js';

declare global {
  interface Window {
    mountCase: (name: CaseName) => boolean;
    bump: () => boolean;
  }
}
type CaseName = 'bound' | 'forgotten' | 'whole';

const bumpers: Set<() => void> = new Set();
window.bump = () => { flushSync(() => bumpers.forEach((b) => b())); return true; };

/* The state lives in the component that calls useFreeday, so a bump re-renders THAT component. */
function useTick(): number {
  const [tick, setTick] = useState<number>(0);
  useEffect(() => {
    const bump = (): void => setTick((t) => t + 1);
    bumpers.add(bump);
    return () => { bumpers.delete(bump); };
  }, []);
  return tick;
}
function Chip({ id, tick }: { id: string; tick: number }) {
  return (
    <span className="fdy-chips">
      <span className="fdy-chip">Ani {tick}
        <button id={id} className="fdy-chip__remove" type="button" aria-label="Hapus Ani">×</button>
      </span>
    </span>
  );
}
function Bound() {
  const tick = useTick();
  const root = useRef<HTMLElement>(null);
  useFreeday(root);
  return <section ref={root}><Chip id="rmBound" tick={tick} /></section>;
}
function Forgotten() {
  const tick = useTick();
  const root = useRef<HTMLElement>(null);
  useFreeday(root);
  return <section><Chip id="rmForgotten" tick={tick} /></section>;
}
function Whole() {
  const tick = useTick();
  useFreeday();
  return <section><Chip id="rmWhole" tick={tick} /></section>;
}
const cases: Record<CaseName, () => JSX.Element> = { bound: Bound, forgotten: Forgotten, whole: Whole };

window.mountCase = (name) => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const Case = cases[name];
  flushSync(() => createRoot(host).render(<Case />));
  return true;
};
