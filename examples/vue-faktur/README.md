# Freeday × Vue 3 — contoh Faktur

Bukti **v0.9**: layar faktur nyata yang memakai komponen Freeday di Vue 3 lewat adapter
`freeday/vue`. Menunjukkan kontrak integrasi end-to-end — markup yang dirender Vue di-*enhance*
oleh enhancer Freeday, dan event `fdy-*` mengalir balik ke state Vue.

> **Mau pakai Freeday di project Vue-mu sendiri?** Ikuti panduan
> [`../../docs/getting-started.md`](../../docs/getting-started.md) §Vue 3 — install dari GitHub
> (`github:cahyo-dimas/freeday-ui-kit#v1.3.0`), bukan `file:../..` seperti contoh ini.

## Jalankan

```bash
cd examples/vue-faktur
npm install     # menautkan `freeday` dari root repo (file:../..) + Vue/Vite
npm run dev     # buka URL yang ditampilkan Vite
```

`npm run build` untuk build produksi, `npm run typecheck` untuk cek tipe (`vue-tsc`).

## Yang dibuktikan

| Komponen Freeday | Di layar | Kontrak ke Vue |
|---|---|---|
| Form validation | form faktur | `<form data-fdy-validate @submit.prevent @fdy-form-valid="onValid">` |
| Input mask | No. PO (`PO-####/AA`) | `@fdy-mask` → `detail.raw` |
| Cascade select | kategori produk | `@fdy-cascade-change` → `detail.value/path` |
| Date picker | jatuh tempo | `@fdy-datepicker-change` → `detail.value` |
| Select (combo) | status | `@fdy-change` → `detail.value` |
| Table · card · badge · app-shell | tabel item + layout | kelas `fdy-*` langsung |

## Pola inti

Satu composable meng-*hydrate* semua enhancer di subtree komponen, sekali saat mount dan tiap
update (idempotent):

```ts
import { useFreeday } from 'freeday/vue';
const root = ref<HTMLElement | null>(null);
useFreeday(root);          // <div ref="root"> ...[data-fdy-*]... </div>
```

Event Freeday = `CustomEvent` bubbling biasa, jadi cukup `v-on` native (`@fdy-cascade-change`)
lalu baca `event.detail` (tipe di `freeday/vue`). Tidak ada re-implementasi komponen —
enhancer tetap sumber kebenaran. Lihat [`../../docs/integrations.md`](../../docs/integrations.md)
untuk peta library & pola framework lainnya (React/Blazor).
