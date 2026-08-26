// React twin of vue-table-select: FdyTable with CONTROLLED selection over a paged, row-activatable
// table. The adapters are two independent implementations of one contract, so each needs its own
// guard — a bug fixed in one has repeatedly survived in the other (see the head of adapter.mjs).
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyTable } from '../../adapters/react/components/FdyTable';
import type { FdyTableColumn } from '../../adapters/core/table-model';

type Row = { code: string; name: string };

const COLUMNS: FdyTableColumn<Row>[] = [
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
];
const ROWS: Row[] = Array.from({ length: 4 }, (_, i) => ({ code: `C-${i + 1}`, name: `Row ${i + 1}` }));

declare global {
  interface Window {
    __selected: Array<string | number>;
    __activated: string | null;
  }
}
window.__selected = [];
// Stays null unless a row activation fires — which, on a checkbox click, is the bug.
window.__activated = null;

function App(): JSX.Element {
  const [selectedKeys, setSelectedKeys] = useState<Array<string | number>>([]);
  return (
    <FdyTable<Row>
      columns={COLUMNS}
      rows={ROWS}
      rowKey={(r) => r.code}
      pageSize={2}
      selectable
      selectedKeys={selectedKeys}
      rowActivatable
      ariaLabel="Selectable table"
      onSelectedKeysChange={(keys) => {
        setSelectedKeys(keys);
        window.__selected = keys.slice();
      }}
      onRowActivate={(row) => {
        window.__activated = row.code;
      }}
    />
  );
}

createRoot(document.getElementById('app') as HTMLElement).render(<App />);
