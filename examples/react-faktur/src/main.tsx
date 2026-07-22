import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'foundry/css'; // tokens + components in one file
import 'foundry';     // side-effect: registers every window.Foundry* enhancer
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
