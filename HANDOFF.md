# Freeday — Handoff (cek pagi hari)

Ringkasan kerja otonom, sesuai izinmu. Semua **commit lokal** di branch
`feat/v0.2-rich-refinement`; milestone ditandai git tag. Sudah kupush ke GitHub sampai `v0.4`
(remote `main`); commit v0.5/v0.6 **belum dipush** — tinggal `git push` saat kamu siap.

## ⭐⭐ v0.5 + v0.6 — SELESAI (tag `v0.5` & `v0.6`) — komponen MudBlazor/PrimeVue
Loop 1-menit menambah komponen di luar Foundation, referensi MudBlazor & PrimeVue.

**v0.5 (tag `v0.5`) — 7 komponen yang kamu minta eksplisit:**
- **Badge overlay** (`fdb4ba8`) — angka / "99+" / ikon / dot menempel di sudut ikon/tombol/teks
  (persis screenshot yang kamu kirim). Lihat menu **"Badge"**.
- **Buttons** (`c583ee2`) — FAB (+extended/accent/danger), text+ikon, text-only, icon-only,
  button group. **Menu + split button** (`bad2ec0`). Lihat **"Tombol"** & **"Menu & split"**.
- **App bar** (`a12667c`), **Drawer** (`e45e5ce`, hamburger app bar membukanya),
  **Breakpoint provider** (`f3b14a9`), **Carousel** (`1643b35`), **Charts** (`46faa7a` —
  sparkline/bar/donut, tanpa dependency).

**v0.6 (tag `v0.6`) — "dan komponen lainnya" (pilihan berguna, YAGNI):**
- **Stepper/Wizard** (`9acc167`), **Timeline** (`731f93c`), **Slider** (`ea9f859`),
  **Rating** (`13a5bef`), **Tree view** (`876bf8b`), **Autocomplete** (`3c0bdb6`).

**Total sekarang: 41 komponen, 16 enhancer JS, 48 section docs.** `node --test` **6/6**,
`dist/` deterministik tiap commit, kontras **AA** dicek untuk tiap komponen berwarna (mis. badge
overlay: danger dibuat pakai `--color-danger-btn` biar lolos AA di dark). **Loop dihentikan** —
set komponen sudah wajar. Opsional yang sengaja tak kubuat (keputusanmu): dual-range slider,
role=tree penuh dgn navigasi panah, virtualisasi data-grid, timeline layout alternate.

> Bagian di bawah = handoff v0.4 (parity Foundation) & v0.2/v0.3 — tetap berlaku.

---

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
6. **Struktur project** (`02eb769`) — satu bundel `dist/freeday.js` (semua enhancer, cukup 1
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
  `freeday-select.js`, `freeday-tabs.js`, `freeday-table.js`, `freeday-toast.js`.
- **Docs jadi demo-site** (jawaban keluhan "polos banget").
- Token baru `--color-inverse-surface/-text` (tooltip & toast).

Sekarang Freeday punya **20+ komponen**, semua token-driven, 0 dependency runtime,
`node --test` 5/5, `dist/` deterministik (rebuild = tanpa diff).

## 3. Keputusan yang kuambil sendiri (kamu bilang percaya penuh)
- **Tetap 1 branch, tak merge/checkout** (batasanmu). Milestone ditandai `git tag v0.2` & `v0.3`.
- **Datepicker & data-grid virtualized → ditunda v0.4.** Kompleks & berisiko tanpa cek visual;
  aku fokuskan v0.3 ke yang paling dipakai layar bisnis + keluhanmu.
- Data table = enhancement client-side (cocok untuk demo/kit). Di app nyata, kelola data
  server/store-side; markup + kelas Freeday tetap dipakai.

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
   Docs sudah menyediakannya; ini kontrak yang didokumentasikan di header `freeday-table.js`.

## 5. Git & cara merge (saat kamu siap)
- Branch: `feat/v0.2-rich-refinement` (berisi v0.2 **dan** v0.3 — aku tak boleh pindah branch).
- Tags: `v0.2` (86d780d) dan `v0.3` (HEAD). Lihat riwayat: `git log --oneline v0.2..HEAD`.
- Merge (kamu yang lakukan, aku hindari checkout/merge):
  `git checkout main && git merge feat/v0.2-rich-refinement`
  (atau review commit dulu; tiap batch di-commit terpisah + di-review sebelum masuk).

## 6. Build & test
```bash
node tokens/build.mjs   # tokens.json -> dist/freeday.tokens.css + dist/freeday.css + copy dist/*.js
npm test                # node --test (5/5)
```

## 7. Lokasi
- `src/components/*.css` — komponen · `src/*.js` — enhancer opsional
- `dist/` — hasil build (di-commit): `*.css` + `*.js`
- `docs/index.html` — demo-site
- `docs/superpowers/plans/` — plan v0.1/v0.2/v0.3 · `docs/superpowers/specs/` — spec/blueprint
- `.superpowers/sdd/progress.md` — ledger progres (scratch)

Kalau ada yang kurang sreg (warna, jarak, komponen), tinggal bilang — tinggal iterasi.
