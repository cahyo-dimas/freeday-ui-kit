// FdyTable's empty render function is told whether the filters emptied it (#069).
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyTable } from '../../adapters/react/components/FdyTable';
import type { FdyFilterMap } from '../../adapters/core/table-model.js';

type Row = { id: number; name: string };
declare global { interface Window { __setRows: (r: Row[]) => void } }

function App() {
  const [filters, setFilters] = useState<FdyFilterMap>({ name: { type: 'text', text: 'zzz' } });
  const [rows, setRows] = useState<Row[]>([{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }]);
  window.__setRows = setRows;
  return (
    <FdyTable<Row>
      rows={rows}
      rowKey={(r) => r.id}
      columns={[{ key: 'name', label: 'Name', filter: 'text' }]}
      filters={filters}
      onFiltersChange={setFilters}
      empty={({ filtered, clearFilters }) => filtered
        ? <button id="clear" type="button" onClick={clearFilters}>Clear filters</button>
        : <span id="nothing">Nothing here yet</span>}
    />
  );
}

createRoot(document.getElementById('app')!).render(<App />);
