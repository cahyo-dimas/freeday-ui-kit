import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@cahyo-dimas/freeday/css'; // tokens + components in one file
import '@cahyo-dimas/freeday';     // side-effect: registers every window.Freeday* enhancer
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
