// The loading row says what the app calls loading (butir 6 of 3.9.0). React twin of
// vue-table-loading-text.js.
import { createRoot } from 'react-dom/client';
import { FdyTable } from '../../adapters/react/components/FdyTable';

type Row = { id: number; name: string };

const rows: Row[] = [{ id: 1, name: 'Row 1' }];
const columns = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];

createRoot(document.getElementById('app')!).render(
  <>
    <div id="given">
      <FdyTable<Row>
        rows={rows}
        columns={columns}
        rowKey={(r) => String(r.id)}
        loading
        loadingText="Memuat…"
      />
    </div>
    <div id="bare">
      <FdyTable<Row>
        rows={rows}
        columns={columns}
        rowKey={(r) => String(r.id)}
        loading
      />
    </div>
  </>,
);
