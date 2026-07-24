# Changelog

Semua perubahan penting dicatat di sini. Format longgar mengikuti
[Keep a Changelog](https://keepachangelog.com/); tiap versi = git tag.

## [1.5.0] — 2026-07-24
Rilis **1.5 — React adapter parity**. Non-breaking, aditif.
### Added
- **React adapter parity** — komponen controlled typed `FdyCombo` / `FdyDatepicker` / `FdyCfl` /
  `FdyChart` + `usePopover`, di atas CSS kit yang sama (aksesibilitas WAI-ARIA APG, dropdown
  top-layer lewat Popover API). Aplikasi React tak lagi butuh fallback `<select>`/`<input
  type="date">` native. Dikonsumsi lewat `freeday/react`; Vite men-transpile source component
  langsung tanpa config tambahan, konsumen Next.js mungkin butuh
  `transpilePackages: ['freeday']`.

## [1.4.1] — 2026-07-23
Rilis **1.4.1 — patch**. Dropdown tak lagi ter-clip di dalam card / scroll container.
### Fixed
- **Dropdown lepas dari clipping ancestor** (`.fdy-card{overflow:hidden}`, scroll container, atau
  ancestor ber-`transform`). Semua dropdown `position:absolute` — **combo/select, datepicker,
  cascade, autocomplete, timepicker, menu** — kini di-render di **top layer** lewat native
  **Popover API** (`popover="manual"`) dan diposisikan `fixed` ke trigger (flip ke atas bila
  sempit di bawah, lebar mengikuti trigger, reposisi saat scroll/resize). Panel tetap DOM child
  komponennya, jadi focus, outside-click, dan ARIA tak berubah. Berlaku untuk enhancer vanilla
  **dan** komponen Vue `FdyCombo`/`FdyDatepicker`. `FdyCfl` sudah aman (berbasis `<dialog>`).
  Degradasi mulus ke perilaku lama pada browser tanpa Popover API. Non-breaking, tanpa perubahan API.
### Internal
- Helper baru `src/freeday-popover.js` (`window.FreedayPopover`) + composable `usePopover` di
  `freeday/vue` (internal, tak diekspor). Panel dropdown kini set `color:var(--color-text)` eksplisit
  (UA `[popover]` default-nya `CanvasText`).

## [1.4.0] — 2026-07-23
Rilis **1.4 — motion & native charts**. Dua fitur besar (gerak enter/exit lintas komponen +
chart native yang cukup untuk mem-pensiun-kan Chart.js) plus satu fix layout. Non-breaking.

### Added
- **Chart native — parity untuk drop Chart.js.** Tipe baru **`line`** & **`area`** dan **`bar`
  multi-seri + `data-fdy-stacked`**, semuanya dengan **sumbu ber-tema** (y-gridline + tick,
  x-label autoskip, baseline nol) dari `--chart-grid`/`--chart-tick`. Data multi-seri lewat
  **`data-series`** (JSON `[{label,values}]`); `data-values` tetap jadi shortcut seri-tunggal.
  **`data-fdy-format="number|percent|currency"`** memformat tick + tooltip; **legenda otomatis**
  untuk ≥2 seri (`data-fdy-legend="auto|always|none"`); hover band per-kategori. Warna dari token
  → **chart re-warna otomatis saat `data-theme` berubah** (tak perlu observer/re-paint kanvas).
- **`FreedayChart.update(el)`** — render ulang idempoten saat data berubah (auto-init tetap sekali).
- **`freeday/vue` → `<FdyChart>`** — wrapper reaktif & typed di atas renderer (re-render on prop
  change): `type` · `series`/`values` · `labels` · `format` · `stacked` · `legend` · `colors`/`color`
  · `center`; `aria-label` fallthrough. Tipe `FdyChartSeries` diekspor. Diverifikasi `vue-tsc` + `vite build`.

### Changed
- **Motion pass — gerak yang bermakna, semua hormati `prefers-reduced-motion`.**
  - **Drawer & Modal** kini beranimasi **masuk _dan_ keluar** (slide / fade-scale + backdrop blur)
    via `@starting-style` + `allow-discrete` pada `<dialog>` native — sebelumnya hanya masuk.
  - **Sidebar app-shell** collapse/expand desktop kini **meluncur** (animasi `width`) — sebelumnya
    `display:none` (snap). Mobile (off-canvas) tak berubah.
  - **Accordion** & **Tabs** me-reveal konten (fade + rise) saat dibuka/diganti.
  - **Baris tabel** transisi `background` halus saat hover.
- **`.fdy-daterange` responsif** — dua picker kini boleh menyusut (`min-width:0`) & wrap, jadi tak
  lagi overflow di row/HP < ~23rem; di lebar cukup tetap hug ~23rem seperti sebelumnya.

### Migrasi konsumen (opsional, aman)
1. Bump pin: `npm i github:cahyo-dimas/freeday-ui-kit#v1.4.0`, lalu rebuild.
2. **Motion & daterange:** otomatis, tanpa perubahan kode.
3. **Drop Chart.js (opsional):** ganti wrapper chart lokal dengan `<FdyChart type="line" :series>`
   (atau bentuk `data-fdy-chart`), hapus folder wrapper chart lokal, dan buang `chart.js` dari
   `package.json`. Machinery tema chart (probe warna + observer) tak lagi perlu — token yang urus.

## [1.3.1] — 2026-07-23
Rilis **1.3.1 — patch**. Buang rail aksen "eyebrow" di state aktif/terpilih.
### Removed
- **Rail aksen 3px pada state aktif/terpilih** (`box-shadow:inset 3px 0 0 var(--color-primary)`)
  dihapus dari nav app-shell (`[aria-current="page"]`), opsi cascade & autocomplete
  (`[aria-selected="true"]`), dan baris tabel terpilih. State terpilih tetap jelas & aksesibel
  lewat background `--color-primary-soft` + teks `--color-primary-strong` + semibold (tabel:
  soft-bg satu baris penuh). Murni visual, non-breaking; kontras tetap **9/9**.
### Kept
- Indikator fungsional yang **beda motif** sengaja dipertahankan: rail fokus keyboard CFL
  (`:focus-visible`, wajib a11y — pembeda fokus vs terpilih), underline tab aktif, checkmark
  combo, ring highlight combo.

## [1.3.0] — 2026-07-23
Rilis **1.3 — accent Azure**. Warna sekunder/aksen berubah dari **teal → biru Microsoft Azure**.
### Changed
- **Accent: teal → sky / Azure blue** — `--color-accent` kini `#0078d4` (light) / `#47a1e6` (dark),
  menggantikan teal `#0d9488`. Ramp primitif `teal` diganti `sky` (biru Azure muda);
  `--color-accent-hover` & `--color-on-accent` ikut disesuaikan (on-accent dark `#06233f` agar
  kontras di atas accent biru-muda dark). Semua konsumen `--color-accent` ikut otomatis: varian
  opt-in `.fdy-fab--accent`/`.fdy-slider--accent`/`.fdy-badge-ov--accent`, chrome docs, swatch
  identitas. Identitas kit kini **Azure** (primary biru-deep + accent biru-muda) — teal dibuang.
  Kontras WCAG tetap **9/9** (accent/surface + on-accent/accent lolos light & dark). Non-breaking
  (nilai token berubah; nama token/kelas/API tetap).

## [1.2.2] — 2026-07-23
Rilis **1.2.2 — patch**. Polish app-shell + koreksi warna indikator aktif/terpilih.
### Fixed
- **Brand link-safe (#17)** — `.fdy-app__brand` kini set `text-decoration:none`; saat brand
  dijadikan link "logo → home", judul/subjudul tak lagi ber-underline default browser.
- **Indikator aktif/terpilih: teal → primary (#18 + extend)** — bar/underline/check pada state
  aktif/terpilih sebelumnya pakai `--color-accent` (teal), yang **clash** dengan bg
  `--color-primary-soft` + teks `--color-primary-strong` pada palet re-theme (accent ≠ primary).
  Kini semua cue "you-are-here / terpilih" seragam di keluarga **primary**: item nav, underline
  tab, rail baris tabel, opsi combo/cascade/autocomplete. Varian aksen opt-in
  (`.fdy-fab--accent`, `.fdy-badge-ov--accent`, `.fdy-slider--accent`) tak berubah. Membalik
  bagian "teal sebagai aksen fungsional" dari v1.1.0. Murni CSS, backward-compatible.

## [1.2.1] — 2026-07-23
Rilis **1.2.1 — patch**. Perbaikan CSS ikon depan `.fdy-input-group`.
### Fixed
- **Ikon depan input-group tak ke-center + gap** — `.fdy-input-group__addon--icon` dipakai
  standalone tapi tak set `display`/`align-items`, jadi `<svg>`-nya nempel ke atas kotak flex
  yang ter-stretch (ikon melayang tinggi); dan padding-kiri ikon menumpuk dengan padding-kiri
  `.fdy-input` → gap lebar. Kini `--icon` self-contained (`inline-flex` + center, meniru
  `.fdy-input-group__btn`) dan `.fdy-input` setelah ikon memangkas padding-kirinya. Murni CSS,
  backward-compatible. Kena semua field search/find (topbar search, filter tabel, dialog CFL, dst).

## [1.2.0] — 2026-07-23
Rilis **1.2 — Vue input wrappers (native reimpl)**. Komponen Vue idiomatik dengan `v-model`
nyata di atas class CSS kit, supaya form Vue tak perlu fallback ke `<select>`/`<input type=date>`
native. **Non-breaking**: murni tambahan (file `.vue` + export baru); enhancer, `useFreeday`,
dan semua class/token lama tak berubah. `vue` tetap peerDependency opsional.
### Added
- **`FdyCombo`** (`import { FdyCombo } from 'freeday/vue'`) — combobox select-only WAI-ARIA APG
  dengan `v-model` (generic `T extends string`), keyboard penuh (↑↓/Home/End/Enter/Esc/typeahead)
  + outside-click; props `options`/`placeholder`/`disabled`/`invalid`/`describedby`/`ariaLabelledby`.
- **`FdyDatepicker`** — kalender native di atas `datepicker.css`; `v-model` string ISO
  `YYYY-MM-DD`, `min`/`max`, `locale` (Intl), keyboard grid penuh, `invalid`/`ariaLabelledby`.
- **`FdyCfl`** — choose-from-list **controlled + async**: `v-model:Row|null` +
  `fetchPage(query,page) => Promise<{rows,hasMore}>`, `columns`/`display`/`rowKey`. `<dialog>`
  native, search debounced, state loading/empty/error(+retry), pagination append, cache opsional,
  guard respons out-of-order. Ini kontrak integrasi field lookup (map nilai → master data server).
- **Error-state kit** — varian `--error`/`[aria-invalid]` ditambah ke `combo`/`cascade`/
  `datepicker`/`timepicker`, dan `input-group :has()` diperluas menangkap error kontrol — jadi
  validasi vanilla (`freeday-form`) **dan** prop `invalid` wrapper Vue sama-sama ber-styling.
  (Field CFL = `.fdy-input`+input-group, jadi error-nya via `aria-invalid` pada input, bukan
  kelas `.fdy-cfl--error`.)
### Notes
- Komponen Vue di-ship sebagai `.vue` mentah (bundler konsumen yang meng-compile); type-check
  butuh `vue-tsc`/Volar, bukan `tsc` polos. Install: `npm i github:cahyo-dimas/freeday-ui-kit#v1.2.0`.
- QA interaksi runtime (klik/keyboard di browser) = tanggung jawab konsumen; komponen
  terverifikasi type-check + build (`vue-tsc --noEmit` + `vite build`) + review kode.
- Follow-up diketahui (warisan datepicker, non-blocking): grid `role="grid"` datar tanpa `row`;
  hari fokus-awal yang ter-`min`/`max`-disable bisa bikin grid tak ter-fokus keyboard di config tepi.

## [1.1.0] — 2026-07-23
Rilis **1.1 — "Precision" visual polish + pengerasan adopsi**. Dua bagian: **(1) penyegaran
visual** token-driven — radius lebih tajam, elevation overlay lebih tegas, hierarki tipografi
heading lebih jelas, teal (`--color-accent`) sebagai indikator fungsional non-teks untuk state
aktif/terpilih; **(2) pengerasan adopsi** dari pemakaian project nyata — palet chart tervalidasi,
ukuran modal, nav statis, brand shell, export breakpoint, drawer `initAll`, dan tokenisasi kontrol.
**Non-breaking**: tak ada rename kelas/token/API (`fdy-` prefix, `--color-*`,
`window.Freeday*` tetap stabil). **AA-gated**: `npm test` tetap hijau (9/9), termasuk 6
assertion kontras baru yang menjaga teal-on-surface ≥3:1 di light & dark.
### Changed
- **Radius ramp lebih tajam** — skala dirapatkan ke `3/4/6/10/14/999px` (dari nilai lama yang
  lebih membulat), kesan lebih presisi di semua kontrol & container.
- **Motion lebih responsif** — durasi dasar `--dur-base` 200ms→180ms, `--dur-slow` 320ms→280ms.
- **Elevation overlay dijatah ulang** — bayangan `--shadow-3` (menu/dropdown/popover) dan
  `--shadow-4` (modal) kini lebih tajam & lebih hadir secara visual; bayangan resting
  (kartu, tombol) tidak berubah.
- **Hierarki heading "Precision"** — `h1`–`h4` kini memakai `--font-display` (Sora) / 700 /
  `--tracking-tighter` (token baru, -0.03em) / `--leading-snug`; ukuran font tidak berubah.
- **State interaksi disatukan** — hover/active/disabled/focus-visible dirapikan lintas
  input/combo/cascade/chip/pagination/selection; memperbaiki bug nyata di mana
  `.fdy-chip--filter` tidak punya focus ring sama sekali.
- **`.fdy-table-scroll` scroll tanpa syarat** — tak lagi hanya berlaku di dalam `.fdy-datatable`
  (`.fdy-table-wrap` untuk shell berbingkai, `.fdy-table-scroll` untuk scroll polos standalone).
- **`selection.css` di-tokenkan** — nilai mentah (`#fff` thumb switch, inset `rgba`, dimensi
  `1.15`/`2.4`/`1.35rem`) → token (`--color-switch-thumb`, `--color-shadow-inset`, `--control-box`,
  `--control-switch-w/-h`). Nol perubahan visual.
- **Default warna seri donut** — saat `data-fdy-colors` lebih pendek dari jumlah seri, celah kini
  diisi `--chart-N` fixed-order (bukan cycle palet semantik lama). Non-breaking.
### Added
- **Teal sebagai aksen fungsional** — `--color-accent` dipakai sebagai indikator non-teks
  untuk state aktif/terpilih: item nav aktif, underline tab aktif, baris tabel terpilih,
  opsi combo/cascade/autocomplete terpilih. Bukan dekorasi — murni penanda status.
- **Token baru** `--tracking-tighter` (-0.03em) untuk heading Sora.
- **6 assertion kontras WCAG (`AA_UI`, 3:1)** baru di `test/contrast.test.mjs` yang menjaga
  teal-on-surface di light & dark tetap lolos ambang kontrol non-teks.
- **Palet chart kategorikal** — token `--chart-1..8` (+ `--chart-grid`/`--chart-tick`), 8 warna
  colorblind-safe **tervalidasi** (validator dataviz, light & dark di surface Freeday: dark
  all-pass, light lolos + relief rule). Donut menggambar seri **fixed-order** (tanpa cycle).
  Token chart sengaja di luar `contrast.test.mjs` (a11y via validator palet + legend/label).
- **Modal size** — `.fdy-modal--sm/--md/--lg/--wide` (24/32/48/60rem, responsif, anti-overflow).
- **`.fdy-nav--flat`** — varian nav grup statis (tanpa caret / garis antar-grup / affordance
  collapse) + dukung markup non-`<details>` yang benar-benar tak bisa dilipat.
- **Brand shell berstruktur** — `.fdy-app__brand-mark`/`-title`/`-subtitle` (ikon + 2 baris di
  header shell); pemakaian teks satu-baris tetap jalan.
- **`FreedayDrawer.initAll`** — drawer kini ter-hydrate `useFreeday` di subtree Vue/React.
- **Export skala breakpoint** — `freeday/breakpoints` (`{ sm:600, md:960, lg:1280, xl:1920 }`)
  untuk `matchMedia` / menyelaraskan `@media` app ke skala kit.
- **Docs** — contoh **product-appbar** siap-copas (breadcrumb + input-group search + menu);
  install `git+https` untuk CI (repo privat tanpa SSH key); klarifikasi `.fdy-btn` = primary,
  `.fdy-table-wrap`, dan density `--control-h` untuk komponen custom.

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
