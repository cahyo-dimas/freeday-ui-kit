// React half of note 019 — same shape as vue-cfl-multi.js, so a divergence between the two
// adapters shows up as one of them failing this spec.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { FdyCfl } from '../../adapters/react/components/FdyCfl';

interface Row { code: string; name: string }
const ROWS: Row[] = [
  { code: 'EX-1', name: 'Taxi' },
  { code: 'EX-2', name: 'Hotel' },
  { code: 'EX-3', name: 'Meals' },
];

declare global { interface Window { __val: string[] | null } }
window.__val = null;

function App(): JSX.Element {
  const [value, setValue] = useState<Row | Row[] | null>(null);
  return (
    <FdyCfl<Row>
      value={value}
      multiple
      fetchPage={() => Promise.resolve({ rows: ROWS, hasMore: false })}
      columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }]}
      display={(row: Row) => row.code}
      rowKey={(row: Row) => row.code}
      ariaLabelledby="lbl"
      onChange={(v: Row | Row[] | null) => {
        setValue(v);
        window.__val = v === null ? null : (Array.isArray(v) ? v.map((r: Row) => r.code) : [v.code]);
      }}
    />
  );
}
createRoot(document.getElementById('app')!).render(<App />);
