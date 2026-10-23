// React twin of vue-month-mode.js.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { FdyDatepicker } from '../../adapters/react/components/FdyDatepicker';

declare global {
  interface Window { __month: string; __day: string }
}
window.__month = '2026-10';
window.__day = '2026-10-21';

function App(): JSX.Element {
  const [month, setMonth] = useState<string>('2026-10');
  const [day, setDay] = useState<string>('2026-10-21');
  return (
    <>
      <div id="mp">
        <FdyDatepicker
          value={month}
          mode="month"
          ariaLabelledby="lbl-month"
          onChange={(v: string): void => { setMonth(v); window.__month = v; }}
        />
      </div>
      <div id="dp">
        <FdyDatepicker
          value={day}
          ariaLabelledby="lbl-day"
          onChange={(v: string): void => { setDay(v); window.__day = v; }}
        />
      </div>
    </>
  );
}

createRoot(document.getElementById('app') as HTMLElement).render(<App />);
