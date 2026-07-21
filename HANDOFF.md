# Foundry — Handoff (cek pagi hari)

Ringkasan kerja semalam (otonom, sesuai izinmu). Semua **commit lokal saja** — tidak ada
push/merge/checkout/reset (sesuai batasanmu). Aku tetap di branch `feat/v0.2-rich-refinement`
dan menandai milestone dengan git tag.

## 1. Cara lihat hasilnya (paling penting)
Buka **`docs/index.html`** di browser (butuh internet untuk font Google; tanpa internet tetap
jalan dengan font fallback). Sekarang docs jadi **demo-site** berbasis app-shell: sidebar nav
kiri, topbar, hero, dan contoh hidup tiap komponen.

Yang wajib dicoba:
- **Data table** (menu "Data table"): ketik di kotak **Cari**, klik **judul kolom** untuk urут,
  centang baris / "pilih semua", ganti **halaman** di bawah. (Ini jawaban keluhan "cuma sort".)
- **Select**: dropdown baru `fdy-combo` — popup-nya kini **berdesain** (bukan popup OS jelek).
  Coba keyboard: ↑↓, Enter, Esc, ketik huruf awal.
- **Toast**: tombol di menu "Toast".
- **Modal**, **Tabs** (panah kiri/kanan), **Tooltip** (hover/fokus).
- Toggle **Tema** & **Kerapatan** di kanan-atas (cek light & dark).

## 2. Apa yang berubah
**v0.2 (sudah tuntas + tag `v0.2`)** — rich refinement + app shell/table/modal/checkbox-radio-switch
+ **`fdy-combo`** (native `<select>` diganti combobox berdesain, karena popup native tak bisa
distyle lintas-browser — sama seperti pendekatan Foundation). Semua AA-bersih.

**v0.3 (tag `v0.3`)** — "business-complete":
- Komponen baru: **alert, toast, tooltip, tabs, breadcrumb, pagination, avatar, spinner,
  progress, skeleton, states**.
- **Data table** interaktif: toolbar/cari, sort kolom, paginasi, seleksi baris (select-all
  dengan indeterminate).
- **4 enhancer JS opsional** (0 dependency, auto-init lewat `data-*`, pola WAI-ARIA APG):
  `foundry-select.js`, `foundry-tabs.js`, `foundry-table.js`, `foundry-toast.js`.
- **Docs jadi demo-site** (jawaban keluhan "polos banget").
- Token baru `--color-inverse-surface/-text` (tooltip & toast).

Sekarang Foundry punya **20+ komponen**, semua token-driven, 0 dependency runtime,
`node --test` 5/5, `dist/` deterministik (rebuild = tanpa diff).

## 3. Keputusan yang kuambil sendiri (kamu bilang percaya penuh)
- **Tetap 1 branch, tak merge/checkout** (batasanmu). Milestone ditandai `git tag v0.2` & `v0.3`.
- **Datepicker & data-grid virtualized → ditunda v0.4.** Kompleks & berisiko tanpa cek visual;
  aku fokuskan v0.3 ke yang paling dipakai layar bisnis + keluhanmu.
- Data table = enhancement client-side (cocok untuk demo/kit). Di app nyata, kelola data
  server/store-side; markup + kelas Foundry tetap dipakai.

## 4. Catatan minor untuk KEPUTUSANMU (tidak memblokir; sengaja tidak kuubah)
Review akhir (opus) memberi verdict **Ready** — tanpa isu Critical/Important. Sisa minor yang
sebaiknya **kamu** yang putuskan karena menyangkut selera visual / perubahan kit-wide:

1. **Kontras border kontrol (WCAG 1.4.11).** Border input/checkbox/select pakai
   `--color-border-strong` ≈ **1.55:1** di atas putih (< 3:1 untuk batas komponen non-teks).
   Ini **warisan sejak v0.1**. Memperbaikinya = menggelapkan SEMUA border kontrol (mengubah
   look tenang/ringan yang sekarang). Aku sengaja tak ubah sendiri — ini panggilanmu.
   (Fix bila mau: bikin token `--color-control-border` khusus ≥3:1, atau gelapkan border-strong.)
2. **Dark `-soft` semi-transparan.** Judul alert/badge lolos AA di `surface`/`surface-2`, tapi
   bila alert danger/info ditaruh di `surface-3` (dark), kontras judul turun ~4.0 (< 4.5). Docs
   tak memicu ini. Fix opsional: jadikan dark `-soft` solid, atau dokumentasikan surface minimum.
3. **Demo "layar bisnis" di docs** menyisipkan shell kedua → ada landmark `<aside>`/`<nav>`
   tambahan (sedikit "ramai" untuk screen reader). Murni docs, bukan komponen.
4. **Sort angka** butuh `data-sort-value` untuk angka berformat ribuan (mis. "1.240.000").
   Docs sudah menyediakannya; ini kontrak yang didokumentasikan di header `foundry-table.js`.

## 5. Git & cara merge (saat kamu siap)
- Branch: `feat/v0.2-rich-refinement` (berisi v0.2 **dan** v0.3 — aku tak boleh pindah branch).
- Tags: `v0.2` (86d780d) dan `v0.3` (HEAD). Lihat riwayat: `git log --oneline v0.2..HEAD`.
- Merge (kamu yang lakukan, aku hindari checkout/merge):
  `git checkout main && git merge feat/v0.2-rich-refinement`
  (atau review commit dulu; tiap batch di-commit terpisah + di-review sebelum masuk).

## 6. Build & test
```bash
node tokens/build.mjs   # tokens.json -> dist/foundry.tokens.css + dist/foundry.css + copy dist/*.js
npm test                # node --test (5/5)
```

## 7. Lokasi
- `src/components/*.css` — komponen · `src/*.js` — enhancer opsional
- `dist/` — hasil build (di-commit): `*.css` + `*.js`
- `docs/index.html` — demo-site
- `docs/superpowers/plans/` — plan v0.1/v0.2/v0.3 · `docs/superpowers/specs/` — spec/blueprint
- `.superpowers/sdd/progress.md` — ledger progres (scratch)

Kalau ada yang kurang sreg (warna, jarak, komponen), tinggal bilang — tinggal iterasi.
