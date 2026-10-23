// React twin of vue-monthpicker.js.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { FdyMonthpicker } from '../../adapters/react/components/FdyMonthpicker';
import { FdyDatepicker } from '../../adapters/react/components/FdyDatepicker';

declare global {
  interface Window { __month: string; __dep: string; __bound: string; __depBound: string }
}
window.__month = '2026-10';
window.__dep = '2026-10';
window.__bound = '2026-10';
window.__depBound = '2026-10';

function App(): JSX.Element {
  const [month, setMonth] = useState<string>('2026-10');
  const [dep, setDep] = useState<string>('2026-10');
  const [bound, setBound] = useState<string>('2026-10');
  const [depBound, setDepBound] = useState<string>('2026-10');
  return (
    <>
      <div id="mp">
        <FdyMonthpicker
          value={month}
          ariaLabelledby="lbl-month"
          onChange={(v: string): void => { setMonth(v); window.__month = v; }}
        />
      </div>
      <div id="dep">
        <FdyDatepicker
          value={dep}
          mode="month"
          ariaLabelledby="lbl-dep"
          onChange={(v: string): void => { setDep(v); window.__dep = v; }}
        />
      </div>
      <div id="mp-bound">
        <FdyMonthpicker
          value={bound}
          min="2026-03"
          max="2026-10"
          ariaLabelledby="lbl-month"
          onChange={(v: string): void => { setBound(v); window.__bound = v; }}
        />
      </div>
      <div id="dep-bound">
        <FdyDatepicker
          value={depBound}
          mode="month"
          min="2026-03"
          max="2026-10"
          ariaLabelledby="lbl-dep"
          onChange={(v: string): void => { setDepBound(v); window.__depBound = v; }}
        />
      </div>
    </>
  );
}

createRoot(document.getElementById('app') as HTMLElement).render(<App />);
