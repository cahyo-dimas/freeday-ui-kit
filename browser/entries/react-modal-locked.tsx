// A FdyModal the user may not dismiss (dismissible=false), opened from app state. window.__appOpen
// mirrors that state, so a spec can compare it with what the <dialog> itself reports.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FdyModal } from '../../adapters/react/components/FdyModal';

declare global { interface Window { __appOpen: boolean; __show: () => void } }
window.__appOpen = false;

function App() {
  const [open, setOpen] = useState(false);
  window.__show = () => { setOpen(true); window.__appOpen = true; };
  return (
    <FdyModal open={open} title="Saving" dismissible={false}
              onClose={() => { setOpen(false); window.__appOpen = false; }}>
      <p>Working on it</p>
    </FdyModal>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
