// Mount the real FdyDateRange.tsx and record every change and every settle (#063).
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyDateRange, type DateRangeValue } from '../../adapters/react/components/FdyDateRange';

declare global { interface Window { __changes: DateRangeValue[]; __settled: DateRangeValue[] } }
window.__changes = [];
window.__settled = [];

function App() {
  const [value, setValue] = useState<DateRangeValue>({ start: null, end: null });
  return (
    <FdyDateRange
      value={value}
      locale="en-GB"
      ariaLabel="Period"
      onChange={(v) => { setValue(v); window.__changes.push(v); }}
      onSettled={(v) => window.__settled.push(v)}
    />
  );
}

createRoot(document.getElementById('app')!).render(<App />);
