import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// The `foundry` package is linked from the repo root (file:../..). Vite resolves
// its exports map — `foundry/css`, `foundry`, `foundry/vue` — directly.
export default defineConfig({
  plugins: [vue()],
});
