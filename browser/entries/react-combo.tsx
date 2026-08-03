// Mount the real FdyCombo.tsx as a controlled component, mirroring window.__val so the
// harness can assert a mouse-select actually called onChange. Bundled to an IIFE by
// browser/harness.mjs (React runtime inlined).
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyCombo } from '../../adapters/react/components/FdyCombo';

const OPTIONS = [
  { value: 'button', label: 'Button' },
  { value: 'badge', label: 'Badge' },
  { value: 'alert', label: 'Alert' },
] as const;

declare global {
  interface Window {
    __val: string;
  }
}

window.__val = 'button';

function App(): React.JSX.Element {
  const [value, setValue] = useState<string>('button');
  return (
    <FdyCombo
      value={value}
      options={OPTIONS}
      ariaLabelledby="lbl"
      onChange={(v: string): void => {
        window.__val = v;
        setValue(v);
      }}
    />
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
