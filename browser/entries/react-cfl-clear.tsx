// React twin of vue-cfl-clear.js — the same asymmetry existed in `onChange: (value: Row) => void`.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { FdyCfl } from '../../adapters/react/components/FdyCfl';

interface Row extends Record<string, unknown> {
  code: string;
  name: string;
}

const ROWS: Row[] = [
  { code: 'WF-1', name: 'Standard approval' },
  { code: 'WF-2', name: 'Fast track' },
];

declare global {
  interface Window {
    __val: string | null;
  }
}
window.__val = 'WF-1';

function App(): JSX.Element {
  const [value, setValue] = useState<Row | null>(ROWS[0]);
  return (
    <FdyCfl<Row>
      value={value}
      clearable
      onChange={(v: Row | null): void => {
        setValue(v);
        window.__val = v === null ? null : v.code;
      }}
      fetchPage={(): Promise<{ rows: Row[]; hasMore: boolean }> => Promise.resolve({ rows: ROWS, hasMore: false })}
      columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }]}
      display={(row: Row): string => row.code}
      rowKey={(row: Row): string => row.code}
      ariaLabelledby="lbl"
    />
  );
}

createRoot(document.getElementById('app') as HTMLElement).render(<App />);
