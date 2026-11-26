// A screen built on useLoad: the filter changes from the test, the view renders from state.status.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useLoad } from '../../adapters/react/useLoad.js';
import { controlledLoad } from './load-fetch.js';

declare global { interface Window { __setFilter: (v: string) => void } }

function Screen() {
  const [filter, setFilter] = useState('a');
  window.__setFilter = setFilter;
  const { state, load } = useLoad((signal: AbortSignal) => controlledLoad(filter, signal));
  useEffect(() => { void load(); }, [filter, load]);
  if (state.status === 'loading') return <p id="view">loading</p>;
  if (state.status === 'error') return <p id="view">{`error, previous: ${state.previous}`}</p>;
  if (state.status === 'ready') return <p id="view">{state.data}</p>;
  return <p id="view">idle</p>;
}
createRoot(document.getElementById('app')!).render(<Screen />);
