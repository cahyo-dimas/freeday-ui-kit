// Mount the real FdyCfl.tsx over a fetchPage the TEST resolves, one call at a time.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyCfl } from '../../adapters/react/components/FdyCfl';
import { controlledFetch } from './cfl-async-fetch.js';

type Row = { name: string };

function App() {
  const [value, setValue] = useState<Row | Row[] | null>(null);
  return (
    <FdyCfl<Row>
      value={value}
      onChange={setValue}
      fetchPage={controlledFetch}
      columns={[{ key: 'name', label: 'Name' }]}
      display={(row: Row) => row.name}
      rowKey={(row: Row) => row.name}
      ariaLabelledby="lbl"
    />
  );
}

createRoot(document.getElementById('app')!).render(<App />);
