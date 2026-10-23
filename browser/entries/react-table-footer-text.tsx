// The footer's strings, given by the app (butir 2). React twin of vue-table-footer-text.js.
import { createRoot } from 'react-dom/client';
import { FdyTableFooter } from '../../adapters/react/components/FdyTableFooter';
import type { FdyPageState } from '../../adapters/core/table-model.js';

const page: FdyPageState = { index: 2, size: 5, total: 25 };

createRoot(document.getElementById('app')!).render(
  <>
    <div id="given">
      <FdyTableFooter
        page={page}
        pageSizes={[5, 10, 25]}
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
      <FdyTableFooter page={page} pageSizes={[5, 10, 25]} />
    </div>
  </>,
);
