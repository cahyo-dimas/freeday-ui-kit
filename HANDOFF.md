# Freeday — Status

Snapshot kondisi terkini repo. **Ini bukan changelog** — riwayat per-versi ada di
[`CHANGELOG.md`](CHANGELOG.md); sumber-kebenaran desain (nilai token, keputusan, roadmap)
ada di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

## Di mana kita sekarang

**v1.9.0 — sudah di-release & di-push** (`main` = `origin/main` = tag `v1.9.0`). Terbit di npm
publik sebagai `@cahyo-dimas/freeday`. (1.9.0 = follow-up `FdyTable` dari notes #25/#26: **#25**
melonggarkan generic row ke `extends object` supaya DTO ber-`interface` bisa dipakai — sebelumnya
`Record<string, unknown>` menolaknya, `FdyTable` tak bisa dipakai di app strict-TS; **#26** aktivasi
baris opt-in `rowActivatable` + `row-activate`/`onRowActivate` + `rowClass` + `.fdy-table__row--activatable`.
Aditif — melebarkan bound generic, tak memecah call site lama.) Sebelumnya 1.8.0 = `FdyTable` +
`FdyModal`/`FdyDrawer` + `.fdy-mono` (notes #22/#23/#24).
Jalur rilis: … → v1.3.1 (buang rail "eyebrow") → v1.4.0 (motion pass + chart native parity + fix daterange) → v1.4.1 (dropdown lepas clipping card/scroll via Popover API: combo/datepicker/cascade/autocomplete/timepicker/menu, vanilla + Vue) → v1.5.0 (React adapter parity: FdyCombo/FdyDatepicker/FdyCfl/FdyChart + usePopover) → v1.6.0 (wrapper input ekstra Vue+React: FdyDateRange/FdyAutocomplete/FdyCascade; layout primitive `.fdy-filterbar`) → v1.6.1 (fix: `freeday-select.js` — memilih opsi combo dengan **mouse** tak berfungsi; menekan opsi mem-blur tombol → `focusout` menutup listbox sebelum klik mendarat. `preventDefault` pada mousedown listbox menjaga fokus) → v1.6.2 (lisensi **MIT** + file `LICENSE`; tak ada perubahan kode) → v1.7.0 (tree checkbox cascading `freeday-tree.js` + `.fdy-tree--checkbox`; layout `.fdy-form-grid`; file-upload melebar `.fdy-dropzone--row`/`.fdy-filelist--grid`; tiga section docs full-width) → v1.7.1 (docs English-first + `README.id.md`; kode identik 1.7.0) → v1.8.0 (`FdyTable` controlled Vue+React + core `adapters/core/table-model.js`; `FdyModal`/`FdyDrawer` controlled Vue+React; utilitas `.fdy-mono`; `.fdy-drawer__footer`) → v1.9.0 (`FdyTable` #25 generic `extends object` untuk row ber-`interface` + #26 aktivasi baris `rowActivatable`/`row-activate`/`rowClass` + `.fdy-table__row--activatable`).

- **46 komponen** CSS (`src/components/*.css`) — termasuk `.fdy-filterbar` (baris filter) & `.fdy-form-grid` (grid header/dokumen)
- **23 enhancer** JS 0-dependency + bundel `dist/freeday.js` (`dist/*.js`, auto-init via `data-*`) — termasuk `freeday-tree.js` (cascade tree checkbox)
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
- **Kontras WCAG AA** ditegakkan sebagai regression test — `node --test` **9/9** hijau
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
npm test                # node --test (9/9)
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
**diputuskan (npm publik ber-scope `@cahyo-dimas/freeday`)** dengan plumbing sudah di working tree.
Sisa satu-satunya = **eksekusi rilis npm** (outward-facing) — runbook lengkap di `NEXT-UP.md` item 3.

Cakupan komponen praktis lengkap. Sisa spec §7 — **data grid virtualisasi, form master-detail /
2-kolom** — sengaja ditunda: dibuat hanya saat project nyata membutuhkannya (filter-bar sudah
mendarat di v1.6.0). Design system tak pernah "selesai", dia ber-versi.
