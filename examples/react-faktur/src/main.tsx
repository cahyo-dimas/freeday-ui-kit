import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'freeday/css'; // tokens + components in one file
import 'freeday';     // side-effect: registers every window.Freeday* enhancer
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
