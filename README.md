# Foundry

Token-driven UI KIT — design source-of-truth. Lihat blueprint di
`docs/superpowers/specs/2026-07-21-foundry-ui-kit-design.md`.

## Build
```bash
node tokens/build.mjs   # tokens.json -> dist/foundry.tokens.css + bundel dist/foundry.css
npm test                # test transformasi build (node:test)
```

## Pakai di project
```html
<link rel="stylesheet" href="dist/foundry.tokens.css">
<link rel="stylesheet" href="dist/foundry.css">
<html data-theme="light" data-density="comfortable">
```
Kelas komponen berprefix `fdy-` (mis. `fdy-btn`, `fdy-card`, `fdy-badge`).
- Komponen v0.2: app shell, table, modal (native `<dialog>`), **dropdown `fdy-combo`** (combobox berdesain penuh, WAI-ARIA APG), checkbox/radio/switch — plus refinement visual "rich".
- Komponen v0.3: alert, toast, tooltip, tabs, breadcrumb, pagination, avatar, spinner, progress, skeleton, **data table** (toolbar/cari/sort/paginasi/seleksi), states — plus docs jadi demo-site berbasis app-shell.

### Enhancer JS opsional (`dist/*.js`, 0 dependency)
Di-copy dari `src/*.js` saat build; sertakan yang dipakai, auto-init lewat `data-*`:
```html
<script src="dist/foundry-select.js" defer></script>  <!-- [data-fdy-combo] -->
<script src="dist/foundry-tabs.js"   defer></script>  <!-- [data-fdy-tabs]  -->
<script src="dist/foundry-table.js"  defer></script>  <!-- [data-fdy-table] -->
<script src="dist/foundry-toast.js"  defer></script>  <!-- Foundry.toast({variant,title,message}) -->
```
Semua opsional & progressive-enhancement; di app framework, kelola state lewat framework-mu.

### Dropdown `fdy-combo` (butuh JS opsional)
Dropdown yang popup-nya bisa didesain **wajib** JavaScript. Foundry menyediakan enhancer
vanilla tanpa-dependency `dist/foundry-select.js` (di-copy dari `src/foundry-select.js` saat build):
```html
<link rel="stylesheet" href="dist/foundry.css">
<script src="dist/foundry-select.js" defer></script>  <!-- auto-init semua [data-fdy-combo] -->
```
Di app Vue/React/Blazor, bind sendiri lewat state framework-mu (skrip ini implementasi rujukan,
bukan keharusan). Markup mengikuti pola APG `role="combobox"`/`listbox`/`option`; enhancer
memancarkan event `fdy-change` (`detail.value`) saat pilihan berubah.

## Struktur
- `tokens/tokens.json` — sumber sejati (edit di sini)
- `tokens/build.mjs` — generator
- `src/` — base + komponen (`fdy-*`) + enhancer JS opsional (`foundry-select.js`)
- `dist/` — hasil build (di-commit): `*.css` + `*.js` (JS di-copy apa adanya dari `src/`)
- `docs/index.html` — referensi hidup
