// A parent calls useFreeday(root); a CHILD component renders a data-fdy-validate form behind its own
// state. The parent never commits when the child does, which is the shape of CATATAN-FREEDAY §29.
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useFreeday } from '../../adapters/react/useFreeday.js';

function Child() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button id="show" type="button" onClick={() => setShow(true)}>Show</button>
      {show ? (
        <form id="form" data-fdy-validate="" noValidate onSubmit={(e) => e.preventDefault()}>
          <div className="fdy-field">
            <label htmlFor="name" className="fdy-label">Name</label>
            <input id="name" className="fdy-input" required />
          </div>
          <button id="send" type="submit" className="fdy-btn">Send</button>
        </form>
      ) : null}
    </div>
  );
}

function Parent() {
  const root = useRef<HTMLDivElement>(null);
  useFreeday(root);
  return <div ref={root}><Child /></div>;
}

createRoot(document.getElementById('app')!).render(<Parent />);
