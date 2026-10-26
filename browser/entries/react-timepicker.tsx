// Mount the real FdyTimepicker.tsx with the same two cases as the Vue entry, so the pair can be
// asserted against ONE set of expectations (#094).
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyTimepicker } from '../../adapters/react/components/FdyTimepicker';

declare global { interface Window { __changes: string[] } }
window.__changes = [];

function App() {
  const [value, setValue] = useState<string>('');
  return (
    <>
      <div id="bounded">
        <FdyTimepicker
          value={value}
          step={15}
          min="06:00"
          max="08:00"
          ariaLabel="Jam mulai"
          onChange={(v) => { setValue(v); window.__changes.push(v); }}
        />
      </div>
      <div id="locked">
        <FdyTimepicker value="07:30" readonly onChange={() => {}} ariaLabel="Terkunci" />
      </div>
    </>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
