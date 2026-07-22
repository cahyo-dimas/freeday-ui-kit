# Changelog

Semua perubahan penting dicatat di sini. Format longgar mengikuti
[Keep a Changelog](https://keepachangelog.com/); tiap versi = git tag.

## [1.0.0] — 2026-07-22
Rilis **1.0 — project-ready**, sekaligus **rebrand ke Freeday**. Definisi v1.0 terpenuhi:
kontras WCAG AA lolos audit otomatis · installable via git · integrasi Vue/React/Blazor
terbukti di contoh faktur yang jalan · docs adopsi lengkap.
### Changed
- **Rebrand Foundry → Freeday.** Nama paket `freeday`; export
  `freeday/css | /vue | /react | /blazor | /tokens | /enhancers/*`; API JS
  `window.Freeday*` / `Freeday.toast()` / hook `useFreeday`; artefak dist `freeday.*` + `freeday-*.js`.
  Prefix kelas/token **`fdy-` dipertahankan** (backronym FreeDaY) sehingga markup konsumen
  **tidak** breaking. Repo: `github:cahyo-dimas/freeday-ui-kit`. Filosofi: *"lebih banyak free day
  buat dev karena UI kit-nya sudah siap pakai"*.
- Install: `npm i github:cahyo-dimas/freeday-ui-kit#v1.0.0`.
### Docs
- Root redirect `index.html` → `docs/` untuk GitHub Pages (URL bersih `/freeday-ui-kit/`).

## [0.9.6] — 2026-07-22
### Docs
- **Whole-app language toggle (ID ⇄ EN)** — the topbar toggle now switches the entire docs,
  not just the landing: topbar, sidebar labels + group headers, every section heading, and
  every description. Keyed by section id / nav href, round-trips cleanly. (In-demo sample
  labels stay as illustrative content.)
- **Proper state icons** — the empty / error state cards use duotone SVG icons instead of
  emoji (🗂️/⚠️).
- Hero CTA spacing loosened (removed a stale `.doc-hero p` rule that zeroed the gap).
### Changed
- **Icons stay single-tone** — reverted the date/time picker glyphs to minimalist single-tone
  (duotone is reserved for the larger illustrative icons — states — and the theme toggle).

## [0.9.5] — 2026-07-22
### Added
- **Two-tone (duotone) control icons** — the date/time picker triggers (and the datetime
  composer that reuses them) now render with a low-opacity fill behind the stroke, matching the
  sun/moon theme toggle. A coherent duotone treatment for the control-glyph family.
### Docs
- **Landing language toggle (ID ⇄ EN)** — a topbar button swaps the landing copy (hero, stats,
  framework-integration, footer) between Indonesian and English via `[data-i18n]`; inline
  markup (bold/code) is preserved. Version references synced to v0.9.5.

## [0.9.4] — 2026-07-22
### Added
- **Sidebar-menu component** — `.fdy-nav` (App shell) now supports per-node `.fdy-nav__icon`
  and `.fdy-nav__badge` (count), collapsible sections `.fdy-nav__group`/`.fdy-nav__grouplabel`,
  and nested items `.fdy-nav__tree` + `.fdy-nav__sub` (native `<details>`, zero-JS). Any node
  can be icon+text, text-only, or badged. New "Sidebar menu" docs section.
- **Responsive App shell** — on mobile (≤720px) the sidebar becomes an **off-canvas drawer**
  opened by the topbar toggle, with a `.fdy-app__backdrop`; on desktop the toggle collapses it.
### Changed
- **Brand ↔ topbar aligned** — `.fdy-app__brand` is now the same height as the topbar
  (`--space-16`) so the logo and page title sit on the same line. `.fdy-app__title` truncates
  instead of forcing overflow.
### Fixed
- **Awkward Indonesian copy** — dropzone “Jatuhkan …” → “Seret berkas ke sini …”.
### Docs
- Theme toggle is now a two-tone **sun/moon icon** button. Clearer **notification badge** demo
  (bell + count) explaining the overlay badge works on any element. Responsive fixes so nothing
  overflows down to 320px.

## [0.9.3] — 2026-07-22
### Added
- **Chart hover (Chart.js-style)** — bar & donut charts now show an interactive tooltip that
  follows the cursor (`label: value`, donut adds `(%)`). Bars dim while one is hovered (the
  hovered bar stays lit); donut gains a transparent SVG sector per slice that pops on hover.
### Changed
- **App shell**: the brand is now a fixed header (only the nav scrolls, so the logo never
  scrolls away). New `.fdy-app__navtoggle` (hamburger) + `.fdy-app--nav-collapsed` to
  collapse/hide the sidebar. Roomier `--space-8` main padding.
### Fixed
- **Anchor buttons underlined** — `.fdy-btn` now sets `text-decoration:none`, so links styled
  as buttons (e.g. hero CTAs) no longer show an underline.
### Docs
- Nav categories are collapsible `<details>` groups with chevrons (PrimeVue-style); more
  section whitespace; topbar hamburger to collapse the sidebar.

## [0.9.2] — 2026-07-22
### Fixed
- **Hover kontrol form tak terlihat** — sejak border resting jadi `--color-control-border`
  (slate-500) untuk a11y, hover yang menuju `--color-text-subtle` (juga slate-500) tak berubah.
  Semua kontrol (input, textarea, combo, cascade, time/date picker, input-group, dropzone) kini
  hover ke `--color-text-muted` (slate-600) → menggelap terlihat.
- **Split button rusak saat hover** — `translateY(-1px)` per-tombol mengangkat satu paruh saja
  sehingga jahitan tak sejajar. Kini `.fdy-btn-split` menjadi satu unit: tiap paruh tak
  mengangkat/berbayang sendiri; split terangkat & berbayang sebagai satu kesatuan, plus garis
  pemisah tipis antar paruh.

## [0.9.1] — 2026-07-22
### Added
- **Adapter React** (`freeday/react`) — hook `useFreeday(rootRef?)` yang meng-*hydrate* enhancer
  di subtree pada mount + tiap commit (idempotent). Tipe `event.detail` di
  `adapters/react/index.d.ts`. Contoh jalan `examples/react-faktur/` (Vite + React 19 + TS).
- **Interop Blazor** (`freeday/blazor`, `adapters/blazor/freeday-blazor.js`) — script klasik yang
  mendaftarkan `window.FreedayBlazor` dengan `initAll` / `on` / `off` / `toast` / `toggleTheme`.
  `on(el, event, dotNetRef, method)` meneruskan detail (JSON-safe) ke method `[JSInvokable]` C#.
  Contoh jalan `examples/blazor-faktur/` (Blazor WASM, .NET 10, code-behind `.razor` + `.razor.cs`).
- Ketiga adapter (Vue/React/Blazor) diverifikasi headless dengan layar faktur yang sama:
  hydrate markup framework, validasi men-gate submit, event → state framework, tema light/dark.
### Changed
- `package.json`: export `./react` + `./blazor`, `react` peerDependency opsional (`>=18`).
  `version` 0.9.0 → 0.9.1.

## [0.9.0] — 2026-07-22
### Added
- **Adapter Vue 3** (`freeday/vue`) — composable `useFreeday(rootRef?)` yang meng-*hydrate*
  semua enhancer di subtree komponen saat mount + tiap update (idempotent). Tipis: enhancer
  tetap sumber kebenaran, event `fdy-*` mengalir lewat `v-on` native. Tipe `event.detail`
  disertakan (`FdyCascadeChangeDetail`, dst) di `adapters/vue/index.d.ts`.
- **Contoh jalan** `examples/vue-faktur/` — layar faktur nyata (Vite + Vue 3 + TS) yang memakai
  form validation + mask + cascade + datepicker + combo + table via adapter. `npm install &&
  npm run dev`. Membuktikan kontrak integrasi end-to-end (diverifikasi headless: hydrate,
  validasi men-gate submit, event → state Vue, tema light/dark).
### Changed
- `package.json`: export `./vue`, `adapters/` masuk `files`, `vue` sebagai peerDependency
  opsional (`^3.4.0`). `version` 0.8.1 → 0.9.0.

## [0.8.1] — 2026-07-22
### Added
- **Form validation** (`freeday-form.js`, `[data-fdy-validate]`) — Constraint Validation
  API di-wire ke error inline aksesibel: `aria-invalid` + pesan ter-`aria-describedby`,
  fokus ke field invalid pertama saat submit, re-validasi live tiap blur/input. Pesan
  custom `data-fdy-msg-*`, cocok antar-field `data-fdy-match`. Event `fdy-form-invalid`/
  `fdy-form-valid`, `window.FreedayForm`.
- **Password reveal + input mask** (`freeday-mask.js`) — `[data-fdy-password]` tambah
  toggle tampil/sembunyi (memakai ulang chrome tombol input-group); `[data-fdy-mask]`
  format saat mengetik (`#` digit, `A` huruf, `*` alnum, sisanya literal), raw value di
  `dataset.fdyRaw` + event `fdy-mask`. `window.FreedayMask`.
- **Cascade select** (`cascade.css` + `freeday-cascade.js`, `[data-fdy-cascade]`) —
  pemilih hierarki drill-down dari `<ul>` bersarang; cabang membuka level berikut, daun
  memilih (nilai = jalur lengkap), back/crumb + keyboard penuh. Event `fdy-cascade-change`,
  `window.FreedayCascade`.
- **Chip choice/filter** (`chip.css` + `freeday-chip.js`) — chip interaktif
  (`fdy-chip--choice` / `fdy-chip--filter`, `<button aria-pressed>`) dalam grup
  `[data-fdy-chips]` (`data-single` = pilih-satu), plus wiring hapus untuk
  `.fdy-chip__remove`. Event `fdy-chip-change` / `fdy-chip-remove`, `window.FreedayChip`.
### Changed
- `.fdy-input`/`.fdy-textarea` kini juga menampilkan border error lewat
  `aria-invalid="true"` (bukan cuma kelas `--error`), jadi enhancer cukup toggle satu
  atribut aksesibel.

## [0.8.0] — 2026-07-22
### Added
- **Installable sebagai paket GitHub.** `npm i github:cahyo-dimas/freeday-ui-kit#v0.8.0`.
  `package.json` kini punya `exports`, `files`, `sideEffects`. Jalur import:
  `freeday/css` (token+komponen), `freeday` (semua enhancer), `freeday/tokens`,
  `freeday/css/components`, `freeday/enhancers/<nama>`.
- `dist/freeday.bundle.css` — token + komponen dalam satu file (satu import, anti-footgun
  "lupa token").
- Skrip rilis: lifecycle `version` build-ulang + `git add dist`; `prepack` build-ulang.
### Changed
- `version` 0.1.0 → 0.8.0 (mulai semver bersih; komponen baru berikutnya = rilis minor 0.8.x).

## [0.7.0] — 2026-07-22
### Added
- **Time picker** (`freeday-timepicker.js`, `[data-fdy-timepicker]`) — trigger + popup daftar
  waktu (listbox WAI-ARIA), 24 jam, `data-step`/`data-min`/`data-max`, keyboard penuh.
- **Datetime picker** (`freeday-datetime.js`, `[data-fdy-datetimepicker]`) — komposisi date +
  time, satu event `fdy-datetime-change` (`YYYY-MM-DDTHH:MM`).
- **Konvensi varian ikon**: `data-fdy-no-icon` / `<template data-fdy-icon>` di date/time/datetime
  picker; `fdy-combo--no-icon` + `.fdy-combo__icon` di select; contoh ikon depan di input-group.
- Test regresi kontras WCAG (`test/contrast.test.mjs`) — audit graf token (light + dark),
  composite fill `-soft`, tegakkan 4.5:1 teks / 3:1 batas kontrol.
### Fixed
- **A11y (WCAG 1.4.11 & AA):** border kontrol form 1.55:1 → token `--color-control-border`
  (≥3:1); badge danger/info gelap di surface-3 → ramp baru red-300/blue-300; `text-subtle`
  sebagai teks nyata (header hari kalender, timestamp) → `text-muted`.
- **App-shell scroll:** header sticky via natural-scroll (sidebar + topbar `position:sticky`),
  mengganti pendekatan `--fill` yang menyisakan area putih saat scroll ke bawah.
- **Cross-browser:** `-webkit-backdrop-filter` untuk Safari; floor browser didokumentasikan
  (`color-mix()` → Chrome 111 / Safari 16.4 / Firefox 113).

## [0.6.0] dan sebelumnya
Lihat git tag `v0.2`…`v0.6`. Ringkas: pipeline token (`tokens.json` → CSS) + theming 3-sumbu,
app-shell/table/modal, 40+ komponen (form, feedback, navigasi, data, chart), enhancer JS
0-dependency, docs demo-site.
