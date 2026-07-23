# Freeday × React — contoh Faktur

Bukti **v0.9**: layar faktur nyata yang memakai komponen Freeday di React lewat hook
`freeday/react`. Pola sama dengan contoh Vue — markup yang dirender React di-*enhance* oleh
enhancer Freeday, dan event `fdy-*` (yang bubbling) didengar di root lalu memperbarui state React.

> **Mau pakai Freeday di project React-mu sendiri?** Ikuti panduan
> [`../../docs/getting-started.md`](../../docs/getting-started.md) §React — install dari GitHub
> (`github:cahyo-dimas/freeday-ui-kit#v1.2.1`), bukan `file:../..` seperti contoh ini.

## Jalankan

```bash
cd examples/react-faktur
npm install     # menautkan `freeday` dari root repo (file:../..) + React/Vite
npm run dev     # buka URL yang ditampilkan Vite
```

`npm run build` untuk build produksi, `npm run typecheck` untuk cek tipe.

## Pola inti

```tsx
import { useFreeday } from 'freeday/react';
const root = useRef<HTMLDivElement>(null);
useFreeday(root);            // hydrate [data-fdy-*] di subtree ini, mount + tiap commit

// Event fdy-* bubbling → satu set listener di root cukup:
useEffect(() => {
  const el = root.current!;
  const onCascade = (e: Event) => setKategori((e as CustomEvent).detail.path);
  el.addEventListener('fdy-cascade-change', onCascade);
  return () => el.removeEventListener('fdy-cascade-change', onCascade);
}, []);
```

Input dibiarkan **uncontrolled** (enhancer yang memiliki nilai DOM: mask menulis langsung ke
`.value`, form-validation membaca lewat Constraint Validation API). State React menyimpan nilai
yang datang lewat event; nilai teks dibaca dari `FormData` saat `fdy-form-valid`. Tidak ada
re-implementasi komponen — enhancer tetap sumber kebenaran. Lihat
[`../../docs/integrations.md`](../../docs/integrations.md) untuk peta library & pola lainnya.
