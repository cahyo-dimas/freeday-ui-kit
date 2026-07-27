import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// The `@cahyo-dimas/freeday` package is linked from the repo root (file:../..). Vite
// resolves its exports map — `@cahyo-dimas/freeday/css`, `@cahyo-dimas/freeday`,
// `@cahyo-dimas/freeday/vue` — directly.
export default defineConfig({
  plugins: [vue()],
});
