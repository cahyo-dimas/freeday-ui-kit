import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The `foundry` package is linked from the repo root (file:../..). Vite resolves
// its exports map — `foundry/css`, `foundry`, `foundry/react` — directly.
export default defineConfig({
  plugins: [react()],
});
