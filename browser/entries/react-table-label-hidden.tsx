// React twin of vue-table-label-hidden (#026). Separate codebase, separate header markup, so the
// same claim is asserted against both: a hidden label is clipped, not dropped.
import { createRoot } from 'react-dom/client';
import { FdyTable } from '../../adapters/react/components/FdyTable';
import type { FdyTableColumn } from '../../adapters/core/table-model';

interface Row { code: string; name: string }

const COLUMNS: FdyTableColumn<Row>[] = [
  { key: 'code', label: 'Code', sortable: true },
  { key: 'name', label: 'Name' },
  { key: 'act', label: 'Row actions', labelHidden: true },
  { key: 'act2', label: 'Sortable actions', labelHidden: true, sortable: true },
];
const ROWS: Row[] = [{ code: 'C-1', name: 'Row 1' }];

createRoot(document.getElementById('app')!).render(
  <FdyTable columns={COLUMNS} rows={ROWS} rowKey={(r: Row): string => r.code} ariaLabel="Label hidden table" />,
);
