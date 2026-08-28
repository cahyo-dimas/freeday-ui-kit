// React half of note #054, same script as vue-cfl-dialog-only.js, so a divergence between the two
// adapters fails this spec rather than an app.
import { createRoot } from 'react-dom/client';
import { useRef, useState } from 'react';
import { FdyCfl, type FdyCflHandle } from '../../adapters/react/components/FdyCfl';

interface Row { code: string; name: string }
const ROWS: Row[] = [
  { code: 'CC-1', name: 'Production' },
  { code: 'CC-2', name: 'Logistics' },
];

declare global { interface Window { __val: string | null } }
window.__val = null;

function App(): JSX.Element {
  const [value, setValue] = useState<Row | Row[] | null>(null);
  const picker = useRef<FdyCflHandle>(null);
  const locked = useRef<FdyCflHandle>(null);
  const onChange = (v: Row | Row[] | null): void => {
    setValue(v);
    window.__val = v === null || Array.isArray(v) ? null : v.code;
  };
  const common = {
    value,
    dialogOnly: true,
    fetchPage: () => Promise.resolve({ rows: ROWS, hasMore: false }),
    columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }],
    display: (row: Row) => row.code,
    rowKey: (row: Row) => row.code,
    onChange,
  };
  return (
    <>
      <button id="chip" className="fdy-chip" type="button" onClick={() => picker.current?.open()}>Cost centre</button>
      {/* Deliberately BETWEEN the two chips: a host that generated a box would be a flex item here,
          and the gap between the chips would measure twice what the fixture asks for. */}
      <FdyCfl<Row> {...common} ref={picker} />
      <button id="chip-locked" className="fdy-chip" type="button" onClick={() => locked.current?.open()}>Locked</button>
      <FdyCfl<Row> {...common} disabled ref={locked} />
    </>
  );
}
createRoot(document.getElementById('app')!).render(<App />);
