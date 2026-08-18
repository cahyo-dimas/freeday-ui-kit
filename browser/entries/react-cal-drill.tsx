// React twin of vue-cal-drill.js.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { FdyDatepicker } from '../../adapters/react/components/FdyDatepicker';

declare global {
  interface Window { __val: string }
}
window.__val = '2026-08-14';

function App(): JSX.Element {
  const [value, setValue] = useState<string>('2026-08-14');
  return (
    <FdyDatepicker
      value={value}
      locale="en-GB"
      ariaLabelledby="lbl"
      onChange={(v: string): void => { setValue(v); window.__val = v; }}
    />
  );
}

createRoot(document.getElementById('app') as HTMLElement).render(<App />);
