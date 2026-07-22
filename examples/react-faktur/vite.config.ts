import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The `freeday` package is linked from the repo root (file:../..). Vite resolves
// its exports map — `freeday/css`, `freeday`, `freeday/react` — directly.
export default defineConfig({
  plugins: [react()],
});
