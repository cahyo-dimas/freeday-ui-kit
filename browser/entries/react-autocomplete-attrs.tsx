// React twin of vue-autocomplete-attrs.js, held to the same expectations (#115).
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { FdyAutocomplete } from '../../adapters/react/index.js';

declare global {
  interface Window {
    blurs: number;
    setValue: (v: string) => void;
    isOpen: () => boolean;
    shownOptions: () => string[];
    emptyShown: () => boolean;
    mounted: boolean;
    FreedayForm: { initAll: (root: Element) => void };
  }
}

let set: (v: string) => void = () => {};
function App() {
  const [satuan, setSatuan] = useState<string>('buah');
  set = setSatuan;
  return (
    <form id="form" data-fdy-validate="" onSubmit={(e) => e.preventDefault()}>
      <div className="fdy-field">
        <label className="fdy-label" htmlFor="ac">Satuan</label>
        <FdyAutocomplete
          id="ac" value={satuan} options={['buah', 'galon', 'pcs']} required onChange={setSatuan}
          className="sizer" style={{ width: '200px' }}
          maxLength={20} inputMode="text" name="satuan"
          data-fdy-msg-required="Satuan wajib diisi."
          onBlur={() => { window.blurs += 1; }}
        />
      </div>
      <button id="kirim" type="submit" className="fdy-btn">Simpan</button>
    </form>
  );
}

window.blurs = 0;
window.setValue = (v: string) => flushSync(() => set(v));
window.isOpen = () => document.getElementById('ac')?.getAttribute('aria-expanded') === 'true';
window.shownOptions = () => [...document.querySelectorAll('[role="option"]')].map((o) => (o.textContent ?? '').trim());
window.emptyShown = () => document.querySelector('.fdy-autocomplete__empty') !== null;
flushSync(() => createRoot(document.getElementById('app') as HTMLElement).render(<App />));
window.FreedayForm.initAll(document.getElementById('app') as HTMLElement);
window.mounted = true;
