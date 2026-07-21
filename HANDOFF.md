# Foundry — Handoff (cek pagi hari)

Ringkasan kerja semalam (otonom, sesuai izinmu). Semua **commit lokal saja** — tidak ada
push/merge/checkout/reset (sesuai batasanmu). Aku tetap di branch `feat/v0.2-rich-refinement`
dan menandai milestone dengan git tag.

## ⭐ v0.4 — SELESAI (tag `v0.4` @ 02eb769) — parity Foundation + siap-project
Loop 30-menit menuntaskan semua yang kamu minta. Kamu bilang: ikon CFL jelek (emoji 🔎, kiri) →
mau SVG bersih di **kanan**; table "cuma sort, belum ada filter"; index kurang; pikirkan struktur
pakai-di-project. **Semua beres.** Enam iterasi, tiap-tiap di-commit + build deterministik + test:

1. **Choose-from-list** (`13e381e`) — field read-only + tombol kaca-pembesar **SVG di kanan**
   membuka **dialog pencari** (search, hasil dense sticky-header, single commit-saat-klik +
   multi centang/konfirmasi, empty state, keyboard penuh). Field yang kamu screenshot kini CFL
   sungguhan (kode + nama terisi bareng). Menu **"Choose-from-list"**.
2. **Table filter + bulk** (`815db8a`) — tiap kolom punya **corong filter** (teks *berisi* · enum
   *checklist* · angka *rentang*) + **bar aksi massal** saat baris dipilih. Menu **"Data table"**.
3. **Date picker** (`7977704`) — kalender popover, single + **range tertaut** (akhir ≥ awal),
   locale otomatis (Intl), keyboard penuh. Menu **"Date picker"**.
4. **File upload** (`3359e74`) — dropzone + state per-berkas (idle/drag/mengunggah/selesai/error).
   Menu **"File upload"**.
5. **Index foundations** (`b106047`) — Prinsip, Spasi, Radius & Elevasi, Motion, Aksesibilitas.
   Index kini kaya seperti Foundation (menjawab "polos banget").
6. **Struktur project** (`02eb769`) — satu bundel `dist/foundry.js` (semua enhancer, cukup 1
   `<script>`) + **README ditulis ulang** jadi panduan pakai lengkap (include CSS, JS bundel/per-file,
   tabel hook/event, theming 3-sumbu, integrasi Vue/React/Blazor, tier token, struktur repo).

**Sekarang: 30 komponen, 7 enhancer, `node --test` 6/6, `dist/` deterministik.** Komponen Foundation
praktis lengkap. **Cron loop kuhentikan** (tujuan tercapai — tak mau over-polish sia-sia dini hari).

**Opsional yang SENGAJA tak kukerjakan (keputusanmu):** blok "do/don't" usage Foundation, section
"Extending the system", dan "Reusable Claude design brief" — ini materi dokumentasi/meta, bukan
komponen. Kalau mau, jalankan `/loop` lagi atau bilang saja.

> Bagian di bawah ini adalah handoff v0.2/v0.3 sebelumnya — tetap berlaku.

---

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
- Komponen form bisnis: **input-group** (addon Rp/%/ikon, dengan state error), **chip**
  (removable), **accordion** (native `<details>`), **description-list** (key-value detail),
  **divider**, **kbd**.
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
