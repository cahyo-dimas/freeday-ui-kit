# Freeday — Status

Snapshot kondisi terkini repo. **Ini bukan changelog** — riwayat per-versi ada di
[`CHANGELOG.md`](CHANGELOG.md); sumber-kebenaran desain (nilai token, keputusan, roadmap)
ada di [`docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`](docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md).

## Di mana kita sekarang

**v1.5.0 — rilis lokal, belum di-push** (commit + tag `v1.5.0` di branch
`feat/react-vmodel-wrappers`; `main`/`origin` masih di `v1.4.1`, tree bersih di luar rilis ini).
Jalur rilis: … → v1.3.1 (buang rail "eyebrow") → v1.4.0 (motion pass + chart native parity + fix daterange) → v1.4.1 (dropdown lepas clipping card/scroll via Popover API: combo/datepicker/cascade/autocomplete/timepicker/menu, vanilla + Vue) → v1.5.0 (React adapter parity: FdyCombo/FdyDatepicker/FdyCfl/FdyChart + usePopover).

- **44 komponen** CSS (`src/components/*.css`)
- **22 enhancer** JS 0-dependency + bundel `dist/freeday.js` (`dist/*.js`, auto-init via `data-*`)
- **3 adapter framework** terbukti — Vue / React / Blazor (`adapters/`), tiap-tiap dengan
  contoh faktur nyata yang diverifikasi headless (`examples/{vue,react,blazor}-faktur/`)
- **Komponen Vue `v-model`** (v1.2) — `FdyCombo` / `FdyDatepicker` / `FdyCfl` (controlled async)
  via `freeday/vue`, di atas class CSS kit + kit error-state pass (`--error`/`[aria-invalid]`)
- **React kini punya parity dengan Vue** (v1.5) — komponen controlled typed `FdyCombo` /
  `FdyDatepicker` / `FdyCfl` / `FdyChart` + `usePopover` via `freeday/react`, di atas CSS kit yang
  sama (WAI-ARIA APG, dropdown top-layer lewat Popover API) — React tak lagi terbatas pada
  `useFreeday()` + event bubbling saja.
- **Kontras WCAG AA** ditegakkan sebagai regression test — `node --test` **9/9** hijau
- `dist/` di-commit & deterministik (rebuild = tanpa diff)

Definisi v1.0 terpenuhi: AA lolos audit · installable via git · ≥1 integrasi framework
terbukti · docs adopsi lengkap.

## Lihat hasilnya

- **Live:** [cahyo-dimas.github.io/freeday-ui-kit](https://cahyo-dimas.github.io/freeday-ui-kit/)
- **Lokal:** buka `docs/index.html` langsung di browser (font Google via internet; ada fallback)
- **Pakai di project:** `npm i github:cahyo-dimas/freeday-ui-kit#v1.5.0` — panduan di
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
