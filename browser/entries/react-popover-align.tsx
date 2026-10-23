// React twin of browser/entries/vue-popover-align.js, same page shape and the same two faults.
// The bar parks an FdyCombo against the page's right gutter (its left edge moves when the viewport
// narrows, which is what #079 turns into a misplaced panel); the table's last column is
// right-aligned, so its funnel sits against the table's right edge and a left-aligned filter panel
// runs past the page.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyCombo } from '../../adapters/react/components/FdyCombo';
import { FdyTable } from '../../adapters/react/components/FdyTable';
import type { FdyTableColumn } from '../../adapters/core/table-model';

interface Order {
  id: number;
  name: string;
  city: string;
  amount: number;
}

const OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
] as const;

const ROWS: Order[] = [
  { id: 1, name: 'Alpha', city: 'Jakarta', amount: 1200 },
  { id: 2, name: 'Beta', city: 'Bandung', amount: 980 },
];

const COLUMNS: ReadonlyArray<FdyTableColumn<Order>> = [
  { key: 'name', label: 'Name', filter: 'text' },
  { key: 'city', label: 'City' },
  { key: 'amount', label: 'Amount', align: 'right', filter: 'text' },
];

function App(): React.JSX.Element {
  const [status, setStatus] = useState<string>('draft');
  return (
    <>
      <div className="bar">
        <span id="lbl" className="bar__title">Orders</span>
        <div className="bar__combo">
          <FdyCombo
            value={status}
            options={OPTIONS}
            ariaLabelledby="lbl"
            onChange={(v: string): void => setStatus(v)}
          />
        </div>
      </div>
      <div className="page">
        <FdyTable
          rows={ROWS}
          columns={COLUMNS}
          rowKey={(r: Order): string => String(r.id)}
          ariaLabel="Orders"
        />
      </div>
    </>
  );
}

createRoot(document.getElementById('app') as HTMLElement).render(<App />);
