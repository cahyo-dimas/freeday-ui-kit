import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// The `freeday` package is linked from the repo root (file:../..). Vite resolves
// its exports map — `freeday/css`, `freeday`, `freeday/vue` — directly.
export default defineConfig({
  plugins: [vue()],
});
