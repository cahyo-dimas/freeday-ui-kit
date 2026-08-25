import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The `@cahyo-dimas/freeday` package is linked from the repo root (file:../..). Vite
// resolves its exports map (`@cahyo-dimas/freeday/css`, `@cahyo-dimas/freeday`,
// `@cahyo-dimas/freeday/react` — directly.
export default defineConfig({
  plugins: [react()],
});
