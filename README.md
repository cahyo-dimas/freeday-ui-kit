# Foundry

Token-driven, framework-agnostic UI KIT — satu sumber kebenaran untuk warna, tipografi,
spasi, dan komponen. Blueprint: `docs/superpowers/specs/2026-07-21-foundry-ui-kit-design.md`.
Referensi hidup: buka `docs/index.html` di browser.

## Build
```bash
node tokens/build.mjs   # tokens.json -> dist/foundry.tokens.css; bundel dist/foundry.css;
                        #   dist/foundry.bundle.css (token+komponen); salinan dist/*.js + dist/foundry.js
npm test                # test transformasi build + kontras WCAG (node:test)
```
`dist/` di-commit — konsumen tak wajib build sendiri.

## Pakai di project

**Sebagai paket (project dengan bundler — Vue/React/Blazor/Vite):**
```bash
npm i github:cahyo-dimas/foundry-ui-kit#v0.8.0
```
```js
import 'foundry/css';   // token + komponen (satu file)
import 'foundry';       // semua enhancer JS (auto-init [data-fdy-*])
// granular bila perlu: 'foundry/tokens' · 'foundry/css/components' · 'foundry/enhancers/<nama>'
```
Set tema di root app: `<html data-theme="light" data-density="comfortable">`. `dist/` di-commit → install
dari git jalan **tanpa build step**; minify diserahkan ke bundler konsumen.

**Atau link file langsung (tanpa build):**

### 1. Sertakan CSS (wajib)
```html
<html lang="id" data-theme="light" data-density="comfortable">
<link rel="stylesheet" href="dist/foundry.tokens.css">  <!-- token: warna, spasi, dst -->
<link rel="stylesheet" href="dist/foundry.css">          <!-- komponen fdy-* -->
```
Kelas komponen berprefix `fdy-` (mis. `fdy-btn`, `fdy-card`, `fdy-badge`). Pakai langsung di
markup framework apa pun — Vue, React, Blazor, HTML polos.

### 2. Sertakan JS enhancer (opsional, 0 dependency)
Komponen interaktif (dropdown, tabs, tabel, choose-from-list, datepicker, upload, toast)
butuh JS. Dua cara:
```html
<!-- a) satu bundel semua enhancer -->
<script src="dist/foundry.js" defer></script>

<!-- b) atau pilih per-file yang dipakai saja -->
<script src="dist/foundry-select.js"     defer></script>  <!-- [data-fdy-combo] -->
<script src="dist/foundry-tabs.js"       defer></script>  <!-- [data-fdy-tabs] -->
<script src="dist/foundry-table.js"      defer></script>  <!-- [data-fdy-table] -->
<script src="dist/foundry-cfl.js"        defer></script>  <!-- [data-fdy-cfl] + <dialog> -->
<script src="dist/foundry-datepicker.js" defer></script>  <!-- [data-fdy-datepicker] -->
<script src="dist/foundry-upload.js"     defer></script>  <!-- [data-fdy-dropzone] -->
<script src="dist/foundry-toast.js"      defer></script>  <!-- Foundry.toast({...}) -->
```
Semua auto-init `[data-fdy-*]` saat `DOMContentLoaded`, idempotent, dan progressive-enhancement.

| Enhancer | Hook markup | Event / API |
|---|---|---|
| `foundry-select` | `[data-fdy-combo]` | `fdy-change` `{value}` · `window.FoundryCombo` |
| `foundry-tabs` | `[data-fdy-tabs]` | `window.FoundryTabs` |
| `foundry-table` | `[data-fdy-table]` (+ `[data-fdy-filter]`, `[data-fdy-table-bulk]`) | `fdy-table-change` · `window.FoundryTable` |
| `foundry-cfl` | `[data-fdy-cfl]` → `<dialog>` | `fdy-cfl-select` `{row}`/`{rows}` · `window.FoundryCfl` |
| `foundry-datepicker` | `[data-fdy-datepicker]`, `[data-fdy-daterange]` | `fdy-datepicker-change` `{value,date}` · `window.FoundryDatepicker` |
| `foundry-timepicker` | `[data-fdy-timepicker]` | `fdy-time-select` `{value}` · `window.FoundryTimepicker` |
| `foundry-datetime` | `[data-fdy-datetimepicker]` | `fdy-datetime-change` `{date,time,value}` · `window.FoundryDatetime` |
| `foundry-upload` | `[data-fdy-dropzone]` | `fdy-upload-add`/`-remove` · `window.FoundryUpload` |
| `foundry-toast` | — | `Foundry.toast({variant,title,message,timeout})` |

### 3. Theming — 3 sumbu lewat `data-*` di root
- `data-theme="light|dark"` — redefinisi token semantic (bind ke state tema app-mu).
- `data-density="comfortable|compact"` — tinggi kontrol (`--control-h`) untuk layar data-dense.
- (roadmap) `data-style` — varian visual lain.

## Integrasi framework (SPA)
Enhancer meng-auto-init sekali saat load. Untuk DOM yang dirender dinamis (Vue/React/Blazor):
- **Reuse enhancer:** setelah mount/route change, panggil `window.FoundryTable.initAll(el)`
  (atau `initAll()` global). Aman diulang — tiap init dijaga flag idempotent. Jembatani ke
  state framework lewat event yang dipancarkan (mis. dengarkan `fdy-cfl-select`, `fdy-datepicker-change`).
- **Atau re-implement:** tulis komponen framework sendiri, pertahankan **markup + kontrak ARIA
  + kelas `fdy-*`** yang sama (lihat `docs/index.html`). Enhancer adalah implementasi rujukan,
  bukan keharusan. Untuk choose-from-list, jadikan komponen terkontrol (`fetchPage` callback +
  server-cache), jangan mirror ke store global.

## Aturan token — 3 lapis (jangan dilanggar)
```
Tier 1 PRIMITIVE  ramp mentah (--azure-600…) — TAK PERNAH dipakai di komponen
Tier 2 SEMANTIC   peran (--color-primary, --color-surface…) — berubah saat theme & re-brand
Tier 3 COMPONENT  --fdy-<komp>-<prop> — opsional, override lokal
```
Komponen hanya menyentuh Tier 2/3. Butuh nilai baru → compose → extend modifier → baru create.

## Struktur repo
```
tokens/tokens.json     sumber sejati (edit di sini)
tokens/build.mjs       generator (Node murni, 0 dependency)
src/base.css           reset + utilitas
src/components/*.css    satu file per komponen (fdy-*)
src/*.js               enhancer JS opsional (rujukan, vanilla)
dist/                  hasil build (DI-COMMIT):
  foundry.tokens.css   token semantic (light/dark/compact)
  foundry.css          bundel semua komponen
  foundry.js           bundel semua enhancer (satu <script>)
  foundry-*.js         enhancer per-file
docs/index.html        referensi hidup / demo-site
```

## Inventaris komponen (v0.4)
- **Fondasi:** warna semantic, tipografi (Sora/IBM Plex Sans/JetBrains Mono), skala spasi 4px,
  radius & elevasi, motion, checklist aksesibilitas.
- **Aksi & form:** button, input (+error), input-group (Rp/%/ikon), checkbox/radio/switch,
  **select `fdy-combo`** (APG), **choose-from-list** (field + dialog single/multi),
  **date picker** (single + range), **file upload** (dropzone + state per-berkas).
- **Data:** table, **data table** (cari · sort · **filter per-kolom** teks/enum/angka · **bulk
  actions** · paginasi · seleksi), states (empty/loading/error).
- **Feedback:** alert, toast, tooltip. **Navigasi:** tabs, breadcrumb, pagination.
- **Tampilan:** card, badge, avatar, chip, description-list, progress, spinner, skeleton.
- **Layout:** app shell, accordion (native `<details>`), modal (native `<dialog>`), divider, kbd.

## Aksesibilitas
Kontras WCAG AA (terang & gelap) — diaudit otomatis oleh `test/contrast.test.mjs` yang
menyelesaikan graf token, meng-*composite* fill `-soft` semi-transparan di atas surface-nya,
dan menegakkan tiap pasangan (teks 4.5:1; batas kontrol / ikon 3:1, WCAG 1.4.11). Border kontrol
form pakai `--color-control-border` (≥3:1); border dekoratif sengaja tetap terang.
`:focus-visible` selalu terlihat, HTML native dulu sebelum ARIA, komponen interaktif ikut pola
WAI-ARIA APG, hormati `prefers-reduced-motion`. Status tak hanya lewat warna. Lihat section
"Aksesibilitas" di `docs/index.html`.

## Dukungan browser
Butuh browser evergreen ~2023+: **Chrome 111 · Safari 16.4 · Firefox 113** (floor ditentukan
oleh `color-mix()`). Fitur lain: native `<dialog>`/`::backdrop`, `accent-color`, `100dvh`,
`conic-gradient`, `scroll-snap` — semua ≥ Safari 15.4. Blur backdrop pakai
`-webkit-backdrop-filter` + `backdrop-filter` (Safari lama tetap jalan, hanya tanpa blur).
Belum ada CSS build/autoprefixer — dukungan browser lama = tanggung jawab konsumen.
