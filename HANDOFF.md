# Freeday — Status

Snapshot kondisi terkini repo. **Ini bukan changelog** — riwayat per-versi ada di
[`CHANGELOG.md`](CHANGELOG.md); sumber-kebenaran desain (nilai token, keputusan, roadmap)
ada di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

## Di mana kita sekarang

**v1.14.0 — sudah di-release & di-push** (`main` = `origin/main` = tag `v1.14.0`). Terbit di npm publik
sebagai `@cahyo-dimas/freeday`. (1.14.0 = cakupan STATE komponen, aditif/MINOR: **readonly** — rule
`[readonly]` input/textarea (full-contrast di surface muted, beda dari `:disabled` yang dim) + prop
`readonly` di 6 adapter select-type (Combo/Cascade/Datepicker/DateRange/Autocomplete/Cfl × Vue+React;
tetap fokusabel + `aria-readonly`, tak bisa buka/ubah) — note #39. **disabled** ditambah ke timepicker/
rating/tree/tabs/file-upload/datepicker; **invalid** ke rating. Composer **datetime** meneruskan
`data-fdy-disabled`/`data-fdy-invalid` ke KEDUA anak (pakai `setTimeout(0)`, bukan microtask — microtask
drain di antara listener DOMContentLoaded, sebelum enhancer timepicker jalan). Diverifikasi browser.
Sebelumnya 1.13.1 = fix note #38: `FdyCombo` mouse-select (`@mousedown.prevent` di opsi supaya `@focusout`
tak menutup list sebelum klik mendarat; dua adapter). Sebelumnya 1.13.0 = note #37 pada `FdyDatepicker` Vue+React:
**A** prop `clearable` → tombol × di trigger meng-emit `''` untuk mengosongkan tanggal opsional; **B**
label nav bulan bisa di-override (`prevMonthLabel`/`nextMonthLabel` + `clearLabel`) & default UI string
kini **Inggris** (selaras docs English-first) — enhancer vanilla tetap Indonesia.
Sebelumnya 1.12.0 = note #36 aditif: `data-fdy-colors` & `<FdyChart colors>` kini bisa menamai slot palet
kategorikal `chart-1..8` (→ `var(--chart-N)`), bukan hanya token semantik — `colorVar` memetakan nama
`chart-N`. Backward-compatible; diverifikasi browser. Sebelumnya 1.11.2 = fix-only note #35: `.fdy-filterbar` (align-items:flex-end)
& `.fdy-table-toolbar` (align-items:center) sama-sama single-class → saat digabung di satu elemen yang
belakangan di bundle (toolbar) menang → kontrol ter-center, actions ngambang. Ditambah rule 2-kelas
`.fdy-table-toolbar.fdy-filterbar{align-items:flex-end}` (0,2,0) — aditif, cuma kena elemen dgn kedua kelas.
Diverifikasi browser: composed bar satu baseline.) Sebelumnya: 1.11.1 = fix note #34 (`.fdy-modal`
flex-column — body scroll, footer tak ke-clip); 1.11.0 = notes #31–#33, aditif/korektif: **#31**
`.fdy-badge` + `white-space:nowrap` (badge dua kata tak lagi mbungkus/rusak pill); **#33** donut
hormati `data-fdy-legend="none"` (dulu selalu render legend); **#32** modifier opt-in
`.fdy-filterbar--actions-inline` + dokumentasi wrap — **proposal margin note #32 diuji di browser & TAK
bekerja** (margin tak mengubah flex line-breaking), jadi cuma modifier + doc yang diambil.) Sebelumnya:
1.10.0 = notes #27–#30 (fieldset reset · `--w-2xl` · fix label chart · `FdyTable` detail rows); 1.9.0 =
`FdyTable` #25/#26; 1.8.0 = `FdyTable` + `FdyModal`/`FdyDrawer` + `.fdy-mono`.
Jalur rilis: … → v1.3.1 (buang rail "eyebrow") → v1.4.0 (motion pass + chart native parity + fix daterange) → v1.4.1 (dropdown lepas clipping card/scroll via Popover API: combo/datepicker/cascade/autocomplete/timepicker/menu, vanilla + Vue) → v1.5.0 (React adapter parity: FdyCombo/FdyDatepicker/FdyCfl/FdyChart + usePopover) → v1.6.0 (wrapper input ekstra Vue+React: FdyDateRange/FdyAutocomplete/FdyCascade; layout primitive `.fdy-filterbar`) → v1.6.1 (fix: `freeday-select.js` — memilih opsi combo dengan **mouse** tak berfungsi; menekan opsi mem-blur tombol → `focusout` menutup listbox sebelum klik mendarat. `preventDefault` pada mousedown listbox menjaga fokus) → v1.6.2 (lisensi **MIT** + file `LICENSE`; tak ada perubahan kode) → v1.7.0 (tree checkbox cascading `freeday-tree.js` + `.fdy-tree--checkbox`; layout `.fdy-form-grid`; file-upload melebar `.fdy-dropzone--row`/`.fdy-filelist--grid`; tiga section docs full-width) → v1.7.1 (docs English-first + `README.id.md`; kode identik 1.7.0) → v1.8.0 (`FdyTable` controlled Vue+React + core `adapters/core/table-model.js`; `FdyModal`/`FdyDrawer` controlled Vue+React; utilitas `.fdy-mono`; `.fdy-drawer__footer`) → v1.9.0 (`FdyTable` #25 generic `extends object` untuk row ber-`interface` + #26 aktivasi baris `rowActivatable`/`row-activate`/`rowClass` + `.fdy-table__row--activatable`) → v1.10.0 (#27 reset `fieldset.fdy-field` · #28 `.fdy-field--w-2xl` + min-width picker daterange · #29 fix tabrakan label sumbu-x chart · #30 `FdyTable` baris detail expandable `row-detail`/`expandedKeys`) → v1.11.0 (#31 `.fdy-badge` nowrap · #32 modifier `.fdy-filterbar--actions-inline` + doc wrap · #33 donut hormati `legend="none"`) → v1.11.1 (#34 `.fdy-modal` flex column — body scroll, footer tak ke-clip) → v1.11.2 (#35 `.fdy-table-toolbar.fdy-filterbar` align-items:flex-end — komposisi toolbar+filterbar satu baseline) → v1.12.0 (#36 override warna chart bisa menunjuk slot palet kategorikal `chart-1..8` → `var(--chart-N)`) → v1.13.0 (#37 `FdyDatepicker` prop `clearable` × + label nav bulan overridable + default UI string English) → v1.13.1 (#38 fix `FdyCombo` mouse-select: `@mousedown.prevent` di opsi supaya `@focusout` tak menutup list sebelum klik mendarat) → v1.14.0 (#39 + cakupan state: `readonly` input + 6 adapter select-type, disabled/invalid ke komponen yang bolong, datetime propagasi state ke 2 anak).

- **46 komponen** CSS (`src/components/*.css`) — termasuk `.fdy-filterbar` (baris filter) & `.fdy-form-grid` (grid header/dokumen)
- **24 enhancer** JS 0-dependency + bundel `dist/freeday.js` (`dist/*.js`, auto-init via `data-*`) — termasuk `freeday-tree.js` (cascade tree checkbox)
- **3 adapter framework** terbukti — Vue / React / Blazor (`adapters/`), tiap-tiap dengan
  contoh faktur nyata yang diverifikasi headless (`examples/{vue,react,blazor}-faktur/`)
- **Komponen framework Vue + React — simetris penuh** (v1.2 → v1.8): sepuluh komponen controlled
  typed di **kedua** adapter — `FdyCombo` · `FdyDatepicker` · `FdyDateRange` · `FdyAutocomplete` ·
  `FdyCascade` · `FdyCfl` (async terkontrol) · `FdyChart` · `FdyTable` (sort/filter/paginate,
  client atau server) · `FdyModal` · `FdyDrawer` — plus `usePopover` dan core tabel
  framework-agnostik `adapters/core/table-model.js`, semuanya di atas class CSS kit yang sama
  (WAI-ARIA APG, dropdown/popover top-layer lewat Popover API). Vue lewat
  `freeday/vue` (`v-model`), React lewat `freeday/react` (`value`/`onChange`). Tak ada lagi
  jembatan event manual untuk kontrol-kontrol ini.
- **Kontras WCAG AA** ditegakkan sebagai regression test — `node --test` **20/20** hijau
- `dist/` di-commit & deterministik (rebuild = tanpa diff)

Definisi v1.0 terpenuhi: AA lolos audit · installable via git · ≥1 integrasi framework
terbukti · docs adopsi lengkap.

## Lihat hasilnya

- **Live:** [cahyo-dimas.github.io/freeday-ui-kit](https://cahyo-dimas.github.io/freeday-ui-kit/)
- **Lokal:** buka `docs/index.html` langsung di browser (font Google via internet; ada fallback)
- **Pakai di project:** `npm i @cahyo-dimas/freeday` — panduan di
  [`README.md`](README.md) & [`docs/getting-started.md`](docs/getting-started.md)

## Build & test

```bash
node tokens/build.mjs   # tokens.json -> dist/freeday.tokens.css + freeday.css + copy dist/*.js
npm test                # node --test (20/20) — default gate, no browser
npm run test:browser    # real-Chrome interaction guards (focus/blur/pointer) — dev-only, auto-skips without Chrome. See browser/README.md
```

## Lokasi

- `tokens/tokens.json` · `tokens/build.mjs` — pipeline token (Tier-1/2/3)
- `src/components/*.css` — komponen · `dist/` — hasil build (di-commit): `*.css` + `*.js`
- `adapters/{vue,react,blazor}/` — integrasi framework · `examples/*-faktur/` — bukti pakai
- `docs/index.html` — demo-site · `docs/getting-started.md` · `docs/integrations.md`
- `docs/superpowers/specs/` — spec/blueprint (sumber-kebenaran desain). Plan v0.1–v0.3
  historis diarsipkan di git tag `v0.2`/`v0.3`, tak lagi di working tree.

## Selanjutnya

Backlog aktif + titik lanjut ada di **[`NEXT-UP.md`](NEXT-UP.md)** — buka itu dulu kalau mau
nerusin. Ringkasnya: **tak ada yang mendesak**. Ketiga item lama sudah ditangani (2026-07-27):
kontras AA soft-badge **ternyata sudah tertutup sejak v0.2** (cuma prosa spec §12 yang basi,
sudah di-truth-up) · review independen v1.6.0 **selesai, tak ada bug korektnes** · distribusi #8
**diputuskan & terbit (npm publik ber-scope `@cahyo-dimas/freeday`)**. Rilis kini **otomatis
via OIDC** (GitHub Actions, tanpa token/OTP) tiap tag `v*` — sudah jalan untuk v1.8.0–v1.11.2.
Runbook rilis tetap di `NEXT-UP.md` item 3.

Cakupan komponen praktis lengkap. Sisa spec §7 — **data grid virtualisasi, form master-detail /
2-kolom** — sengaja ditunda: dibuat hanya saat project nyata membutuhkannya (filter-bar sudah
mendarat di v1.6.0). Design system tak pernah "selesai", dia ber-versi.
