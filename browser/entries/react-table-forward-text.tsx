// The table hands the footer its strings (butir 1 of 3.9.0). React twin of
// vue-table-forward-text.js.
import { createRoot } from 'react-dom/client';
import { FdyTable } from '../../adapters/react/components/FdyTable';
import type { FdyPageState } from '../../adapters/core/table-model.js';

type Row = { id: number; name: string };

const rows: Row[] = Array.from({ length: 5 }, (_u, i) => ({ id: i + 11, name: `Row ${i + 11}` }));
const columns = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];
const page: FdyPageState = { index: 2, size: 5, total: 25 };

createRoot(document.getElementById('app')!).render(
  <>
    <div id="given">
      <FdyTable<Row>
        rows={rows}
        columns={columns}
        page={page}
        pageSizes={[5, 10, 25]}
        rowKey={(r) => String(r.id)}
        /* `{total}` twice on purpose: every occurrence is replaced, as textOf() does. */
        infoText="Menampilkan {from}-{to} dari {total} ({total})"
        pageSizeLabel="Baris"
        paginationLabel="Paginasi"
        prevLabel="Halaman sebelumnya"
        nextLabel="Halaman berikutnya"
        pageLabel="Ke halaman {n}"
      />
    </div>
    <div id="bare">
      <FdyTable<Row>
        rows={rows}
        columns={columns}
        page={page}
        pageSizes={[5, 10, 25]}
        rowKey={(r) => String(r.id)}
      />
    </div>
  </>,
);
