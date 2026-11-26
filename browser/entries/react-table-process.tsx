// A server-paged FdyTable whose parent keeps the processed rows in state, the documented use of
// onProcess (a card list for phones). window.__processCalls counts how often the table reports.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyTable } from '../../adapters/react/components/FdyTable';

type Row = { code: string };
const ROWS: Row[] = [{ code: 'A' }, { code: 'B' }, { code: 'C' }];
declare global { interface Window { __processCalls: number } }
window.__processCalls = 0;

function App() {
  const [cards, setCards] = useState<Row[]>([]);
  return (
    <div>
      <FdyTable<Row>
        rows={ROWS}
        columns={[{ key: 'code', label: 'Code' }]}
        rowKey={(r: Row) => r.code}
        page={{ index: 0, size: 10, total: 3 }}
        onProcess={(r) => { window.__processCalls += 1; setCards(r.rows); }}
      />
      <p id="cards">{cards.length}</p>
    </div>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
