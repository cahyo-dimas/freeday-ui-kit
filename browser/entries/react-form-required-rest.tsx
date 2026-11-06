// React twin of vue-form-required-rest.js, held to the same expectations (#114).
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { FdyAutocomplete, FdyCfl, FdyDateRange, type DateRangeValue } from '../../adapters/react/index.js';

interface Customer extends Record<string, unknown> { code: string }

declare global {
  interface Window {
    counts: { valid: number; invalid: number };
    lastInvalid: number;
    fill: () => void;
    setRequired: (next: boolean) => void;
    mounted: boolean;
    FreedayForm: { initAll: (root: Element) => void };
  }
}

const ROWS: Customer[] = [{ code: 'C-1001' }];
let fill: () => void = () => {};
let setReq: (next: boolean) => void = () => {};

function App() {
  const [satuan, setSatuan] = useState<string>('');
  const [pelanggan, setPelanggan] = useState<Customer | Customer[] | null>(null);
  const [periode, setPeriode] = useState<DateRangeValue>({ start: null, end: null });
  const [required, setRequired] = useState<boolean>(true);
  fill = () => {
    setSatuan('pcs');
    setPelanggan(ROWS[0]);
    setPeriode({ start: '2026-11-02', end: '2026-11-09' });
  };
  setReq = setRequired;
  return (
    <form id="form" data-fdy-validate="" onSubmit={(e) => e.preventDefault()}>
      <div className="fdy-field">
        <label className="fdy-label" htmlFor="ac">Satuan</label>
        <FdyAutocomplete id="ac" value={satuan} options={['pcs', 'galon']} required={required} onChange={setSatuan} />
      </div>
      <div className="fdy-field">
        <span className="fdy-label" id="cust-l">Pelanggan</span>
        <FdyCfl<Customer>
          value={pelanggan} required={required} ariaLabelledby="cust-l"
          fetchPage={() => Promise.resolve({ rows: ROWS, hasMore: false })}
          columns={[{ key: 'code', label: 'Kode' }]}
          display={(r: Customer): string => r.code} rowKey={(r: Customer): string => r.code}
          onChange={setPelanggan}
        />
      </div>
      <div className="fdy-field">
        <span className="fdy-label">Periode</span>
        <FdyDateRange value={periode} required={required} ariaLabel="Periode" onChange={setPeriode} />
      </div>
      <button id="kirim" type="submit" className="fdy-btn">Simpan</button>
    </form>
  );
}

window.counts = { valid: 0, invalid: 0 };
window.lastInvalid = 0;
window.fill = () => flushSync(() => fill());
window.setRequired = (next: boolean) => flushSync(() => setReq(next));
flushSync(() => createRoot(document.getElementById('app') as HTMLElement).render(<App />));

const form = document.getElementById('form') as HTMLFormElement;
form.addEventListener('fdy-form-valid', () => { window.counts.valid += 1; });
form.addEventListener('fdy-form-invalid', (e: Event) => {
  window.counts.invalid += 1;
  window.lastInvalid = (e as CustomEvent<{ invalid: Element[] }>).detail.invalid.length;
});
window.FreedayForm.initAll(document.getElementById('app') as HTMLElement);
window.mounted = true;
