// React twin of vue-form-required.js, held to the same expectations (#096).
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyTimepicker } from '../../adapters/react/components/FdyTimepicker';

declare global {
  interface Window {
    __valid: number;
    __invalid: number;
    FreedayForm: { initAll: (el: Element | null) => void };
  }
}
window.__valid = 0;
window.__invalid = 0;

function App() {
  const [jam, setJam] = useState<string>('');
  return (
    <form
      id="form"
      data-fdy-validate=""
      data-fdy-text-required="Wajib diisi."
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="fdy-field">
        <span className="fdy-label">Jam mulai</span>
        <FdyTimepicker
          value={jam}
          required
          step={30}
          min="06:00"
          max="08:00"
          ariaLabel="Jam mulai"
          onChange={(v) => setJam(v)}
        />
      </div>
      <button id="kirim" type="submit" className="fdy-btn">Simpan</button>
    </form>
  );
}

createRoot(document.getElementById('app')!).render(<App />);

/* React commits asynchronously, so the form does not exist yet on this line. Hydrate once it does
   — a fixed timeout here would be a race the suite pays for later. */
const tunggu = (): void => {
  const form = document.getElementById('form');
  if (form === null) {
    requestAnimationFrame(tunggu);
    return;
  }
  form.addEventListener('fdy-form-valid', () => { window.__valid += 1; });
  form.addEventListener('fdy-form-invalid', () => { window.__invalid += 1; });
  window.FreedayForm.initAll(document.getElementById('app'));
};
tunggu();
