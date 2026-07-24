# Freeday — Status

Snapshot kondisi terkini repo. **Ini bukan changelog** — riwayat per-versi ada di
[`CHANGELOG.md`](CHANGELOG.md); sumber-kebenaran desain (nilai token, keputusan, roadmap)
ada di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

## Di mana kita sekarang

**v1.6.1 — sudah di-release & di-push** (`main` = `origin/main` = tag `v1.6.1`, tree bersih).
Jalur rilis: … → v1.3.1 (buang rail "eyebrow") → v1.4.0 (motion pass + chart native parity + fix daterange) → v1.4.1 (dropdown lepas clipping card/scroll via Popover API: combo/datepicker/cascade/autocomplete/timepicker/menu, vanilla + Vue) → v1.5.0 (React adapter parity: FdyCombo/FdyDatepicker/FdyCfl/FdyChart + usePopover) → v1.6.0 (wrapper input ekstra Vue+React: FdyDateRange/FdyAutocomplete/FdyCascade; layout primitive `.fdy-filterbar`) → v1.6.1 (fix: `freeday-select.js` — memilih opsi combo dengan **mouse** tak berfungsi; menekan opsi mem-blur tombol → `focusout` menutup listbox sebelum klik mendarat. `preventDefault` pada mousedown listbox menjaga fokus).

- **45 komponen** CSS (`src/components/*.css`) — termasuk `.fdy-filterbar` (baris filter konsisten)
- **22 enhancer** JS 0-dependency + bundel `dist/freeday.js` (`dist/*.js`, auto-init via `data-*`)
- **3 adapter framework** terbukti — Vue / React / Blazor (`adapters/`), tiap-tiap dengan
  contoh faktur nyata yang diverifikasi headless (`examples/{vue,react,blazor}-faktur/`)
- **Komponen framework Vue + React — simetris penuh** (v1.2 → v1.6): tujuh komponen controlled
  typed di **kedua** adapter — `FdyCombo` · `FdyDatepicker` · `FdyDateRange` · `FdyAutocomplete` ·
  `FdyCascade` · `FdyCfl` (async terkontrol) · `FdyChart` — plus `usePopover`, semuanya di atas
  class CSS kit yang sama (WAI-ARIA APG, dropdown top-layer lewat Popover API). Vue lewat
  `freeday/vue` (`v-model`), React lewat `freeday/react` (`value`/`onChange`). Tak ada lagi
  jembatan event manual untuk kontrol-kontrol ini.
- **Kontras WCAG AA** ditegakkan sebagai regression test — `node --test` **9/9** hijau
- `dist/` di-commit & deterministik (rebuild = tanpa diff)

Definisi v1.0 terpenuhi: AA lolos audit · installable via git · ≥1 integrasi framework
terbukti · docs adopsi lengkap.

## Lihat hasilnya

- **Live:** [cahyo-dimas.github.io/freeday-ui-kit](https://cahyo-dimas.github.io/freeday-ui-kit/)
- **Lokal:** buka `docs/index.html` langsung di browser (font Google via internet; ada fallback)
- **Pakai di project:** `npm i github:cahyo-dimas/freeday-ui-kit#v1.6.1` — panduan di
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
nerusin. Ringkasnya: **tak ada yang mendesak**. Tiga item tersisa (kontras AA soft-badge §13,
review independen kode v1.6.0, distribusi registry-friendly #8), semuanya bisa ditunda dan dua
di antaranya menunggu keputusan, bukan koding.

Cakupan komponen praktis lengkap. Sisa spec §7 — **data grid virtualisasi, form master-detail /
2-kolom** — sengaja ditunda: dibuat hanya saat project nyata membutuhkannya (filter-bar sudah
mendarat di v1.6.0). Design system tak pernah "selesai", dia ber-versi.
