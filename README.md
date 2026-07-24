# Freeday

> **Lebih banyak _free day_ buat dev — UI kit-nya sudah siap pakai.**

[![Live docs](https://img.shields.io/badge/docs-live-2050d8?style=flat-square)](https://cahyo-dimas.github.io/freeday-ui-kit/)
[![Release](https://img.shields.io/badge/release-v1.6.1-0078d4?style=flat-square)](https://github.com/cahyo-dimas/freeday-ui-kit/tree/v1.6.1)

Token-driven, framework-agnostic UI KIT — satu sumber kebenaran untuk warna, tipografi,
spasi, dan komponen. Blueprint: `docs/superpowers/specs/2026-07-21-freeday-ui-kit-design.md`.
**Referensi hidup:** **[cahyo-dimas.github.io/freeday-ui-kit](https://cahyo-dimas.github.io/freeday-ui-kit/)** — atau buka `docs/index.html` langsung di browser.

> 🚀 **Baru mau pakai di project?** Langkah demi langkah per stack (HTML · Vue · React · Blazor): **[`docs/getting-started.md`](docs/getting-started.md)**.

## Build
```bash
node tokens/build.mjs   # tokens.json -> dist/freeday.tokens.css; bundel dist/freeday.css;
                        #   dist/freeday.bundle.css (token+komponen); salinan dist/*.js + dist/freeday.js
npm test                # test transformasi build + kontras WCAG (node:test)
```
`dist/` di-commit — konsumen tak wajib build sendiri.

## Pakai di project

**Sebagai paket (project dengan bundler — Vue/React/Blazor/Vite):**
```bash
npm i github:cahyo-dimas/freeday-ui-kit#v1.6.1
```
```js
import 'freeday/css';   // token + komponen (satu file)
import 'freeday';       // semua enhancer JS (auto-init [data-fdy-*])
// granular bila perlu: 'freeday/tokens' · 'freeday/css/components' · 'freeday/enhancers/<nama>'
```
Set tema di root app: `<html data-theme="light" data-density="comfortable">`. `dist/` di-commit → install
dari git jalan **tanpa build step**; minify diserahkan ke bundler konsumen.

**Install di CI (`git+https`, bukan `git+ssh`).** `npm i github:...#v1.6.1` menulis
`git+ssh://` ke lockfile konsumen — `npm ci` di CI gagal kalau runner tidak punya SSH key yang
di-otorisasi ke repo privat ini. Pakai `git+https` + read-only PAT, tidak butuh upgrade plan
GitHub atau GitHub Packages:
```json
// package.json konsumen
"dependencies": {
  "freeday": "git+https://github.com/cahyo-dimas/freeday-ui-kit.git#v1.6.1"
}
```
```yaml
# GitHub Actions — GITHUB_TOKEN sudah cukup kalau workflow punya akses ke repo ini
- run: git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
- run: npm ci
```
Di luar GitHub Actions (CI lain), ganti `GITHUB_TOKEN` dengan PAT read-only (scope `repo`)
lewat secret CI-nya, dengan `insteadOf` yang sama.

**Atau link file langsung (tanpa build):**

### 1. Sertakan CSS (wajib)
```html
<html lang="id" data-theme="light" data-density="comfortable">
<link rel="stylesheet" href="dist/freeday.tokens.css">  <!-- token: warna, spasi, dst -->
<link rel="stylesheet" href="dist/freeday.css">          <!-- komponen fdy-* -->
```
Kelas komponen berprefix `fdy-` (mis. `fdy-btn`, `fdy-card`, `fdy-badge`). Pakai langsung di
markup framework apa pun — Vue, React, Blazor, HTML polos.

> `.fdy-btn` **sudah** tombol primary — tidak ada modifier `.fdy-btn--primary` terpisah.
> Modifier yang tersedia untuk varian lain: `--ghost`, `--danger`, `--text`, `--sm`, `--lg`,
> `--icon` (lihat `docs/index.html`).

### 2. Sertakan JS enhancer (opsional, 0 dependency)
Komponen interaktif (dropdown, tabs, tabel, choose-from-list, datepicker, upload, toast)
butuh JS. Dua cara:
```html
<!-- a) satu bundel semua enhancer -->
<script src="dist/freeday.js" defer></script>

<!-- b) atau pilih per-file yang dipakai saja -->
<script src="dist/freeday-select.js"     defer></script>  <!-- [data-fdy-combo] -->
<script src="dist/freeday-tabs.js"       defer></script>  <!-- [data-fdy-tabs] -->
<script src="dist/freeday-table.js"      defer></script>  <!-- [data-fdy-table] -->
<script src="dist/freeday-cfl.js"        defer></script>  <!-- [data-fdy-cfl] + <dialog> -->
<script src="dist/freeday-datepicker.js" defer></script>  <!-- [data-fdy-datepicker] -->
<script src="dist/freeday-upload.js"     defer></script>  <!-- [data-fdy-dropzone] -->
<script src="dist/freeday-toast.js"      defer></script>  <!-- Freeday.toast({...}) -->
```
Semua auto-init `[data-fdy-*]` saat `DOMContentLoaded`, idempotent, dan progressive-enhancement.

| Enhancer | Hook markup | Event / API |
|---|---|---|
| `freeday-select` | `[data-fdy-combo]` | `fdy-change` `{value}` · `window.FreedayCombo` |
| `freeday-tabs` | `[data-fdy-tabs]` | `window.FreedayTabs` |
| `freeday-table` | `[data-fdy-table]` (+ `[data-fdy-filter]`, `[data-fdy-table-bulk]`) | `fdy-table-change` · `window.FreedayTable` |
| `freeday-cfl` | `[data-fdy-cfl]` → `<dialog>` | `fdy-cfl-select` `{row}`/`{rows}` · `window.FreedayCfl` |
| `freeday-datepicker` | `[data-fdy-datepicker]`, `[data-fdy-daterange]` | `fdy-datepicker-change` `{value,date}` · `window.FreedayDatepicker` |
| `freeday-timepicker` | `[data-fdy-timepicker]` | `fdy-time-select` `{value}` · `window.FreedayTimepicker` |
| `freeday-datetime` | `[data-fdy-datetimepicker]` | `fdy-datetime-change` `{date,time,value}` · `window.FreedayDatetime` |
| `freeday-cascade` | `[data-fdy-cascade]` (nested `<ul>` model) | `fdy-cascade-change` `{value,path,labels}` · `window.FreedayCascade` |
| `freeday-mask` | `[data-fdy-mask]`, `[data-fdy-password]` | `fdy-mask` `{value,raw}` · `window.FreedayMask` |
| `freeday-form` | `[data-fdy-validate]` (form) | `fdy-form-invalid`/`-valid` · `window.FreedayForm` |
| `freeday-chip` | `[data-fdy-chips]`, `.fdy-chip__remove` | `fdy-chip-change`/`fdy-chip-remove` · `window.FreedayChip` |
| `freeday-upload` | `[data-fdy-dropzone]` | `fdy-upload-add`/`-remove` · `window.FreedayUpload` |
| `freeday-toast` | — | `Freeday.toast({variant,title,message,timeout})` |

Tabel lebar (banyak kolom) butuh wrapper untuk scroll horizontal: bungkus `.fdy-table` dengan
`.fdy-table-wrap` (tabel biasa, sudah termasuk border+shadow shell) atau `.fdy-table-scroll`
(scroll polos tanpa shell — jalan standalone maupun di dalam `.fdy-datatable` yang shell
border/shadow-nya sudah ada sendiri). Tanpa salah satu
wrapper ini tabel lebar akan overflow container-nya, bukan scroll sendiri.

### 3. Theming — 3 sumbu lewat `data-*` di root
- `data-theme="light|dark"` — redefinisi token semantic (bind ke state tema app-mu).
- `data-density="comfortable|compact"` — tinggi kontrol (`--control-h`) untuk layar data-dense.
  Ini auto-apply hanya ke kontrol bawaan Freeday (button, input, combo, dst); komponen
  custom/hand-built harus baca `--control-h` sendiri (mis. `height:var(--control-h)`) supaya
  ikut menyusut/melebar saat `data-density` berubah.
- (roadmap) `data-style` — varian visual lain.
- Breakpoint scale (`sm`/`md`/`lg`/`xl` = 600/960/1280/1920px, sama dengan utilitas
  `src/components/breakpoints.css`) juga tersedia di JS: `import { breakpoints } from
  'freeday/breakpoints'` — dipakai untuk menyamakan `matchMedia`/`@media` app-mu ke skala Freeday.

## Integrasi framework (SPA)
> **Peta library lengkap:** [`docs/integrations.md`](docs/integrations.md) — tiap area
> (form/validasi, chart, tabel, tanggal, overlay, dst) dipetakan ke library ekosistem yang
> biasa dipasang (Zod/Yup, Chart.js, TanStack Table, date-fns, Floating UI, …) + cara
> menjembataninya + binding Vue/React/Blazor. Buka itu saat mulai project baru.

**Adapter siap pakai — Vue · React · Blazor.** Semua tipis: enhancer tetap sumber kebenaran,
adapter hanya hydrate + jembatani event. Tiap punya contoh layar **faktur** yang jalan:

```ts
// Vue 3 — freeday/vue
import { useFreeday } from 'freeday/vue';
const root = ref<HTMLElement | null>(null);
useFreeday(root);                     // @fdy-cascade-change="…" (detail bertipe)
```
```tsx
// React — freeday/react
import { useFreeday } from 'freeday/react';
const root = useRef<HTMLDivElement>(null);
useFreeday(root);                     // event fdy-* bubbling → listen di root
```
```csharp
// Blazor — freeday/blazor (window.FreedayBlazor via JS interop)
await JS.InvokeVoidAsync("FreedayBlazor.initAll", _root);
await JS.InvokeAsync<int>("FreedayBlazor.on", _root, "fdy-cascade-change", _self, nameof(OnCascade));
```

| Framework | Adapter | Contoh jalan |
|---|---|---|
| Vue 3 | `freeday/vue` | [`examples/vue-faktur/`](examples/vue-faktur/) (`npm install && npm run dev`) |
| React 19 | `freeday/react` | [`examples/react-faktur/`](examples/react-faktur/) (`npm install && npm run dev`) |
| Blazor WASM (.NET 10) | `freeday/blazor` | [`examples/blazor-faktur/`](examples/blazor-faktur/) (`dotnet run`) |

Peta library & pola lengkap: [`docs/integrations.md`](docs/integrations.md).

Secara umum, enhancer meng-auto-init sekali saat load. Untuk DOM yang dirender dinamis (Vue/React/Blazor):
- **Reuse enhancer:** setelah mount/route change, panggil `window.FreedayTable.initAll(el)`
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
  freeday.tokens.css   token semantic (light/dark/compact)
  freeday.css          bundel semua komponen
  freeday.js           bundel semua enhancer (satu <script>)
  freeday-*.js         enhancer per-file
docs/index.html        referensi hidup / demo-site
```

## Inventaris komponen
- **Fondasi:** warna semantic, tipografi (Sora/IBM Plex Sans/JetBrains Mono), skala spasi 4px,
  radius & elevasi, motion, checklist aksesibilitas.
- **Aksi & form:** button, input (+error), input-group (Rp/%/ikon), checkbox/radio/switch,
  **select `fdy-combo`** (APG), **autocomplete**, **cascade select** (hierarki drill-down),
  **choose-from-list** (field + dialog single/multi), **date / time / datetime picker**,
  **file upload** (dropzone + state per-berkas), **password reveal + input mask**,
  **form validation** (Constraint Validation API → error aksesibel).
- **Data:** table, **data table** (cari · sort · **filter per-kolom** teks/enum/angka · **bulk
  actions** · paginasi · seleksi), states (empty/loading/error).
- **Feedback:** alert, toast, tooltip. **Navigasi:** tabs, breadcrumb, pagination.
- **Tampilan:** card, badge, avatar, chip (default/hapus · choice · filter), description-list,
  progress, spinner, skeleton.
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

## Lisensi
[MIT](LICENSE) © 2026 Cahyo D. Kurnianto — bebas dipakai, diubah, dan didistribusikan asal
menyertakan baris copyright + teks lisensi.
