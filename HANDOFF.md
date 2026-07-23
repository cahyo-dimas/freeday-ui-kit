# Freeday — Status

Snapshot kondisi terkini repo. **Ini bukan changelog** — riwayat per-versi ada di
[`CHANGELOG.md`](CHANGELOG.md); sumber-kebenaran desain (nilai token, keputusan, roadmap)
ada di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

## Di mana kita sekarang

**v1.2.2 — sudah di-release & di-push** (`main` = `origin/main` = tag `v1.2.2`, tree bersih).
Jalur rilis: v1.0.0 → v1.1.0 → v1.2.0 (Vue wrappers) → v1.2.1 (input-group fix) → v1.2.2 (brand link-safe + active/selected indikator teal→primary).

- **44 komponen** CSS (`src/components/*.css`)
- **22 enhancer** JS 0-dependency + bundel `dist/freeday.js` (`dist/*.js`, auto-init via `data-*`)
- **3 adapter framework** terbukti — Vue / React / Blazor (`adapters/`), tiap-tiap dengan
  contoh faktur nyata yang diverifikasi headless (`examples/{vue,react,blazor}-faktur/`)
- **Komponen Vue `v-model`** (v1.2) — `FdyCombo` / `FdyDatepicker` / `FdyCfl` (controlled async)
  via `freeday/vue`, di atas class CSS kit + kit error-state pass (`--error`/`[aria-invalid]`)
- **Kontras WCAG AA** ditegakkan sebagai regression test — `node --test` **9/9** hijau
- `dist/` di-commit & deterministik (rebuild = tanpa diff)

Definisi v1.0 terpenuhi: AA lolos audit · installable via git · ≥1 integrasi framework
terbukti · docs adopsi lengkap.

## Lihat hasilnya

- **Live:** [cahyo-dimas.github.io/freeday-ui-kit](https://cahyo-dimas.github.io/freeday-ui-kit/)
- **Lokal:** buka `docs/index.html` langsung di browser (font Google via internet; ada fallback)
- **Pakai di project:** `npm i github:cahyo-dimas/freeday-ui-kit#v1.2.2` — panduan di
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

## Selanjutnya (YAGNI)

Cakupan komponen praktis lengkap. Sisa spec §7 — **data grid virtualisasi, filter-bar, form
master-detail / 2-kolom** — sengaja ditunda: dibuat hanya saat project nyata membutuhkannya.
Design system tak pernah "selesai", dia ber-versi.
