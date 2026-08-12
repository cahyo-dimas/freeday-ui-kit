// React twin of vue-table-pageindex: FdyTable in client mode with a CONTROLLED pageIndex driven by
// a pager outside the table. Same assertions, so the two adapters are held to one contract.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyTable } from '../../adapters/react/components/FdyTable';
import type { FdyTableColumn } from '../../adapters/core/table-model';

type Row = { code: string; name: string };

const COLUMNS: FdyTableColumn<Row>[] = [
  { key: 'code', header: 'Code', sortable: true },
  { key: 'name', header: 'Name', filter: 'text' },
];
const ROWS: Row[] = Array.from({ length: 7 }, (_, i) => ({ code: `C-${i + 1}`, name: `Row ${i + 1}` }));

declare global {
  interface Window {
    __pageIndex: number;
    __processed: string[];
  }
}
window.__pageIndex = 0;
window.__processed = [];

function App(): JSX.Element {
  const [pageIndex, setPageIndex] = useState<number>(0);
  const move = (i: number): void => {
    setPageIndex(i);
    window.__pageIndex = i;
  };
  return (
    <div>
      <FdyTable<Row>
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.code}
        pageSize={2}
        pageIndex={pageIndex}
        ariaLabel="Controlled table"
        onPageIndexChange={move}
        onProcess={({ rows }) => {
          window.__processed = rows.map((r) => r.code);
        }}
      />
      <button id="ext-next" className="fdy-btn" type="button" onClick={() => move(pageIndex + 1)}>
        Next (outside the table)
      </button>
    </div>
  );
}

createRoot(document.getElementById('app') as HTMLElement).render(<App />);
